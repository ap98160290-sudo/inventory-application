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
# ══════════════════════════════════════════════════════════════════════════════
#  ADVANCED VOICE ENGINE  —  handles garbled STT, filler words, word-numbers,
#  two-token quantities, fuzzy units, fuzzy actions, word prices, and partial
#  product name matches with confidence scoring.
# ══════════════════════════════════════════════════════════════════════════════

import unicodedata as _ud

# ─────────────────────────────────────────────────────────────────────────────
# 1.  WORD-TO-NUMBER TABLE  (single and compound tokens)
# ─────────────────────────────────────────────────────────────────────────────
_WORD_NUMBERS: dict[str, float] = {
    "zero":0,"one":1,"two":2,"three":3,"four":4,"five":5,"six":6,
    "seven":7,"eight":8,"nine":9,"ten":10,"eleven":11,"twelve":12,
    "thirteen":13,"fourteen":14,"fifteen":15,"sixteen":16,"seventeen":17,
    "eighteen":18,"nineteen":19,"twenty":20,"thirty":30,"forty":40,
    "fifty":50,"sixty":60,"seventy":70,"eighty":80,"ninety":90,
    "hundred":100,"thousand":1000,
    # fractions
    "half":0.5,"quarter":0.25,"a":1,
    # compound hyphenated (STT sometimes produces these)
    "twenty-one":21,"twenty-two":22,"twenty-three":23,"twenty-four":24,
    "twenty-five":25,"twenty-six":26,"twenty-seven":27,"twenty-eight":28,
    "twenty-nine":29,"thirty-one":31,"thirty-two":32,"thirty-three":33,
    "thirty-four":34,"thirty-five":35,"thirty-six":36,"thirty-seven":37,
    "thirty-eight":38,"thirty-nine":39,"forty-one":41,"forty-two":42,
    "forty-three":43,"forty-four":44,"forty-five":45,"forty-six":46,
    "forty-seven":47,"forty-eight":48,"forty-nine":49,"fifty-one":51,
    "fifty-two":52,"fifty-three":53,"fifty-four":54,"fifty-five":55,
    "fifty-six":56,"fifty-seven":57,"fifty-eight":58,"fifty-nine":59,
}

def _word_num(tok: str) -> float | None:
    return float(_WORD_NUMBERS[tok.lower().strip()]) if tok.lower().strip() in _WORD_NUMBERS else None

def _parse_qty(tokens: list[str]) -> tuple[float, int]:
    """
    Parse a quantity that may span 1 or 2 tokens.
    Returns (value, tokens_consumed).
    Handles:  "2" → (2,1)  "two" → (2,1)  "twenty five" → (25,2)
              "two hundred" → (200,2)   "2.5" → (2.5,1)
    """
    if not tokens:
        raise ValueError("No quantity token provided.")
    t0 = tokens[0].strip()
    # plain numeric
    try:
        return float(t0), 1
    except ValueError:
        pass
    v0 = _word_num(t0)
    if v0 is not None:
        if len(tokens) >= 2:
            t1 = tokens[1].strip()
            v1 = _word_num(t1)
            if v1 is not None:
                if t1 in ("hundred", "thousand"):
                    return v0 * v1, 2
                if v0 >= 20 and 1 <= v1 <= 9:
                    return v0 + v1, 2
        return v0, 1
    raise ValueError(
        f"Cannot understand quantity '{t0}'. "
        "Use a number (e.g. 2, 0.5) or a word (e.g. two, half, twenty five)."
    )


# ─────────────────────────────────────────────────────────────────────────────
# 2.  FILLER WORD STRIPPER
#     Removes spoken noise before parsing — "please sell me 2 kg sugar"
# ─────────────────────────────────────────────────────────────────────────────
_FILLER: set[str] = {
    # articles / determiners
    "a","an","the","some","any",
    # politeness
    "please","kindly","just","quickly","hey","hi","hello","ok","okay","yes",
    # hedging
    "um","uh","er","hmm","ah","oh",
    # connective filler
    "me","can","you","i","want","to","would","like","could","need",
    "now","today","go","ahead","do","it","for","my","our","shop",
    # Hindi / regional
    "bhai","yaar","ek","mujhe","karo","abhi","jaldi","thoda","bahut",
}

def _strip_filler(parts: list[str]) -> list[str]:
    return [p for p in parts if p.lower().strip() not in _FILLER]


# ─────────────────────────────────────────────────────────────────────────────
# 3.  FUZZY ACTION RESOLVER
#     3-layer: exact alias → difflib edit-distance → prefix
# ─────────────────────────────────────────────────────────────────────────────
_ACTION_ALIASES: dict[str, list[str]] = {
    "sell": [
        "sel","sal","cell","shell","spell","smell","yell","well","seal",
        "seIl","seel","sall","sel1","cel","shel","spel","seel","selll",
        "sale","sales","selling","sold","zel","zell","tell",
        # hinglish
        "becho","bech","bechna","beche",
    ],
    "add": [
        "ad","at","had","bad","ads","add","addd","aad",
        "adding","added","app","abd",
        # hinglish
        "jodo","dalo","daalo","lagao",
    ],
    "update": [
        "updaet","updat","updated","updates","updating","upd","udate",
        "uppdate","upate","upadte","upd8",
        "restock","restok","re-stock","restock","refill","re-fill",
        "replenish","reorder","resuply","resupply",
        # hinglish
        "bharo","bharao",
    ],
    "delete": [
        "delet","delate","dell","deltee","deleting","deleted","del",
        "deleete","dleet","remov","rmove","rmv",
        "remove","removes","removing",
        "write-off","writeoff","write off","writoff","writeofs","writeof",
        "damaged","damage","damagd","damge","dmg",
        "expired","expire","expiry","expred","expird",
        "loss","lost","wasted","waste","broken","spoiled","stolen",
        # hinglish
        "hatao","nikalo","hatana","nikalao",
    ],
}
_ALIAS_MAP: dict[str, str] = {
    alias: canonical
    for canonical, aliases in _ACTION_ALIASES.items()
    for alias in aliases
}
for _c in _ACTION_ALIASES:
    _ALIAS_MAP[_c] = _c

def _fuzzy_action(token: str) -> tuple[str | None, str | None]:
    """Returns (canonical_action, match_method) or (None, None)."""
    t = token.lower().strip()
    if t in _ALIAS_MAP:
        return _ALIAS_MAP[t], "exact"
    close = get_close_matches(t, list(_ALIAS_MAP.keys()), n=1, cutoff=0.68)
    if close:
        return _ALIAS_MAP[close[0]], "fuzzy"
    if len(t) >= 3:
        for canonical in _ACTION_ALIASES:
            if canonical.startswith(t) or t.startswith(canonical[:3]):
                return canonical, "prefix"
    return None, None


# ─────────────────────────────────────────────────────────────────────────────
# 4.  FUZZY UNIT RESOLVER
#     Handles: "kilograms", "kilo", "litres", "cousin" (→ dozen), "packs", etc.
# ─────────────────────────────────────────────────────────────────────────────
_UNIT_ALIASES: dict[str, list[str]] = {
    "kg":  ["kilo","kilos","kilogram","kilograms","kgs","k.g","kg.","kkg",
            "killo","killogram","killograms","kgs.","okayg","cago","kaygee",
            "key","ki","keeloo"],
    "g":   ["gram","grams","gramme","grammes","gm","gms","grm","grms",
            "grames","gramm"],
    "l":   ["litre","litres","liter","liters","lt","ltr","ltrs","lts",
            "litters","liter","litear","leeeter"],
    "ml":  ["millilitre","millilitres","milliliter","milliliters",
            "milli","mil","mls","milli-litre","mililitre"],
    "pcs": ["piece","pieces","pc","pce","pices","unit","units","nos","no",
            "number","item","items","count","counts","pec","pex","nos.",
            "quantity","quantities","pis","pies","each"],
    "pkt": ["packet","packets","pack","packs","pkg","pkts","pckt","pkt.",
            "pouch","pouches","pocket","picket","sachet","sachets",
            "package","packages","packs.","packaging"],
    "dozen": ["doz","doz.","dzn","dzen","12","twelve","dozens",
              "doesnt","doesn","cousin","frozen","doze","doz","dzn"],
    "bottles": ["bottle","bot","btl","btls","bott","bottel","bottl",
                "btle","bttle","bootle","botle"],
}
_UNIT_MAP: dict[str, str] = {
    alias: canonical
    for canonical, aliases in _UNIT_ALIASES.items()
    for alias in aliases
}
for _u in _UNIT_ALIASES:
    _UNIT_MAP[_u] = _u

def _fuzzy_unit(token: str) -> str | None:
    """Returns canonical unit string or None if no match."""
    t = token.lower().strip().rstrip(".")
    if t in _UNIT_MAP:
        return _UNIT_MAP[t]
    # try via normalize_unit (already handles many variants)
    try:
        return normalize_unit(t)
    except (ValueError, AttributeError):
        pass
    close = get_close_matches(t, list(_UNIT_MAP.keys()), n=1, cutoff=0.65)
    if close:
        return _UNIT_MAP[close[0]]
    if len(t) >= 3:
        for canonical in _UNIT_ALIASES:
            if canonical.startswith(t[:3]) or t.startswith(canonical):
                return canonical
    return None


# ─────────────────────────────────────────────────────────────────────────────
# 5.  PRICE EXTRACTOR
#     Handles digit prices AND word-number prices after trigger words.
#     "for fifty seven rupees" → 57.0
#     "@ 120"                 → 120.0
#     "sugar 65"              → 65.0 (bare trailing number)
# ─────────────────────────────────────────────────────────────────────────────
_PRICE_TRIGGER = re.compile(
    r'\b(for|at|@|price|rate|charged?|costs?|worth|selling|rupees?|rs\.?|inr|₹)\b',
    re.IGNORECASE,
)
_DIGIT_TAIL = re.compile(
    r'(?:for|at|@|rs\.?|rupees?|inr|₹|price|rate)?\s*([\d]+(?:[.,][\d]+)?)\s*'
    r'(?:rs\.?|rupees?|inr|₹|each|per\s+\w+)?\s*$',
    re.IGNORECASE,
)

def _extract_price(raw: str) -> tuple[float | None, str]:
    """
    Strips price from the right end of a command string.
    Returns (price_as_float | None, remainder_without_price).
    """
    raw = raw.strip()
    # 1. digit price at tail
    m = _DIGIT_TAIL.search(raw)
    if m:
        price = float(m.group(1).replace(",", ""))
        remainder = raw[:m.start()].strip()
        remainder = re.sub(
            r'\s+(for|at|@|price|rate|rupees?|rs\.?|inr|₹)\s*$',
            '', remainder, flags=re.IGNORECASE
        ).strip()
        return price, remainder

    # 2. word-number price after trigger
    for trig in reversed(list(_PRICE_TRIGGER.finditer(raw))):
        after_tokens = raw[trig.end():].strip().split()
        before = raw[:trig.start()].strip()
        if after_tokens:
            try:
                price, _ = _parse_qty(after_tokens)
                return price, before
            except ValueError:
                pass

    return None, raw


# ─────────────────────────────────────────────────────────────────────────────
# 6.  SMART PRODUCT NAME MATCHER
#     Goes beyond the existing find_product_by_name with multi-token
#     partial matching, individual word overlap, and token-level fuzzy.
# ─────────────────────────────────────────────────────────────────────────────
def _smart_find_product(
    name_query: str,
    user_id: int,
    db: "Session",
) -> tuple[list, str | None]:
    """
    Enhanced product lookup with 4-layer strategy:
      L1: DB LIKE/contains (exact substring) — delegate to existing helper
      L2: Token overlap  — every word in query found in product name
      L3: difflib on full name at reduced cutoff (0.40)
      L4: difflib on individual query tokens vs product names
    Returns (products_list, note | None).
    """
    # L1: existing fuzzy helper (LIKE + difflib 0.5)
    products, note = find_product_by_name(name_query, user_id, db)
    if products:
        return products, note

    all_products = db.query(Product).filter(Product.owner_id == user_id).all()
    if not all_products:
        return [], None

    q_tokens = set(name_query.lower().split())
    q_norm   = name_query.lower().strip()

    # L2: token overlap — every query word appears in the product name
    token_matches = [
        p for p in all_products
        if q_tokens and q_tokens.issubset(set(p.product_name.lower().split()))
    ]
    if len(token_matches) == 1:
        p = token_matches[0]
        return [p], f"'{name_query}' matched '{p.product_name}' by word overlap."

    # L3: difflib at lower cutoff on full name
    all_names = [p.product_name.lower() for p in all_products]
    close = get_close_matches(q_norm, all_names, n=1, cutoff=0.40)
    if close:
        p = next(x for x in all_products if x.product_name.lower() == close[0])
        return [p], f"'{name_query}' interpreted as '{p.product_name}' (fuzzy match)."

    # L4: individual token fuzzy — match any significant token
    for tok in sorted(q_tokens, key=len, reverse=True):
        if len(tok) < 3:
            continue
        close = get_close_matches(tok, all_names, n=1, cutoff=0.55)
        if close:
            p = next(x for x in all_products if x.product_name.lower() == close[0])
            return [p], f"'{name_query}' matched '{p.product_name}' via token '{tok}'."

    return [], None


# ─────────────────────────────────────────────────────────────────────────────
# 7.  NOTE ATTACHER
# ─────────────────────────────────────────────────────────────────────────────
def _attach_notes(data: dict, *notes: str | None) -> None:
    merged = [n for n in notes if n]
    if merged:
        data["interpreter_notes"] = merged


# ─────────────────────────────────────────────────────────────────────────────
# 8.  VOICE COMMAND ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────
@router.post(
    "/voice_command",
    summary="Voice Command (Advanced AI Engine)",
    description="""
## 🎙️ Advanced Voice Command Engine

Handles garbled speech-to-text, filler words, word numbers, fuzzy units and actions.

---

### 🛒 SELL — all these work:
| What you say | What it means |
|---|---|
| `sell 2 kg sugar for 57` | sell 2 kg sugar @ ₹57/kg |
| `sel two kilograms sugar 57 rupees` | typo + word number + long unit |
| `cell half dozen egg for one twenty` | STT garble + fraction + word price |
| `please sell me 5 pcs soap at 30` | filler words stripped |
| `shell twenty five pcs rin @ 10` | garbled action + two-token number |
| `becho 2 kilo namak 65` | Hindi action + short unit |

---

### ➕ ADD / UPDATE — all these work:
| What you say | What it means |
|---|---|
| `add 10 kg sugar` | add 10 kg |
| `ad two dozen eggs` | typo |
| `restock 5 litres oil` | alias action |
| `refill twenty five packets soap` | word number + long unit |
| `please add 100 pieces vim liquid` | filler stripped |

---

### 🗑️ DELETE / WRITE-OFF — all these work:
| What you say | What it means |
|---|---|
| `delete sugar` | full delete |
| `delet 5 kg sugar` | typo |
| `remove 2 dozen egg` | alias action |
| `damaged ten pcs soap` | reason as action |
| `write off 3 packets salt` | two-word action |

---

### 💡 What the engine handles automatically:
- **Garbled actions** — "sel", "cell", "shell", "becho" → sell
- **Long unit names** — "kilograms", "litres", "packets" → kg, l, pkt
- **STT unit errors** — "cousin" → dozen, "pecs" → pcs
- **Filler words** — "please", "me", "can you", "hey", "bhai" stripped
- **Word numbers** — "two", "twenty five", "half", "a dozen"
- **Word prices** — "for fifty seven rupees" → ₹57
- **Typos in product names** — "suagr", "soper", "vimm" auto-corrected
- **Partial names** — "vim" matches "vim liquid"
- **Multi-token numbers** — "twenty five" across two tokens
""",
)
def voice_command(
    command: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # ── 1. Normalize text: lowercase, strip, handle unicode ───────────────────
    cmd = _ud.normalize("NFKC", command).lower().strip()
    # replace ₹ and similar with keyword so regex catches it
    cmd = cmd.replace("₹", " rupees ").replace("@", " at ")
    cmd = re.sub(r"\s+", " ", cmd).strip()

    raw_parts = cmd.split()
    parts = _strip_filler(raw_parts)

    if not parts:
        raise HTTPException(
            400,
            "Empty or filler-only command. "
            "Try: 'sell 2 kg sugar for 57' or 'add 10 kg sugar'."
        )

    # ── 2. Resolve action word (fuzzy, 3-layer) ───────────────────────────────
    action_raw = parts[0]
    action, match_method = _fuzzy_action(action_raw)

    if action is None:
        raise HTTPException(
            400,
            f"Cannot understand action '{action_raw}'. "
            "Supported: sell, add, update, delete (and voice variations like "
            "'sel', 'cell', 'restock', 'remove', 'damaged'). "
            "See endpoint docs for full guide."
        )

    correction_note: str | None = (
        f"Action '{action_raw}' → '{action}' (match: {match_method})."
        if action_raw != action else None
    )

    remaining = parts[1:]

    # ══════════════════════════════════════════════════════════════════════════
    # DELETE / WRITE-OFF
    # ══════════════════════════════════════════════════════════════════════════
    if action == "delete":
        qty = unit = None
        name = ""

        # Try to parse: delete <qty> <unit> <name>
        if len(remaining) >= 3:
            try:
                qty, consumed = _parse_qty(remaining)
                unit_tok = remaining[consumed] if consumed < len(remaining) else None
                if unit_tok:
                    resolved_unit = _fuzzy_unit(unit_tok)
                    if resolved_unit:
                        unit = normalize_unit(resolved_unit)
                        name = " ".join(remaining[consumed + 1:]).strip()
                    else:
                        qty = unit = None
            except (ValueError, IndexError):
                qty = unit = None

        if not name:
            name = " ".join(remaining).strip()

        if not name:
            raise HTTPException(
                400,
                "Specify a product name. "
                "E.g. 'delete sugar' or 'delete 5 kg sugar'."
            )

        products, fuzzy_note = _smart_find_product(name, user.id, db)

        if not products:
            raise HTTPException(
                404,
                f"Product '{name}' not found in your inventory. "
                "Run GET /products/ to list all products."
            )
        if len(products) > 1:
            matches = ", ".join(
                f"'{p.product_name}' (barcode: {p.product_id})" for p in products
            )
            raise HTTPException(
                400,
                f"Multiple products matched: {matches}. "
                "Use DELETE /products/{barcode} with a specific barcode."
            )

        result = delete_product(
            products[0].product_id, db, user,
            quantity=qty, unit=unit,
            reason="Voice command write-off" if qty else None,
        )
        resp = {k: v for k, v in result.items() if k != "message"} or {}
        _attach_notes(resp, correction_note, fuzzy_note)
        return success_response(result["message"], resp or None)

    # ══════════════════════════════════════════════════════════════════════════
    # SELL
    # ══════════════════════════════════════════════════════════════════════════
    if action == "sell":
        raw_sell = " ".join(remaining)

        selling_price, core = _extract_price(raw_sell)

        if selling_price is None:
            raise HTTPException(
                400,
                "Could not find a price in the command. "
                "Format: sell <qty> <unit> <product> for <price>. "
                "Example: 'sell 2 kg sugar for 57' — 57 is ₹ per kg."
            )

        core_parts = core.split()
        if len(core_parts) < 3:
            raise HTTPException(
                400,
                "Not enough information. "
                "Format: sell <qty> <unit> <product> for <price>. "
                "Example: 'sell 2 kg sugar for 57'."
            )

        try:
            qty, consumed = _parse_qty(core_parts)
        except ValueError as e:
            raise HTTPException(400, str(e))

        if consumed >= len(core_parts):
            raise HTTPException(400, "Missing unit after quantity.")

        unit_tok = core_parts[consumed]
        resolved_unit = _fuzzy_unit(unit_tok)
        if resolved_unit is None:
            raise HTTPException(
                400,
                f"Cannot understand unit '{unit_tok}'. "
                "Use: kg, g, l, ml, pcs, pkt, dozen, bottles — "
                "or full forms like 'kilograms', 'litres', 'packets'."
            )
        try:
            unit = normalize_unit(resolved_unit)
        except ValueError:
            unit = resolved_unit  # already canonical from _fuzzy_unit

        name = " ".join(core_parts[consumed + 1:]).strip()
        if not name:
            raise HTTPException(
                400,
                "Missing product name. "
                "Format: sell <qty> <unit> <product> for <price>."
            )

        products, fuzzy_note = _smart_find_product(name, user.id, db)
        if not products:
            raise HTTPException(
                404,
                f"Product '{name}' not found. Run GET /products/ to see all products."
            )

        product = products[0]

        # Block selling inactive products
        if getattr(product, "is_active", True) is False:
            raise HTTPException(
                400,
                f"'{product.product_name}' is inactive/archived. "
                "Reactivate it from the Inventory page before selling."
            )

        updated = sell_product(product.product_id, qty, unit, db, user, selling_price)

        from utils.measurement_unit_converter import convert_to_base
        _, _, factor = convert_to_base(1, normalize_unit(product.display_unit))
        total_revenue = round((qty * factor) * (selling_price / factor), 2)

        resp = {
            "product":       product.product_name,
            "sold_qty":      format_quantity(qty * factor, updated.unit_of_measure, updated.display_unit),
            "unit_price":    f"₹{selling_price} per {unit}",
            "total_revenue": f"₹{total_revenue}",
            "remaining_qty": format_quantity(updated.quantity, updated.unit_of_measure, updated.display_unit),
            "stock_value":   round(updated.total_price, 2) if updated.total_price else 0,
        }
        _attach_notes(resp, correction_note, fuzzy_note)
        return success_response("Sold via voice", resp)

    # ══════════════════════════════════════════════════════════════════════════
    # ADD / UPDATE
    # ══════════════════════════════════════════════════════════════════════════
    if action in ("add", "update"):
        if len(remaining) < 3:
            raise HTTPException(
                400,
                "Format: add <qty> <unit> <product>. "
                "Example: 'add 10 kg sugar'."
            )

        try:
            qty, consumed = _parse_qty(remaining)
        except ValueError as e:
            raise HTTPException(400, str(e))

        if consumed >= len(remaining):
            raise HTTPException(400, "Missing unit after quantity.")

        unit_tok = remaining[consumed]
        resolved_unit = _fuzzy_unit(unit_tok)
        if resolved_unit is None:
            raise HTTPException(
                400,
                f"Cannot understand unit '{unit_tok}'. "
                "Use: kg, g, l, ml, pcs, pkt, dozen, bottles."
            )
        try:
            unit = normalize_unit(resolved_unit)
        except ValueError:
            unit = resolved_unit

        name = " ".join(remaining[consumed + 1:]).strip()
        if not name:
            raise HTTPException(
                400,
                "Missing product name. Format: add <qty> <unit> <product>."
            )

        products, fuzzy_note = _smart_find_product(name, user.id, db)
        if not products:
            raise HTTPException(
                404,
                f"Product '{name}' not found. "
                "Voice add only updates existing stock. "
                "Use POST /products/add to register a new product."
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

        resp = {
            "product":     product.product_name,
            "added_qty":   format_quantity(
                               qty * (lambda u: safe_convert(1, u)[2])(unit),
                               updated.unit_of_measure,
                               updated.display_unit,
                           ),
            "total_stock": format_quantity(updated.quantity, updated.unit_of_measure, updated.display_unit),
            "stock_value": round(updated.total_price, 2) if updated.total_price else 0,
        }
        _attach_notes(resp, correction_note, fuzzy_note)
        return success_response("Stock updated via voice", resp)

    raise HTTPException(
        400,
        f"Unknown action '{action}'. Supported: sell, add, update, delete.",
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