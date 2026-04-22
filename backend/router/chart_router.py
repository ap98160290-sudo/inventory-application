# from fastapi.params import Depends
# from sqlalchemy import func
# from sqlalchemy.orm import Session

# from db.database import get_db
# from db.models import Product, Transaction
# from utils.auth import get_current_user
# from utils.response import success_response
# from fastapi import APIRouter
# from utils.formatter import format_quantity
# from db.models import *
# from utils.unit_mapper import normalize_unit

# router = APIRouter(prefix="/charts",tags=["Charts"])


# # Bar Chart (Product vs Quantity)
# @router.get("/charts/stock")
# def stock_chart(db:Session=Depends(get_db), user=Depends(get_current_user)):
    
# products=db.query(Product).filter(Product.owner_id == user.id).all()
    
# return [
# {
# "product_name": p.product_name,
# "quantity": format_quantity(p.quantity, p.unit_of_measure, p.display_unit),
# "unit": p.display_unit
# }
# for p in products
# ]


# # Pie Chart (Value Distribution)

# @router.get("/charts/value")
# def value_chart(db:Session=Depends(get_db), user=Depends(get_current_user)):
    
# products=db.query(Product).filter(Product.owner_id == user.id).all()
    
# return [
# {
# "product_name":p.product_name,
# "value":p.quantity * p.unit_price or 0,
# "unit": p.display_unit
# }
# for p in products
# ]


# #PROFIT TREND (LINE CHART)

# @router.get("/charts/profit")
# def profit_chart(db: Session = Depends(get_db), user=Depends(get_current_user)):

# data = db.query(
# func.date(Transaction.timestamp),
# func.sum(Transaction.quantity * Transaction.price_per_unit)
# ).join(
# Product, Transaction.product_id == Product.id
# ).filter(
# Transaction.owner_id == user.id,
# func.lower(Transaction.transaction_type) == "sell"
# ).group_by(
# func.date(Transaction.timestamp)
# ).all()

# return [
# {
# "date": str(d),
# "profit": p or 0
            
# }
# for d, p in data
# ]

from fastapi.params import Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Product, Transaction
from utils.auth import get_current_user
from utils.response import success_response
from fastapi import APIRouter
from utils.formatter import format_quantity
from db.models import *

router = APIRouter(prefix="/charts", tags=["Charts"])


# ---------------- STOCK BAR CHART ----------------

@router.get(
    "/stock",
    summary="Stock Chart Data (Bar Chart)",
    description="""
## 📊 Stock Levels — Bar Chart Data

Returns product names with their current stock quantities and units.
Designed to feed a **bar chart** (product name on X-axis, quantity on Y-axis).

---

### Response:
```json
[
  {
    "product_name": "Sugar",
    "quantity": "50 kg",
    "unit": "kg"
  },
  {
    "product_name": "Detergent",
    "quantity": "20 pkt",
    "unit": "pkt"
  },
  {
    "product_name": "Egg",
    "quantity": "35 dozen",
    "unit": "dozen"
  }
]
```

---

### Recommended Chart Usage:
- **Chart type:** Vertical or horizontal bar chart
- **X-axis:** `product_name`
- **Y-axis:** raw numeric quantity (parse the number from `quantity` string)
- **Color coding:** highlight bars below `low_stock_threshold` in red
  (use `GET /insights/dashboard` to get the low stock list)

---

### Notes:
- `quantity` is returned as a formatted string (e.g. `"50 kg"`) for display purposes
- Returns all products — zero-quantity products are included
- For value distribution instead of quantity use `GET /charts/value`
""",
)
def stock_chart(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    products = db.query(Product).filter(Product.owner_id == user.id).all()

    return [
        {
            "product_name": p.product_name,
            "quantity": format_quantity(p.quantity, p.unit_of_measure, p.display_unit),
            "unit": p.display_unit,
        }
        for p in products
    ]


# ---------------- VALUE PIE CHART ----------------

@router.get(
    "/value",
    summary="Inventory Value Distribution (Pie Chart)",
    description="""
## 🥧 Inventory Value — Pie Chart Data

Returns the total stock value per product (`quantity × unit_price`).
Designed to feed a **pie chart** showing how your total inventory value
is distributed across products.

---

### Response:
```json
[
  {
    "product_name": "Sugar",
    "value": 2000.0,
    "unit": "kg"
  },
  {
    "product_name": "Detergent",
    "value": 2400.0,
    "unit": "pkt"
  },
  {
    "product_name": "Egg",
    "value": 2520.0,
    "unit": "dozen"
  }
]
```

---

### Recommended Chart Usage:
- **Chart type:** Pie chart or donut chart
- **Slice label:** `product_name`
- **Slice size:** `value`
- **Tooltip:** show `₹{value}` on hover

---

### Notes:
- `value` = `quantity × unit_price` at the **current cost price** (not selling price)
- Returns `0` if `unit_price` is not set for a product
- Products with `value: 0` (no stock or no price) are included — filter them out
  on the frontend if you want a cleaner pie chart
- For quantity distribution instead of value use `GET /charts/stock`
""",
)
def value_chart(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    products = db.query(Product).filter(Product.owner_id == user.id).all()

    return [
        {
            "product_name": p.product_name,
            "value": p.quantity * p.unit_price if p.unit_price else 0,
            "unit": p.display_unit,
        }
        for p in products
    ]


# ---------------- PROFIT TREND LINE CHART ----------------

@router.get(
    "/profit",
    summary="Profit Trend Chart Data (Line Chart)",
    description="""
## 📈 Daily Net Profit Trend — Line Chart Data

Returns true net profit per day (sell profit minus write-off losses), ordered chronologically.
Designed to feed a **line chart** showing profit trends over time.

---

### How the value is calculated:
- `sell_profit` = sum of pre-calculated `profit` field on sell transactions (revenue − cost)
- `write_off_loss` = sum of `profit` field on writeoff transactions (always negative)
- `net_profit` = sell_profit + write_off_loss

---

### Response:
```json
[
  { "date": "2024-01-15", "sell_profit": 450.0, "write_off_loss": -80.0, "net_profit": 370.0 },
  { "date": "2024-01-16", "sell_profit": 870.5, "write_off_loss": 0.0, "net_profit": 870.5 }
]
```

---

### Recommended Chart Usage:
- **Chart type:** Line chart or area chart
- **X-axis:** `date`
- **Y-axis:** `net_profit`
- **Tooltip:** show `₹{net_profit}` on hover

---

### Notes:
- Dates with no activity are not included
- Write-off losses reduce the net profit so the chart reflects true business performance
- For a detailed monthly breakdown use `GET /insights/analytics/profit/monthly`
""",
)
def profit_chart(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # Use pre-calculated `profit` field (already correct: sell profit is positive,
    # write-off profit is negative — both set correctly in log_transactions)
    sell_data = db.query(
        func.date(Transaction.timestamp).label("date"),
        func.sum(Transaction.profit).label("sell_profit"),
    ).filter(
        Transaction.owner_id == user.id,
        func.lower(Transaction.transaction_type) == "sell",
    ).group_by(
        func.date(Transaction.timestamp)
    ).all()

    writeoff_data = db.query(
        func.date(Transaction.timestamp).label("date"),
        func.sum(Transaction.profit).label("write_off_loss"),
    ).filter(
        Transaction.owner_id == user.id,
        func.lower(Transaction.transaction_type) == "writeoff",
    ).group_by(
        func.date(Transaction.timestamp)
    ).all()

    sell_map = {str(row.date): round(row.sell_profit or 0, 2) for row in sell_data}
    writeoff_map = {str(row.date): round(row.write_off_loss or 0, 2) for row in writeoff_data}

    all_dates = sorted(set(sell_map) | set(writeoff_map))

    return [
        {
            "date": d,
            "sell_profit": sell_map.get(d, 0),
            "write_off_loss": writeoff_map.get(d, 0),
            "net_profit": round(sell_map.get(d, 0) + writeoff_map.get(d, 0), 2),
        }
        for d in all_dates
    ]