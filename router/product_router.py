import re
import traceback
from difflib import get_close_matches
from typing import Optional

from fastapi import APIRouter, UploadFile, Depends, File, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from db.database import get_db
from db.models import Product
from services.product_service import create_product, sell_product, delete_product, safe_convert
from barcode.scanner import scan_barcode_image
from utils.response import success_response
from utils.formatter import format_quantity, format_unit_price
from utils.unit_mapper import normalize_unit
from schemas.product import ProductCreate, ProductSell, ProductUpdate, ProductWriteOff
from utils.auth import get_current_user

router = APIRouter(prefix="/products", tags=["Products"])


# ---------------- HELPERS ----------------

def product_response(p: Product):
    return {
        "product_id": p.product_id,
        "product_name": p.product_name,
        "description": p.description,
        "quantity": format_quantity(p.quantity, p.unit_of_measure, p.display_unit),
        # format_unit_price converts stored base-unit price to display-unit price
        # e.g. ₹0.055/g → ₹55/kg
        "unit_price": format_unit_price(p.unit_price, p.unit_of_measure, p.display_unit),
        "unit": p.display_unit,
        "total_price": round(p.total_price, 2) if p.total_price else 0,
        # CRITICAL: always return is_active so frontend can distinguish
        # active vs inactive products. Without this, p.is_active is undefined
        # on the frontend and every product appears active even when archived.
        "is_active": p.is_active if p.is_active is not None else True,
    }


def find_product_by_name(name: str, user_id: int, db: Session):
    """
    Step 1: DB LIKE/contains search.
    Step 2: fuzzy fallback using difflib (catches typos like 'suagr' → 'sugar').
    Returns (list[Product], fuzzy_note | None).
    """
    products = db.query(Product).filter(
        Product.owner_id == user_id,
        or_(
            func.lower(Product.product_name).contains(name),
            func.lower(Product.aliases).contains(name),
        ),
    ).all()

    if products:
        return products, None

    all_products = db.query(Product).filter(Product.owner_id == user_id).all()
    all_names = [p.product_name.lower() for p in all_products]
    close = get_close_matches(name, all_names, n=1, cutoff=0.5)

    if close:
        matched = next(p for p in all_products if p.product_name.lower() == close[0])
        note = (
            f"'{name}' not found exactly — closest match: '{matched.product_name}'. "
            f"Fix the name via PUT /products/update/{matched.product_id}."
        )
        return [matched], note

    return [], None


# ---------------- SCAN ----------------

@router.post(
    "/scan",
    summary="Scan Product Barcode",
    description="""
## 📷 Scan a Product via Barcode Image

Upload an image containing a barcode to look up a product in your inventory.

---

### How it works:
1. Upload a clear image of the barcode (JPG, PNG, etc.)
2. Barcode found in inventory → returns full product details
3. Barcode not registered → returns just the barcode value for use with `POST /products/add`

---

### Response — Product Found:
```json
{
  "product_id": "8901234567890",
  "product_name": "Sugar",
  "quantity": "50.00 kg",
  "unit_price": 55,
  "unit": "kg",
  "total_price": 2750
}
```

### Response — New Barcode:
```json
{ "barcode": "8901234567890" }
```

---

### Common Errors:
| Code | Reason |
|------|--------|
| 400  | No barcode detected — check image quality / lighting |
""",
)
async def scan_product(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    barcode = await scan_barcode_image(file)

    if not barcode:
        raise HTTPException(
            400,
            "No barcode detected. Ensure the barcode is clearly visible, well-lit, and not blurry.",
        )

    product = db.query(Product).filter(
        Product.product_id == barcode,
        Product.owner_id == user.id,
    ).first()

    if product:
        return success_response("Product found", product_response(product))

    return success_response("New product", {"barcode": barcode})


# ---------------- SEARCH ----------------

@router.get(
    "/search",
    summary="Search Products by Name",
    description="""
## 🔍 Search Products by Name, Description, or Alias

Case-insensitive partial search. Type a product name (or partial name) to find matching items.

---

### Query Parameter:
| Param | Type   | Required | Description                          |
|-------|--------|----------|--------------------------------------|
| `q`   | string | ✅ Yes   | Product name or partial name to find |

---

### Examples:
- `?q=sugar` → matches "Sugar", "Sugar Premium", "Brown Sugar"
- `?q=det` → matches "Detergent", "Detergent Bar"
- `?q=cheeni` → matches "Sugar" if alias "cheeni" is set

---

### Response:
```json
[
  {
    "product_id": "8901234567890",
    "product_name": "Sugar",
    "quantity": "50.00 kg",
    "unit_price": 55,
    "unit": "kg",
    "total_price": 2750
  }
]
```

> Returns `[]` if nothing matches — not an error.
""",
)
def search_products(
    q: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not q or not q.strip():
        raise HTTPException(400, "q cannot be empty.")

    product_name = q  # alias for internal use

    products = db.query(Product).filter(
        Product.owner_id == user.id,
        or_(
            Product.product_name.ilike(f"%{product_name}%"),
            Product.description.ilike(f"%{product_name}%"),
            Product.aliases.ilike(f"%{product_name}%"),
        ),
    ).all()

    return [product_response(p) for p in products]


# ---------------- ADD ----------------

@router.post(
    "/add",
    summary="Add New Product",
    description="""
## ➕ Register a New Product in Inventory

Creates a new product entry. Each product is uniquely identified by its **barcode**.

---

### ⚠️ How prices and quantities are stored:
Everything is normalised to BASE units internally:
- `50 kg` → stored as `50,000 g`
- `unit_price: 55` (₹55/kg) → stored as `₹0.055/g`
- `total_price` = 50,000 × 0.055 = `₹2,750` ✓

The API response converts everything BACK to display units automatically,
so you always see `50.00 kg` and `₹55/kg` — never grams or per-gram prices.

---

### Request Body:
```json
{
  "barcode": "8901234567890",
  "product_name": "Sugar",
  "description": "Refined white sugar",
  "quantity": 50,
  "unit_of_measure": "kg",
  "unit_price": 55
}
```
> `unit_price` = ₹55 **per kg** (your purchase/cost price), not the total.

---

### Response:
```json
{
  "product_id": "8901234567890",
  "product_name": "Sugar",
  "quantity": "50.00 kg",
  "unit_price": 55,
  "unit": "kg",
  "total_price": 2750
}
```

---

### Common Errors:
| Code | Reason |
|------|--------|
| 400  | Product with this barcode already exists — use `PUT /products/update/{barcode}` to add stock |
| 422  | Missing required fields |
""",
)
def add_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        existing = db.query(Product).filter(
            Product.product_id == data.barcode,
            Product.owner_id == current_user.id,
        ).first()

        if existing:
            raise HTTPException(
                400,
                f"Product with barcode '{data.barcode}' already exists. "
                f"To add more stock use PUT /products/update/{data.barcode}",
            )

        product = create_product(data, db, current_user)
        return success_response("Product added", product_response(product))

    except HTTPException as e:
        raise e
    except Exception as e:
        print("Error adding product:", str(e))
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Server Error: {str(e)}",
        )


# ---------------- UPDATE ----------------

@router.put(
    "/update/{barcode}",
    summary="Update Product / Add Stock",
    description="""
## 📦 Update an Existing Product or Add More Stock

Use this to:
- Add more stock (quantity is **added** to existing, properly converted to base units)
- Update the cost price (triggers weighted-average recalculation)
- Fix product name or description

---

### Path Parameter:
| Param | Description |
|-------|-------------|
| `barcode` | The product's barcode / product ID |

---

### Request Body (all fields optional):
```json
{
  "product_name": "Sugar Premium",
  "description": "Extra fine refined sugar",
  "quantity": 20,
  "unit_of_measure": "kg",
  "unit_price": 58
}
```

> ⚠️ **Quantity is additive and unit-aware:**
> If stock is 50 kg and you send `quantity: 20, unit_of_measure: kg`, stock becomes **70 kg**.
> The conversion to base units (grams) is handled automatically.

> ⚠️ **unit_price** is cost price **per display unit** (e.g. ₹58/kg).
> Changing it recalculates the weighted-average cost price and `total_price`.

---

### Common Errors:
| Code | Reason |
|------|--------|
| 404  | Product not found |
| 400  | unit_price ≤ 0 |
| 400  | Unit category mismatch (e.g. mixing kg with pcs) |
""",
)
def update_product(
    barcode: str,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    product = db.query(Product).filter(
        Product.product_id == barcode,
        Product.owner_id == current_user.id,
    ).first()

    if not product:
        raise HTTPException(
            404,
            f"No product found with barcode '{barcode}'. "
            "Use POST /products/add to register a new product.",
        )

    if data.product_name and data.product_name.strip().lower() != "string":
        product.product_name = data.product_name
        product.aliases = data.product_name.lower()

    if data.description and data.description.strip().lower() != "string":
        product.description = data.description

    # ── QUANTITY: convert to base units before adding ──────────────────────────
    # BUG FIX: previously did `product.quantity += data.quantity` which added
    # raw kg/dozens directly to gram/pcs stored values — now we convert first.
    if data.quantity is not None:
        update_unit = data.unit_of_measure or product.display_unit
        try:
            norm_unit = normalize_unit(update_unit)
            incoming_base_qty, incoming_base, incoming_factor = safe_convert(data.quantity, norm_unit)
            stored_norm = normalize_unit(product.unit_of_measure)
            _, stored_base, _ = safe_convert(product.quantity, stored_norm)

            if incoming_base != stored_base:
                raise HTTPException(
                    400,
                    f"Unit category mismatch: cannot add '{incoming_base}' to '{stored_base}' stock."
                )

            # Update price FIRST (weighted average) before changing quantity
            if data.unit_price is not None:
                if data.unit_price <= 0:
                    raise HTTPException(400, "unit_price must be greater than 0.")
                new_price_per_base = data.unit_price / incoming_factor
                old_total = product.quantity * (product.unit_price or 0)
                new_total = incoming_base_qty * new_price_per_base
                new_qty   = product.quantity + incoming_base_qty
                product.unit_price = (old_total + new_total) / new_qty if new_qty > 0 else product.unit_price

            product.quantity += incoming_base_qty
            product.display_unit = norm_unit  # update display unit to match latest add

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(400, f"Could not process quantity update: {str(e)}")

    # Price-only update (no quantity change)
    elif data.unit_price is not None:
        if data.unit_price <= 0:
            raise HTTPException(400, "unit_price must be greater than 0.")
        try:
            update_unit = data.unit_of_measure or product.display_unit
            _, _, factor = safe_convert(1, normalize_unit(update_unit))
            product.unit_price = data.unit_price / factor
        except Exception:
            raise HTTPException(400, f"Could not convert unit_price for unit '{update_unit}'.")

    if data.unit_of_measure:
        if data.unit_of_measure.strip().lower() == "string":
            raise HTTPException(400, "Invalid unit_of_measure — provide a real value e.g. kg, g, l, pcs.")
        product.display_unit = normalize_unit(data.unit_of_measure)

    if product.unit_price is not None:
        product.total_price = round(product.quantity * product.unit_price, 4)

    db.commit()
    db.refresh(product)
    return success_response("Product updated", product_response(product))


# ---------------- SELL ----------------

@router.put(
    "/sell/{barcode}",
    summary="Sell Product by Barcode",
    description="""
## 💰 Record a Sale for a Product

Deducts sold quantity from stock and records revenue, cost, and profit.

---

### Request Body:
```json
{
  "quantity": 2,
  "unit_of_measure": "kg",
  "selling_price": 57
}
```

> ⚠️ `selling_price` is the price **per display unit** (per kg, per pcs, etc.), NOT the total.
> Selling 2 kg at `selling_price: 57` → total revenue = **₹114**, profit = revenue − cost.

---

### Response:
```json
{
  "remaining_qty": "48.00 kg",
  "total_price": 2640
}
```

---

### Common Errors:
| Code | Reason |
|------|--------|
| 404  | Product not found |
| 400  | Insufficient stock |
| 400  | Unit category mismatch |
""",
)
def sell(
    barcode: str,
    data: ProductSell,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # Block selling archived/inactive products
    _chk = db.query(Product).filter(
        Product.product_id == barcode,
        Product.owner_id == user.id,
    ).first()
    if _chk and _chk.is_active is False:
        raise HTTPException(
            400,
            f"'{_chk.product_name}' is archived (inactive). "
            "Reactivate it from the Inventory page before selling."
        )
    product = sell_product(
        barcode, data.quantity, data.unit_of_measure, db, user, data.selling_price
    )
    return success_response("Product sold", {
        "remaining_qty": format_quantity(product.quantity, product.unit_of_measure, product.display_unit),
        "total_price": round(product.total_price, 2) if product.total_price else 0,
    })


# ---------------- SELL VIA SCAN ----------------

@router.put(
    "/sell_scan",
    summary="Sell Product via Barcode Scan",
    description="""
## 📷💰 Sell a Product by Scanning its Barcode

Upload a barcode image to identify and sell a product in one step.

---

### Form Parameters:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | image | ✅ | Barcode image |
| `quantity` | float | ✅ | Units to sell (default: 1) |
| `unit` | string | ❌ | Unit (defaults to product's display unit) |
| `selling_price` | float | ✅ | **Price per display unit** (not total) |

> ⚠️ `selling_price` is per unit, not total. 2 kg at `selling_price=57` → revenue = **₹114**.
""",
)
async def sell_scanned_product(
    file: UploadFile = File(...),
    quantity: float = 1,
    unit: str = None,
    selling_price: float = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    barcode = await scan_barcode_image(file)

    if not barcode:
        raise HTTPException(400, "No barcode detected. Ensure the barcode is well-lit and in focus.")

    product = db.query(Product).filter(
        Product.product_id == barcode,
        Product.owner_id == user.id,
    ).first()

    if not product:
        raise HTTPException(
            404,
            f"Barcode '{barcode}' not found in your inventory. "
            "Use POST /products/add to register it first.",
        )

    if selling_price is None:
        raise HTTPException(
            400,
            "selling_price is required. "
            "This is the price per unit (e.g. ₹57/kg), not the total.",
        )

    unit = unit or product.display_unit
    updated = sell_product(barcode, quantity, unit, db, user, selling_price)

    return success_response("Product sold", {
        "remaining_qty": format_quantity(updated.quantity, updated.unit_of_measure, updated.display_unit),
        "total_price": round(updated.total_price, 2) if updated.total_price else 0,
    })


# ---------------- VOICE COMMAND ----------------
# ── WORD-TO-NUMBER HELPER ─────────────────────────────────────────────────────
# Handles spoken quantities like "two dozen", "half", "three", "twenty five", etc.

WORD_NUMBERS = {
    # ones
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
    # teens
    "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
    "eighteen": 18, "nineteen": 19,
    # tens
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
    # common large
    "hundred": 100, "thousand": 1000,
    # fractions (voice-friendly)
    "half": 0.5, "quarter": 0.25,
    # common compound forms with hyphens (speech-to-text sometimes adds them)
    "twenty-one": 21, "twenty-two": 22, "twenty-three": 23, "twenty-four": 24,
    "twenty-five": 25, "twenty-six": 26, "twenty-seven": 27, "twenty-eight": 28,
    "twenty-nine": 29,
}

def parse_word_number(token: str) -> float | None:
    """
    Convert a single word token to a float if it is a known number word.
    Returns None if the token is not recognised as a number word.

    Examples:
        "two"    → 2.0
        "twelve" → 12.0
        "half"   → 0.5
        "3"      → None  (already numeric — handled by float() directly)
        "sugar"  → None
    """
    return float(WORD_NUMBERS[token.lower().strip()]) if token.lower().strip() in WORD_NUMBERS else None


def parse_quantity(token: str) -> float:
    """
    Parse a quantity token that may be:
        - a plain number:   "2", "0.5", "2.5"
        - a word number:    "two", "half", "twenty"
        - a compound word:  "twenty-five"  (already in WORD_NUMBERS)

    Raises ValueError with a helpful message if the token is unrecognisable.
    """
    # Try plain numeric first
    try:
        return float(token)
    except ValueError:
        pass

    # Try word number
    val = parse_word_number(token)
    if val is not None:
        return val

    raise ValueError(
        f"Cannot understand quantity '{token}'. "
        "Use a number (e.g. 2, 0.5) or a word (e.g. two, half, twenty)."
    )


# ── UPDATED voice_command ENDPOINT ───────────────────────────────────────────
# Replace your existing voice_command function body with the one below.
# The ONLY changes vs your original are the three `parse_quantity()` calls
# that replace the bare `float()` calls for qty parsing.
# Everything else is identical to your original.

@router.post(
    "/voice_command",
    summary="Voice Command",
    description="""
## 🎙️ Voice Command Guide

---

### 🛒 SELL
**Format:** `sell <qty> <unit> <name> [for/at/@] <unit_price> [rupees/rs/₹]`

> ⚠️ Price is **per unit** (per kg, per pcs etc.), NOT the total.
> `sell 2 kg sugar for 57` → ₹57/kg × 2 kg = **₹114 revenue**

- `sell 2 kg sugar 57`
- `sell two kg sugar for 57 rupees`
- `sell 5 pcs soap @ 30`
- `sell two dozen egg for 120`

---

### ➕ ADD / UPDATE STOCK
**Format:** `add <qty> <unit> <name>`

- `add 10 kg sugar` → adds 10 kg to sugar's stock
- `add two dozen eggs`
- `update 5 l oil`

---

### 🗑️ DELETE
**Full delete:** `delete <name>` — removes product entirely

**Write-off:** `delete <qty> <unit> <name>` — removes that quantity only (damaged/freebie)

- `delete sugar`
- `delete 5 kg sugar` → writes off 5 kg (product stays, stock reduced)
- `delete two dozen eggs`

---

### 💡 Fuzzy Matching
Typos in stored names (e.g. `suagr`) are auto-matched. A `note` in the response
tells you which name was matched so you can fix it via `PUT /products/update/{barcode}`.

---

### 📦 Supported Units
`kg`, `g`, `l`, `ml`, `pcs`, `pkt`, `pkg`, `dozen`, `bottles`

### 🔢 Supported Word Numbers
`one`, `two`, `three` … `twenty`, `thirty` … `hundred`, `half`, `quarter`
""",
)
def voice_command(
    command: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    parts = command.lower().strip().split()

    if not parts:
        raise HTTPException(400, "Empty command. See endpoint description for usage.")

    action = parts[0]

    # ── DELETE / WRITE-OFF ────────────────────────────────────────────────────
    if action in ["delete", "remove", "write-off", "writeoff", "damaged"]:
        remaining = parts[1:]
        qty = None
        unit = None

        if len(remaining) >= 3:
            try:
                # FIX: use parse_quantity() instead of float() so word numbers work
                qty = parse_quantity(remaining[0])
                unit = normalize_unit(remaining[1])
                name = " ".join(remaining[2:]).strip()
            except Exception:
                qty = None
                unit = None
                name = " ".join(remaining).strip()
        else:
            name = " ".join(remaining).strip()

        if not name:
            raise HTTPException(400, "Specify a product name. E.g. 'delete sugar' or 'delete 5 kg sugar'")

        products, fuzzy_note = find_product_by_name(name, user.id, db)

        if not products:
            raise HTTPException(404, f"Product '{name}' not found. Run GET /products/ to list all products.")

        if len(products) > 1:
            matches = ", ".join(
                f"'{p.product_name}' (barcode: {p.product_id})" for p in products
            )
            raise HTTPException(
                400,
                f"Multiple products matched: {matches}. "
                f"Use DELETE /products/{{barcode}} with a specific barcode to target one. "
                f"E.g. DELETE /products/{products[0].product_id}"
            )

        product = products[0]
        result = delete_product(
            product.product_id, db, user,
            quantity=qty, unit=unit, reason="Voice command write-off" if qty else None,
        )

        response_data = {k: v for k, v in result.items() if k != "message"} or {}
        if fuzzy_note:
            response_data["note"] = fuzzy_note

        return success_response(result["message"], response_data or None)

    # ── SELL ──────────────────────────────────────────────────────────────────
    if action == "sell":
        raw = " ".join(parts[1:])

        price_match = re.search(
            r'(?:for|at|@)?\s*([\d.]+)\s*(?:rs|rupees|₹)?$',
            raw,
            re.IGNORECASE,
        )

        if not price_match:
            raise HTTPException(
                400,
                "Could not find price. Format: sell <qty> <unit> <name> [for/at] <price> [rupees]. "
                "Example: 'sell 2 kg sugar for 57' — 57 is ₹ per kg (price per unit), NOT total.",
            )

        selling_price = float(price_match.group(1))
        core = raw[:price_match.start()].strip()
        core = re.sub(r'\s+(for|at|@)\s*$', '', core, flags=re.IGNORECASE).strip()
        core_parts = core.split()

        if len(core_parts) < 3:
            raise HTTPException(400, "Format: sell <qty> <unit> <name> for <price>. E.g. 'sell 2 kg sugar for 57'")

        try:
            # FIX: use parse_quantity() instead of float() so word numbers work
            # e.g. "two" → 2.0, "half" → 0.5, "twenty" → 20.0
            qty = parse_quantity(core_parts[0])
        except ValueError as e:
            raise HTTPException(400, str(e))

        try:
            unit = normalize_unit(core_parts[1])
        except ValueError:
            raise HTTPException(400, f"Invalid unit '{core_parts[1]}'. Use: kg, g, l, ml, pcs, pkt, dozen.")

        name = " ".join(core_parts[2:]).strip()
        products, fuzzy_note = find_product_by_name(name, user.id, db)

        if not products:
            raise HTTPException(404, f"Product '{name}' not found. Run GET /products/ to see all products.")

        product = products[0]
        updated = sell_product(product.product_id, qty, unit, db, user, selling_price)

        from utils.measurement_unit_converter import convert_to_base
        _, _, factor = convert_to_base(1, normalize_unit(product.display_unit))
        total_revenue = round((qty * factor) * (selling_price / factor), 2)

        response_data = {
            "product": product.product_name,
            "sold_qty": format_quantity(qty * factor, updated.unit_of_measure, updated.display_unit),
            "unit_price": f"₹{selling_price} per {unit}",
            "total_revenue": f"₹{total_revenue}",
            "remaining_qty": format_quantity(updated.quantity, updated.unit_of_measure, updated.display_unit),
            "stock_value": round(updated.total_price, 2) if updated.total_price else 0,
        }
        if fuzzy_note:
            response_data["note"] = fuzzy_note

        return success_response("Sold via voice", response_data)

    # ── ADD / UPDATE ──────────────────────────────────────────────────────────
    if action in ["add", "update"]:
        if len(parts) < 4:
            raise HTTPException(400, "Format: add <qty> <unit> <name>. E.g. 'add 10 kg sugar'")

        try:
            # FIX: use parse_quantity() instead of float() so word numbers work
            qty = parse_quantity(parts[1])
        except ValueError as e:
            raise HTTPException(400, str(e))

        try:
            unit = normalize_unit(parts[2])
        except ValueError:
            raise HTTPException(400, f"Invalid unit '{parts[2]}'. Use: kg, g, l, ml, pcs, pkt, dozen.")

        name = " ".join(parts[3:])
        products, fuzzy_note = find_product_by_name(name, user.id, db)

        if not products:
            raise HTTPException(
                404,
                f"Product '{name}' not found. Voice add only updates existing products. "
                "Use POST /products/add to create a new one.",
            )

        product = products[0]

        class VoiceUpdate(ProductUpdate):
            barcode: Optional[str] = None

        data = VoiceUpdate(
            product_name=None,
            description=None,
            quantity=qty,
            unit_of_measure=unit,
            unit_price=None,
            barcode=product.product_id,
        )

        updated = create_product(data, db, user)

        response_data = {
            "product": product.product_name,
            "added_qty": format_quantity(
                qty * (lambda u: safe_convert(1, u)[2])(unit), updated.unit_of_measure, updated.display_unit
            ),
            "total_stock": format_quantity(updated.quantity, updated.unit_of_measure, updated.display_unit),
            "stock_value": round(updated.total_price, 2) if updated.total_price else 0,
        }
        if fuzzy_note:
            response_data["note"] = fuzzy_note

        return success_response("Stock updated via voice", response_data)

    raise HTTPException(
        400,
        f"Unknown action '{action}'. Supported: sell, add, update, delete, remove.",
    )




# ---------------- MARK INACTIVE ----------------

@router.put(
    "/archive/{barcode}",
    summary="Mark Product as Inactive (Soft Delete)",
    description="""
## 📦 Mark a Product as Inactive

Hides the product from inventory without deleting it or its transactions.
All historical transaction data is fully preserved.

Use this when a product is **discontinued** but you want to keep its sales history.

- The product disappears from the active inventory list
- All past transactions remain in the Transactions page
- Can be reactivated later via `PUT /products/reactivate/{barcode}`

---
### Common Errors:
| Code | Reason |
|------|--------|
| 404  | Product not found |
""",
)
def mark_inactive(
    barcode: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    product = db.query(Product).filter(
        Product.product_id == barcode,
        Product.owner_id == user.id,
    ).first()

    if not product:
        raise HTTPException(404, f"No product found with barcode '{barcode}'.")

    product.is_active = False
    db.commit()
    return success_response(
        f"'{product.product_name}' marked as inactive. Transaction history preserved.",
        {"product_id": barcode, "product_name": product.product_name, "is_active": False},
    )


@router.put(
    "/reactivate/{barcode}",
    summary="Reactivate an Inactive Product",
    description="""
## ♻️ Reactivate a Previously Inactive Product

Restores a soft-deleted product back to the active inventory.
""",
)
def reactivate(
    barcode: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    product = db.query(Product).filter(
        Product.product_id == barcode,
        Product.owner_id == user.id,
    ).first()

    if not product:
        raise HTTPException(404, f"No product found with barcode '{barcode}'.")

    product.is_active = True
    db.commit()
    return success_response(
        f"'{product.product_name}' reactivated.",
        {"product_id": barcode, "product_name": product.product_name, "is_active": True},
    )


# ---------------- GET ALL ----------------

@router.get(
    "/",
    summary="Get All Products",
    description="""
## 📋 List All Products

Returns every product in your inventory with quantities and prices shown in
their original display units (kg, dozen, pcs etc.) — not in raw base units.

---

### Response:
```json
{
  "data": [
    {
      "product_id": "8901234567890",
      "product_name": "Sugar",
      "quantity": "50.00 kg",
      "unit_price": 55,
      "unit": "kg",
      "total_price": 2750
    }
  ]
}
```

> `unit_price` is the weighted-average **cost price per display unit** (e.g. ₹55/kg).
> `total_price` = current stock quantity × cost price.
""",
)
def get_products(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(Product).filter(
        Product.owner_id == user.id,
        # ALWAYS exclude ghost products — they are a DB implementation artifact,
        # never a real product the user cares about. Ghost products have barcodes
        # starting with "__ghost__" and should be invisible in all UI views.
        ~Product.product_id.like("__ghost__%"),
    )
    if not include_inactive:
        q = q.filter(Product.is_active == True)
    products = q.all()
    return success_response("Products fetched", [product_response(p) for p in products])


# ---------------- DELETE / WRITE-OFF ----------------

@router.delete(
    "/{barcode}",
    summary="Delete Product or Write-Off Stock",
    description="""
## 🗑️ Delete a Product or Write Off Damaged / Expired Stock

### Mode 1 — Full Delete (no request body)
Permanently removes the product. Logs remaining stock as a write-off loss in analytics.

`DELETE /products/8901234567890`

---

### Mode 2 — Partial Write-Off (with request body)
Removes only a specific quantity. Product stays with reduced stock.
Write-off is recorded with **negative profit** so analytics show the real business loss.

```json
{
  "quantity": 5,
  "unit_of_measure": "kg",
  "reason": "damaged"
}
```

---

### Write-Off Reasons:
`damaged` · `expired` · `freebie` · `stolen` · `spillage`

---

### Common Errors:
| Code | Reason |
|------|--------|
| 404  | Product not found |
| 400  | Write-off quantity exceeds available stock |

---

### Tip:
If the voice command `delete <name>` says "Multiple products matched",
use this endpoint directly with the specific barcode shown in the error.
""",
)
def delete(
    barcode: str,
    data: Optional[ProductWriteOff] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    result = delete_product(
        barcode,
        db,
        user,
        quantity=data.quantity if data else None,
        unit=data.unit_of_measure if data else None,
        reason=data.reason if data else None,
    )
    return success_response(
        result["message"],
        {k: v for k, v in result.items() if k != "message"} or None,
    )