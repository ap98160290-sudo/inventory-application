from utils.unit_mapper import normalize_unit

UNIT_MAP = {
    "kg": ("g", 1000, "weight"),
    "g": ("g", 1, "weight"),

    "l": ("ml", 1000, "volume"),
    "ml": ("ml", 1, "volume"),

    "dozen": ("pcs", 12, "count"),
    "pcs": ("pcs", 1, "count"),
    "pkg": ("pcs", 1, "count"),
    "pkt": ("pcs", 1, "count"),
    "bottles": ("pcs", 1, "count")
}

def convert_to_base(quantity, unit):
    if unit is None:
        raise ValueError("Unit of measure cannot be None")

    unit = normalize_unit(unit)

    if unit not in UNIT_MAP:
        raise ValueError(f"Unsupported unit of measure: {unit}")

    base_unit, factor, category = UNIT_MAP[unit]

    base_quantity = float(quantity) * factor

    return base_quantity, base_unit, factor