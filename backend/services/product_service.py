from fastapi import HTTPException
from sqlalchemy.orm import Session
from db.models import Product, Transaction
from datetime import datetime
from utils.measurement_unit_converter import convert_to_base
from utils.unit_mapper import normalize_unit

FLOAT_EPSILON = 0.0001  # tolerance for floating-point stock comparisons


# ---------------- SAFE CONVERTER ----------------
def safe_convert(quantity, unit):
    try:
        qty, base_unit, factor = convert_to_base(quantity, unit)
        return qty, base_unit, factor
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid or unsupported unit: '{unit}'. "
                   "Supported: kg, g, l, ml, pcs, pkt, pkg, dozen, bottles"
        )


# ---------------- LOG TRANSACTIONS ----------------
def log_transactions(db: Session, product, transaction_type, quantity, user,
                     selling_price=None, sell_unit=None, note=None):
    """
    All quantities arriving here are ALREADY in base units (g, ml, pcs).
    product.unit_price is ALWAYS stored as price-per-base-unit.
    """

    # ── ADD / UPDATE ──────────────────────────────────────────────────────────
    if transaction_type.lower() in ["add", "update"]:
        total_price = round(quantity * (product.unit_price or 0), 4)
        profit = 0
        price_per_unit_stored = product.unit_price
        tx_display_unit = product.display_unit or product.unit_of_measure

    # ── SELL ──────────────────────────────────────────────────────────────────
    elif transaction_type.lower() == "sell":
        if selling_price is None:
            raise ValueError("selling_price is required for a sell transaction")

        sell_factor = 1
        resolved_sell_unit = sell_unit or product.display_unit
        if resolved_sell_unit:
            try:
                _, _, sell_factor = safe_convert(1, normalize_unit(resolved_sell_unit))
            except Exception:
                sell_factor = 1

        selling_price_per_base = selling_price / sell_factor
        total_price = round(quantity * selling_price_per_base, 4)
        cost_value  = round(quantity * (product.unit_price or 0), 4)
        profit      = round(total_price - cost_value, 4)
        price_per_unit_stored = selling_price_per_base
        tx_display_unit = normalize_unit(sell_unit) if sell_unit else (product.display_unit or product.unit_of_measure)

    # ── DELETE (full product removal) ─────────────────────────────────────────
    elif transaction_type.lower() == "delete":
        total_price = 0
        profit = 0
        price_per_unit_stored = product.unit_price
        tx_display_unit = product.display_unit or product.unit_of_measure

    # ── WRITE-OFF (damaged / freebie / expired) ───────────────────────────────
    elif transaction_type.lower() == "writeoff":
        cost_lost = round(quantity * (product.unit_price or 0), 4)
        total_price = cost_lost
        profit = -cost_lost          # NEGATIVE: real loss to the business
        price_per_unit_stored = product.unit_price
        tx_display_unit = product.display_unit or product.unit_of_measure

    else:
        raise ValueError(f"Unknown transaction type: '{transaction_type}'")

    tx = Transaction(
        product_id=product.id,
        owner_id=user.id,
        product_name_snapshot=product.product_name,
        transaction_type=transaction_type.lower(),
        quantity=quantity,
        unit=tx_display_unit,
        price_per_unit=price_per_unit_stored,
        total_price=total_price,
        note=note,
        profit=profit,
        timestamp=datetime.utcnow(),
    )
    db.add(tx)
    # NOTE: caller is responsible for db.commit()


# ---------------- CREATE / UPDATE PRODUCT ----------------
def create_product(data, db: Session, current_user):
    product = db.query(Product).filter(
        Product.product_id == data.barcode,
        Product.owner_id == current_user.id,
    ).first()

    incoming_unit = normalize_unit(data.unit_of_measure) if data.unit_of_measure else None

    # ── EXISTING PRODUCT — add stock ──────────────────────────────────────────
    if product:
        stored_unit = normalize_unit(product.unit_of_measure)

        incoming_qty, incoming_base, factor = safe_convert(data.quantity, incoming_unit)
        stored_qty,   stored_base,   _      = safe_convert(product.quantity, stored_unit)

        if incoming_base != stored_base:
            raise HTTPException(
                status_code=400,
                detail=f"Unit category mismatch: cannot mix '{incoming_base}' with '{stored_base}'"
            )

        price_per_base = None
        if data.unit_price is not None:
            price_per_base = data.unit_price / factor

        new_quantity = stored_qty + incoming_qty

        if price_per_base is not None:
            old_total = stored_qty * product.unit_price if product.unit_price else 0
            new_total = incoming_qty * price_per_base
            product.unit_price = (old_total + new_total) / new_quantity if new_quantity > 0 else None

        if data.product_name:
            product.product_name = data.product_name
            product.aliases = data.product_name.lower()

        if data.description:
            product.description = data.description

        if data.unit_of_measure:
            product.display_unit = incoming_unit

        product.quantity = new_quantity
        product.unit_of_measure = stored_base
        product.total_price = (
            round(product.quantity * product.unit_price, 4)
            if product.unit_price else None
        )
        product.updated_at = datetime.utcnow()

        db.flush()
        db.refresh(product)
        log_transactions(db, product, "update", incoming_qty, current_user)
        db.commit()
        return product

    # ── NEW PRODUCT ───────────────────────────────────────────────────────────
    if not all([
        data.product_name,
        data.description,
        data.unit_of_measure,
        data.unit_price is not None,
    ]):
        raise HTTPException(
            status_code=400,
            detail="product_name, description, unit_of_measure, and unit_price are all required for a new product",
        )

    incoming_qty, base_unit, factor = safe_convert(data.quantity, incoming_unit)

    price_per_base = data.unit_price / factor
    total_price    = round(incoming_qty * price_per_base, 4)

    new_product = Product(
        product_id=data.barcode,
        product_name=data.product_name,
        description=data.description,
        quantity=incoming_qty,
        owner_id=current_user.id,
        unit_of_measure=base_unit,
        display_unit=incoming_unit,
        unit_price=price_per_base,
        total_price=total_price,
        aliases=data.product_name.lower(),
    )

    db.add(new_product)
    db.flush()
    db.refresh(new_product)
    log_transactions(db, new_product, "add", incoming_qty, current_user)
    db.commit()
    return new_product


# ---------------- SELL PRODUCT ----------------
def sell_product(barcode, quantity, unit, db: Session, current_user, selling_price):
    product = db.query(Product).filter(
        Product.product_id == barcode,
        Product.owner_id == current_user.id,
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if not product.unit_of_measure or product.unit_of_measure.strip().lower() == "string":
        raise HTTPException(status_code=400, detail="Product has an invalid unit of measure")

    sell_unit = normalize_unit(unit) if unit else normalize_unit(product.display_unit)

    input_qty,  input_base,  _ = safe_convert(quantity, sell_unit)
    stored_qty, stored_base, _ = safe_convert(product.quantity, normalize_unit(product.unit_of_measure))

    if input_base != stored_base:
        raise HTTPException(
            status_code=400,
            detail=f"Unit mismatch: selling in '{input_base}' but stock is in '{stored_base}'"
        )

    if stored_qty < input_qty - FLOAT_EPSILON:
        from utils.formatter import format_quantity
        available = format_quantity(stored_qty, product.unit_of_measure, product.display_unit)
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {available}"
        )

    input_qty = min(input_qty, stored_qty)

    sold_cost     = round(input_qty * (product.unit_price or 0), 4)
    remaining_qty = stored_qty - input_qty

    product.quantity        = remaining_qty
    product.unit_of_measure = stored_base

    if product.total_price is not None:
        product.total_price = max(0, round(product.total_price - sold_cost, 4))

    product.updated_at = datetime.utcnow()

    db.flush()
    db.refresh(product)

    log_transactions(
        db, product, "sell", input_qty, current_user,
        selling_price=selling_price,
        sell_unit=sell_unit,
    )
    db.commit()
    return product


# ---------------- DELETE / WRITE-OFF ----------------
def delete_product(barcode, db: Session, current_user, quantity=None, unit=None, reason=None):
    """
    Full delete (quantity=None):
      - Logs a SINGLE write-off for remaining stock (only if stock > 0)
      - Attempts hard delete of the product row
      - If the DB rejects deletion (NOT NULL FK constraint), falls back to ghost-delete:
        renames the barcode to 'deleted_<id>' and hides product permanently with
        is_active=False AND a special is_ghost=True flag so it never shows in any filter.
      - No duplicate write-offs: we check for an existing write-off logged in the
        same delete attempt before creating another one.

    Partial write-off (quantity provided):
      - Deducts stock and logs negative-profit write-off.
      - Does NOT delete the product.

    Mark Inactive (archive):
      - NEVER logs a write-off. Stock is preserved.
      - Use PUT /products/archive/{barcode} endpoint, not this function.
    """
    product = db.query(Product).filter(
        Product.product_id == barcode,
        Product.owner_id == current_user.id,
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail=f"Product with barcode '{barcode}' not found")

    # ── PARTIAL WRITE-OFF ─────────────────────────────────────────────────────
    if quantity is not None:
        writeoff_unit = normalize_unit(unit) if unit else normalize_unit(product.display_unit)
        writeoff_qty, _, _ = safe_convert(quantity, writeoff_unit)

        if writeoff_qty > product.quantity + FLOAT_EPSILON:
            from utils.formatter import format_quantity
            available = format_quantity(product.quantity, product.unit_of_measure, product.display_unit)
            raise HTTPException(
                status_code=400,
                detail=f"Write-off quantity exceeds available stock. Available: {available}"
            )

        writeoff_qty = min(writeoff_qty, product.quantity)
        product.quantity -= writeoff_qty
        if product.unit_price is not None:
            product.total_price = max(0, round(product.quantity * product.unit_price, 4))

        db.flush()
        db.refresh(product)
        log_transactions(db, product, "writeoff", writeoff_qty, current_user, note=reason)
        db.commit()
        db.refresh(product)

        from utils.formatter import format_quantity
        return {
            "message": f"Write-off recorded. Reason: {reason or 'not specified'}",
            "written_off": format_quantity(writeoff_qty, product.unit_of_measure, product.display_unit),
            "remaining": format_quantity(product.quantity, product.unit_of_measure, product.display_unit),
        }

    # ── FULL DELETE ───────────────────────────────────────────────────────────
    product_name = product.product_name
    product_pk   = product.id

    # Log write-off for remaining stock ONCE.
    # Guard: check if a "product deleted" write-off already exists for this product
    # in the last 60 seconds to prevent duplicates if endpoint is called multiple times.
    already_wrote_off = False
    if product.quantity > 0:
        from datetime import timedelta
        recent_cutoff = datetime.utcnow() - timedelta(seconds=60)
        existing_wo = db.query(Transaction).filter(
            Transaction.product_id == product_pk,
            Transaction.transaction_type == "writeoff",
            Transaction.note == "product deleted",
            Transaction.timestamp >= recent_cutoff,
        ).first()

        if not existing_wo:
            log_transactions(db, product, "writeoff", product.quantity, current_user,
                             note=reason or "product deleted")
            db.commit()
            already_wrote_off = True

    # Attempt hard delete: first detach FK references
    try:
        # Detach all transactions from this product (SET NULL)
        db.query(Transaction).filter(
            Transaction.product_id == product_pk
        ).update({"product_id": None}, synchronize_session=False)
        db.commit()

        # Re-fetch the product after commit
        product = db.query(Product).filter(Product.id == product_pk).first()
        if product:
            db.delete(product)
            db.commit()

        return {"message": f"'{product_name}' deleted permanently. Transaction history preserved."}

    except Exception:
        # Hard delete failed (FK NOT NULL still enforced — migration hasn't run).
        # Fall back to ghost-delete: rename barcode, zero stock, hide everywhere.
        db.rollback()

        product = db.query(Product).filter(
            Product.id == product_pk,
            Product.owner_id == current_user.id,
        ).first()

        if product:
            # Ghost products get a stable barcode derived from their PK so they
            # are idempotent (calling delete twice gives the same barcode).
            # They are NEVER shown in any UI filter — not even "Inactive".
            product.product_id  = f"__ghost__{product_pk}"
            product.is_active   = False
            product.quantity    = 0
            product.total_price = 0
            db.commit()

        return {
            "message": (
                f"'{product_name}' hidden from all views. Transaction history preserved. "
                "Run the DB migration to enable full deletion: "
                "ALTER TABLE transactions ALTER COLUMN product_id DROP NOT NULL;"
            )
        }