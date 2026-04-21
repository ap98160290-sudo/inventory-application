from utils.unit_mapper import normalize_unit


def _norm(unit):
    """Silently normalize a unit string; return original if unrecognized."""
    if not unit:
        return unit
    try:
        return normalize_unit(unit)
    except ValueError:
        return unit.strip().lower()


def format_quantity(qty, base_unit, display_unit):
    """
    Convert base-unit quantity to human-readable display string.
    qty is always in base units (g, ml, pcs).
    display_unit tells us how to present it (kg, g, l, ml, dozen, pcs, etc.).

    Conversion table (base → display):
        g   + display=kg    → qty / 1000   (e.g. 1000g  → 1.00 kg)
        g   + display=g     → qty          (e.g. 500g   → 500.00 g)
        ml  + display=l     → qty / 1000   (e.g. 2000ml → 2.00 l)
        ml  + display=ml    → qty          (e.g. 500ml  → 500.00 ml)
        pcs + display=dozen → qty / 12     (e.g. 60pcs  → 5.00 dozen)
        pcs + display=pcs   → qty          (e.g. 5pcs   → 5.00 pcs)
    """
    display_unit = _norm(display_unit)

    # ── WEIGHT ────────────────────────────────────────────────────────────────
    if display_unit == "kg":
        return f"{qty / 1000:.2f} kg"
    if display_unit == "g":
        return f"{qty:.2f} g"

    # ── VOLUME ────────────────────────────────────────────────────────────────
    if display_unit == "l":
        return f"{qty / 1000:.2f} l"
    if display_unit == "ml":
        return f"{qty:.2f} ml"

    # ── COUNT ─────────────────────────────────────────────────────────────────
    if display_unit == "dozen":
        return f"{qty / 12:.2f} dozen"
    if display_unit in ["pcs", "pkg", "pkt", "pc", "bottles", "bottle"]:
        return f"{qty:.2f} {display_unit}"

    # ── FALLBACK ──────────────────────────────────────────────────────────────
    return f"{qty} {base_unit}"


def format_unit_price(price_per_base, base_unit, display_unit):
    """
    Convert a price stored in base-unit terms back to display-unit terms.

    Conversion table (base price → display price):
        ₹0.055/g  + display=kg    → 0.055 × 1000 = ₹55/kg       ✅
        ₹0.055/g  + display=g     → 0.055 × 1    = ₹0.055/g     ✅
        ₹0.05/ml  + display=l     → 0.05  × 1000 = ₹50/l        ✅
        ₹0.05/ml  + display=ml    → 0.05  × 1    = ₹0.05/ml     ✅
        ₹10/pcs   + display=dozen → 10    × 12   = ₹120/dozen   ✅
        ₹10/pcs   + display=pcs   → 10    × 1    = ₹10/pcs      ✅
    """
    if price_per_base is None:
        return None
    display_unit = _norm(display_unit)

    # ── WEIGHT ────────────────────────────────────────────────────────────────
    if display_unit == "kg":
        return round(price_per_base * 1000, 4)   # ₹/g  → ₹/kg
    if display_unit == "g":
        return round(price_per_base, 4)           # ₹/g  → ₹/g  (no change)

    # ── VOLUME ────────────────────────────────────────────────────────────────
    if display_unit == "l":
        return round(price_per_base * 1000, 4)   # ₹/ml → ₹/l
    if display_unit == "ml":
        return round(price_per_base, 4)           # ₹/ml → ₹/ml (no change)

    # ── COUNT ─────────────────────────────────────────────────────────────────
    if display_unit == "dozen":
        return round(price_per_base * 12, 4)     # ₹/pcs → ₹/dozen

    # pcs, pkt, pkg, pc, bottles → no conversion needed (already per unit)
    return round(price_per_base, 4)


def format_transaction_price(price_per_base, display_unit):
    """
    Convert the stored base-unit price back to a human-readable per-display-unit price.
    Used specifically for rendering transaction records in the insights router.

    Because log_transactions now stores tx.unit = sell_unit (not base unit),
    this function receives the correct display unit for that specific transaction,
    so the price is always shown in the unit the sale/add was made in.

    Examples:
        price_per_base=0.057, display_unit="kg"    → 57.0    (₹/kg)  ✅
        price_per_base=0.057, display_unit="g"     → 0.057   (₹/g)   ✅
        price_per_base=0.05,  display_unit="l"     → 50.0    (₹/l)   ✅
        price_per_base=0.05,  display_unit="ml"    → 0.05    (₹/ml)  ✅
        price_per_base=10,    display_unit="dozen" → 120.0   (₹/doz) ✅
        price_per_base=10,    display_unit="pcs"   → 10.0    (₹/pcs) ✅
    """
    return format_unit_price(price_per_base, None, display_unit)