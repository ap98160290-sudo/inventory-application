UNIT_VARIANTS = {
    "kg": ["kg", "kilogram", "kilograms", "kgs"],
    "g": ["g", "gram", "grams", "gms"],
    "l": ["l", "liter", "liters", "litres", "litre", "ltr", "lt"],
    "ml": ["ml", "milliliter", "milliliters", "millilitres"],

    "pcs": ["pcs", "pieces", "piece", "pc"],

    "dozen": ["dozen", "dz"],

    "bottles": ["bottles", "bot"],
    "pkg": ["pkg", "package", "packages"],
    "pkt": ["pkt", "packet", "packets", "pkts"]
}



UNIT_LOOKUP = {
    variant: standard
    for standard, variants in UNIT_VARIANTS.items()
    for variant in variants
}
# print("UNIT_LOOKUP:", UNIT_LOOKUP)  # Debugging statement


def normalize_unit(unit: str):
    if unit is None:
        return None

    # normalize input
    unit = unit.strip().lower().replace(" ", "")

    if unit in UNIT_LOOKUP:
        return UNIT_LOOKUP[unit]
    raise ValueError(f"Unsupported unit: {unit}")