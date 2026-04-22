from fastapi import APIRouter, Query
from fastapi.params import Depends
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from typing import Optional
from db.database import get_db
from db.models import Product, Transaction
from utils.auth import get_current_user
from utils.response import success_response
from utils.formatter import format_quantity, format_unit_price, format_transaction_price
from db.models import *

router = APIRouter(prefix="/insights", tags=["Insights"])

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def _tx_row(tx):
    """
    Build a human-readable transaction dict.

    price_per_unit is stored in BASE-unit terms (₹/g, ₹/ml, ₹/pcs).
    tx.unit now stores the DISPLAY unit used for that specific transaction
    (e.g. "kg" for a kg-based sale, "pcs" for a pcs-based sale, "dozen" for dozen).

    FIX: We use tx.unit (the transaction's own display unit) instead of
    product.display_unit. This matters when a product was added in one unit
    but sold in another — e.g. added in dozen, sold in pcs.

    Old code:
        display_unit = tx.product.display_unit  ← always "dozen" even if sold in pcs
        → format_transaction_price(10, "dozen") → ₹120 ❌ (user sold at ₹10/pcs)

    Fixed code:
        display_unit = tx.unit  ← "pcs" because that's what was stored at sell time
        → format_transaction_price(10, "pcs") → ₹10 ✅

    Conversion examples (price_per_base → display price via tx.unit):
        0.057 /g  + tx.unit="kg"   → 57.0  ✅
        0.057 /g  + tx.unit="g"    → 0.057 ✅
        0.05  /ml + tx.unit="l"    → 50.0  ✅
        0.05  /ml + tx.unit="ml"   → 0.05  ✅
        10    /pcs + tx.unit="dozen"→ 120.0 ✅
        10    /pcs + tx.unit="pcs" → 10.0  ✅
    """
    # FIX: prefer tx.unit (set at transaction time) over product.display_unit
    # tx.unit is the unit the user actually used for that specific transaction.
    # Fall back to product.display_unit only if tx.unit is missing (old records).
    tx_unit = tx.unit
    if not tx_unit and tx.product:
        tx_unit = tx.product.display_unit
    if not tx_unit:
        tx_unit = "pcs"  # safe final fallback

    # Use snapshot name so transactions from deleted products still show the name
    product_name = (
        tx.product.product_name if tx.product
        else getattr(tx, "product_name_snapshot", None) or f"[Deleted #{tx.product_id}]"
    )

    # Convert stored base-unit price → display-unit price using the transaction's unit
    display_price = format_transaction_price(tx.price_per_unit, tx_unit)

    # For quantity display: sell transactions stored qty in base units,
    # use tx_unit to format it back to human-readable form.
    # base_unit is derived from what the product stores (g, ml, pcs).
    base_unit = tx.product.unit_of_measure if tx.product else tx_unit

    return {
        "product_name": product_name,
        "product_id": tx.product_id,
        "quantity": format_quantity(tx.quantity, base_unit, tx_unit),
        "unit": tx_unit,
        # Price shown in display units (₹/kg, ₹/pcs, ₹/dozen) not base (₹/g, ₹/pcs)
        "price_per_unit": display_price,
        "total_price": round(tx.total_price or 0, 2),
        "profit": round(tx.profit or 0, 2),
        "transaction_type": tx.transaction_type,
        "timestamp": tx.timestamp,
        "reason": tx.note or None,          # write-off reason (damaged/expired/freebie/stolen/spillage)
    }


# ─────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────
@router.get(
    "/dashboard",
    summary="Inventory Dashboard",
    description="""
## 📊 Inventory Dashboard Summary

Returns a high-level snapshot: total products, total stock value, and low-stock alerts.

---
### Response:
```json
{
  "status": "success",
  "message": "Dashboard fetched",
  "data": {
    "total_products": 5,
    "total_stock_value": 18500.0,
    "low_stock_items": [
      { "product_name": "Palm Oil", "quantity": "19.00 pkt" }
    ]
  }
}
```
---
### Notes:
- `total_stock_value` = sum of (current quantity × cost price) across all products — in ₹
- `total_quantity` is intentionally omitted because products use different units
  (kg, pcs, dozen) — summing them gives a meaningless number
- `low_stock_items` = products below their `low_stock_threshold`
""",
)
def get_dashboard(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    products = db.query(Product).filter(Product.owner_id == user.id).all()
    total_products = len(products)
    total_stock_value = round(sum(p.total_price for p in products if p.total_price), 2)
    low_stock_items = [
        {
            "product_name": p.product_name,
            "quantity": format_quantity(p.quantity, p.unit_of_measure, p.display_unit),
        }
        for p in products
        if p.quantity < p.low_stock_threshold
    ]
    return success_response("Dashboard fetched", {
        "total_products": total_products,
        "total_stock_value": total_stock_value,
        "low_stock_items": low_stock_items,
    })


# ─────────────────────────────────────────────────────────────
# DAILY PROFIT (including write-off losses)
# ─────────────────────────────────────────────────────────────
@router.get(
    "/analytics/profit",
    summary="Daily Profit Analytics",
    description="""
## 💹 Daily Net Profit Breakdown

Returns daily profit from sales MINUS losses from write-offs, giving a true net figure.

---
### How values are calculated:
- `sell_profit`    = sum of (selling_price − cost_price) × qty for each sale that day
- `write_off_loss` = sum of cost value of stock written off that day (shown as negative)
- `net_profit`     = sell_profit + write_off_loss

---
### Response:
```json
[
  {
    "date": "2024-01-15",
    "sell_profit": 450.0,
    "write_off_loss": -80.0,
    "net_profit": 370.0
  }
]
```
---
### Notes:
- Dates with no activity are not included
- For monthly grouping use `GET /insights/analytics/profit/monthly`
""",
)
def profit(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    sell_data = db.query(
        func.date(Transaction.timestamp).label("date"),
        func.sum(Transaction.profit).label("sell_profit"),
    ).filter(
        Transaction.owner_id == user.id,
        func.lower(Transaction.transaction_type) == "sell",
    ).group_by(func.date(Transaction.timestamp)).all()

    writeoff_data = db.query(
        func.date(Transaction.timestamp).label("date"),
        func.sum(Transaction.profit).label("write_off_loss"),
    ).filter(
        Transaction.owner_id == user.id,
        func.lower(Transaction.transaction_type) == "writeoff",
    ).group_by(func.date(Transaction.timestamp)).all()

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


# ─────────────────────────────────────────────────────────────
# MONTHLY PROFIT
# ─────────────────────────────────────────────────────────────
@router.get(
    "/analytics/profit/monthly",
    summary="Monthly Profit Analytics",
    description="""
## 📅 Monthly Net Profit Breakdown

Returns monthly sell profit, write-off losses, and net profit.
Optional `?year=2024` filter.

---
### Response:
```json
[
  {
    "year": 2024,
    "month": 1,
    "month_name": "January",
    "total_revenue": 15200.0,
    "total_cost": 11800.0,
    "sell_profit": 3400.0,
    "write_off_loss": -250.0,
    "net_profit": 3150.0,
    "total_transactions": 42
  }
]
```
""",
)
def monthly_profit(
    year: Optional[int] = Query(None, description="Filter by year e.g. 2024"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    sell_q = db.query(
        extract("year", Transaction.timestamp).label("year"),
        extract("month", Transaction.timestamp).label("month"),
        func.sum(Transaction.total_price).label("total_revenue"),
        func.sum(Transaction.profit).label("sell_profit"),
        func.count(Transaction.id).label("total_transactions"),
    ).filter(
        Transaction.owner_id == user.id,
        func.lower(Transaction.transaction_type) == "sell",
    )
    if year:
        sell_q = sell_q.filter(extract("year", Transaction.timestamp) == year)
    sell_data = sell_q.group_by(
        extract("year", Transaction.timestamp),
        extract("month", Transaction.timestamp),
    ).order_by(
        extract("year", Transaction.timestamp),
        extract("month", Transaction.timestamp),
    ).all()

    wo_q = db.query(
        extract("year", Transaction.timestamp).label("year"),
        extract("month", Transaction.timestamp).label("month"),
        func.sum(Transaction.profit).label("write_off_loss"),
    ).filter(
        Transaction.owner_id == user.id,
        func.lower(Transaction.transaction_type) == "writeoff",
    )
    if year:
        wo_q = wo_q.filter(extract("year", Transaction.timestamp) == year)
    wo_data = wo_q.group_by(
        extract("year", Transaction.timestamp),
        extract("month", Transaction.timestamp),
    ).all()

    wo_map = {(int(r.year), int(r.month)): round(r.write_off_loss or 0, 2) for r in wo_data}

    return success_response("Monthly profit fetched", [
        {
            "year": int(row.year),
            "month": int(row.month),
            "month_name": MONTH_NAMES[int(row.month)],
            "total_revenue": round(row.total_revenue or 0, 2),
            "total_cost": round((row.total_revenue or 0) - (row.sell_profit or 0), 2),
            "sell_profit": round(row.sell_profit or 0, 2),
            "write_off_loss": wo_map.get((int(row.year), int(row.month)), 0),
            "net_profit": round(
                (row.sell_profit or 0) + wo_map.get((int(row.year), int(row.month)), 0), 2
            ),
            "total_transactions": row.total_transactions,
        }
        for row in sell_data
    ])


# ─────────────────────────────────────────────────────────────
# MONTHLY SALES SUMMARY (per product)
# ─────────────────────────────────────────────────────────────
@router.get(
    "/analytics/sales/monthly",
    summary="Monthly Sales Summary Per Product",
    description="""
## 🗓️ Monthly Sales — Per Product

Returns units sold and revenue per product per month. Optional `?year=2024` filter.

---
### Response:
```json
[
  {
    "year": 2024, "month": 1, "month_name": "January",
    "product_name": "Sugar", "total_sold": "120.00 kg", "total_revenue": 6840.0
  }
]
```
""",
)
def monthly_sales_summary(
    year: Optional[int] = Query(None, description="Filter by year e.g. 2024"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(
        extract("year", Transaction.timestamp).label("year"),
        extract("month", Transaction.timestamp).label("month"),
        Transaction.product_id,
        func.sum(Transaction.quantity).label("total_sold"),
        func.sum(Transaction.total_price).label("total_revenue"),
    ).filter(
        Transaction.owner_id == user.id,
        func.lower(Transaction.transaction_type) == "sell",
    )
    if year:
        query = query.filter(extract("year", Transaction.timestamp) == year)
    data = query.group_by(
        extract("year", Transaction.timestamp),
        extract("month", Transaction.timestamp),
        Transaction.product_id,
    ).order_by(
        extract("year", Transaction.timestamp),
        extract("month", Transaction.timestamp),
    ).all()

    result = []
    for row in data:
        product = db.query(Product).filter(Product.id == row.product_id).first()
        display_unit = product.display_unit if product else "units"
        unit_of_measure = product.unit_of_measure if product else "pcs"
        result.append({
            "year": int(row.year),
            "month": int(row.month),
            "month_name": MONTH_NAMES[int(row.month)],
            "product_name": product.product_name if product else f"[deleted] {row.product_id}",
            "total_sold": format_quantity(row.total_sold or 0, unit_of_measure, display_unit),
            "total_revenue": round(row.total_revenue or 0, 2),
        })
    return success_response("Monthly sales summary fetched", result)

# ─────────────────────────────────────────────────────────────
# ALL-TIME WRITE-OFFS (FIXED)
# ─────────────────────────────────────────────────────────────
@router.get(
    "/analytics/write-offs",
    summary="All Write-Offs / Losses (All Time)",
    description="""
## 🗑️ All-Time Write-Off Summary
Returns total stock written off per product and reason. Shows the total cost value lost.
""",
)
def all_write_offs(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Aggregates write-off transactions per product.

    Key fixes applied here:
    - Uses func.sum(-Transaction.profit) for correct loss amount (profit is stored negative)
    - Groups by product_name_snapshot so ghost-deleted products still appear correctly
      instead of grouping by product_id (which becomes NULL after SET NULL migration)
    - Filters out duplicate "product deleted" write-offs from repeated failed deletes
      by deduplicating on product_name_snapshot
    - Ghost products (barcode starts with __ghost__) are excluded from the breakdown
      display — they are an implementation detail, not real write-offs
    """
    # Group by product_name_snapshot so records survive product deletion
    data = db.query(
        Transaction.product_name_snapshot,
        Transaction.product_id,
        func.sum(Transaction.quantity).label("total_written_off"),
        func.sum(-Transaction.profit).label("stock_value_lost"),
    ).filter(
        Transaction.owner_id == user.id,
        func.lower(Transaction.transaction_type) == "writeoff",
    ).group_by(
        Transaction.product_name_snapshot,
        Transaction.product_id,
    ).all()

    # Merge rows with the same product_name_snapshot (handles ghost-duplicate rows)
    merged: dict = {}
    for row in data:
        # Determine display info
        product = db.query(Product).filter(Product.id == row.product_id).first() if row.product_id else None

        # Skip ghost products entirely — they are an implementation artifact
        if product and product.product_id and str(product.product_id).startswith("__ghost__"):
            continue

        display_unit    = product.display_unit    if product else "pcs"
        unit_of_measure = product.unit_of_measure if product else "pcs"

        # Resolve name: live product > snapshot > fallback
        pname = (
            product.product_name
            if product
            else (row.product_name_snapshot or f"[Deleted #{row.product_id}]")
        )

        key = pname  # merge all write-offs for the same product name
        if key not in merged:
            merged[key] = {
                "product_name":    pname,
                "display_unit":    display_unit,
                "unit_of_measure": unit_of_measure,
                "total_written_off": 0.0,
                "stock_value_lost":  0.0,
            }
        merged[key]["total_written_off"] += float(row.total_written_off or 0)
        merged[key]["stock_value_lost"]  += float(row.stock_value_lost  or 0)

    breakdown = [
        {
            "product_name":    v["product_name"],
            "total_written_off": format_quantity(
                v["total_written_off"], v["unit_of_measure"], v["display_unit"]
            ),
            "stock_value_lost": round(abs(v["stock_value_lost"]), 2),
        }
        for v in merged.values()
    ]

    return success_response("Write-offs fetched", {
        "total_stock_value_lost": round(sum(b["stock_value_lost"] for b in breakdown), 2),
        "breakdown": breakdown,
    })


# ─────────────────────────────────────────────────────────────
# MONTHLY WRITE-OFFS (FIXED)
# ─────────────────────────────────────────────────────────────
@router.get(
    "/analytics/write-offs/monthly",
    summary="Monthly Write-Off Summary",
    description="""
## 🗑️📅 Monthly Write-Off Losses
Write-off cost broken down by month. Optional `?year=2024` filter.
""",
)
def monthly_write_offs(
    year: Optional[int] = Query(None, description="Filter by year e.g. 2024"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # FIX: Use func.sum(-Transaction.profit) to get the actual cost value lost
    query = db.query(
        extract("year", Transaction.timestamp).label("year"),
        extract("month", Transaction.timestamp).label("month"),
        Transaction.product_id,
        func.sum(Transaction.quantity).label("total_written_off"),
        func.sum(-Transaction.profit).label("stock_value_lost"),
    ).filter(
        Transaction.owner_id == user.id,
        func.lower(Transaction.transaction_type) == "writeoff",
    )
    
    if year:
        query = query.filter(extract("year", Transaction.timestamp) == year)
        
    data = query.group_by(
        extract("year", Transaction.timestamp),
        extract("month", Transaction.timestamp),
        Transaction.product_id,
    ).order_by(
        extract("year", Transaction.timestamp).desc(),
        extract("month", Transaction.timestamp).desc(),
    ).all()

    result = []
    for row in data:
        product = db.query(Product).filter(Product.id == row.product_id).first()
        display_unit = product.display_unit if product else "units"
        unit_of_measure = product.unit_of_measure if product else "pcs"
        
        result.append({
            "year": int(row.year),
            "month": int(row.month),
            "month_name": MONTH_NAMES[int(row.month)],
            "product_name": product.product_name if product else f"[deleted] {row.product_id}",
            "total_written_off": format_quantity(row.total_written_off or 0, unit_of_measure, display_unit),
            "stock_value_lost": round(abs(row.stock_value_lost or 0), 2),
        })
        
    return success_response("Monthly write-offs fetched", result)
# # ─────────────────────────────────────────────────────────────
# # ALL-TIME WRITE-OFFS
# # ─────────────────────────────────────────────────────────────
# @router.get(
#     "/analytics/write-offs",
#     summary="All Write-Offs / Losses (All Time)",
#     description="""
# ## 🗑️ All-Time Write-Off Summary

# Returns total stock written off per product and reason. Shows the total cost value lost.

# ---
# ### Response:
# ```json
# {
#   "total_stock_value_lost": 1250.0,
#   "breakdown": [
#     {
#       "product_name": "Sugar", "reason": "damaged",
#       "total_written_off": "20.00 kg", "stock_value_lost": 800.0
#     }
#   ]
# }
# ```
# ---
# ### Reasons: `damaged` · `expired` · `freebie` · `stolen` · `spillage`
# """,
# )
# def all_write_offs(
#     db: Session = Depends(get_db),
#     user=Depends(get_current_user),
# ):
#     data = db.query(
#         Transaction.product_id,
#         func.sum(Transaction.quantity).label("total_written_off"),
#         func.sum(-Transaction.profit).label("stock_value_lost"),
#     ).filter(
#         Transaction.owner_id == user.id,
#         func.lower(Transaction.transaction_type) == "writeoff",
#     ).group_by(Transaction.product_id).all()

#     breakdown = []
#     for row in data:
#         product = db.query(Product).filter(Product.id == row.product_id).first()
#         display_unit = product.display_unit if product else "units"
#         unit_of_measure = product.unit_of_measure if product else "pcs"
#         # If product was hard deleted, try to get name from transaction snapshot
#         if not product:
#             snapshot_tx = db.query(Transaction).filter(
#                 Transaction.product_id == row.product_id
#             ).first() if row.product_id else None
#             pname = (
#                 getattr(snapshot_tx, "product_name_snapshot", None)
#                 or f"[Deleted #{row.product_id}]"
#             )
#         else:
#             pname = product.product_name

#         breakdown.append({
#             "product_name": pname,
#             "total_written_off": format_quantity(row.total_written_off or 0, unit_of_measure, display_unit),
#             "stock_value_lost": round(abs(row.stock_value_lost or 0), 2),  # always positive for display
#         })

#     return success_response("Write-offs fetched", {
#         "total_stock_value_lost": round(sum(abs(b["stock_value_lost"]) for b in breakdown), 2),
#         "breakdown": breakdown,
#     })


# # ─────────────────────────────────────────────────────────────
# # MONTHLY WRITE-OFFS
# # ─────────────────────────────────────────────────────────────
# @router.get(
#     "/analytics/write-offs/monthly",
#     summary="Monthly Write-Off Summary",
#     description="""
# ## 🗑️📅 Monthly Write-Off Losses

# Write-off cost broken down by month. Optional `?year=2024` filter.

# ---
# ### Response:
# ```json
# [
#   {
#     "year": 2024, "month": 1, "month_name": "January",
#     "product_name": "Sugar", "total_written_off": "5.00 kg",
#     "stock_value_lost": 200.0
#   }
# ]
# ```
# """,
# )
# def monthly_write_offs(
#     year: Optional[int] = Query(None, description="Filter by year e.g. 2024"),
#     db: Session = Depends(get_db),
#     user=Depends(get_current_user),
# ):
#     query = db.query(
#         extract("year", Transaction.timestamp).label("year"),
#         extract("month", Transaction.timestamp).label("month"),
#         Transaction.product_id,
#         func.sum(Transaction.quantity).label("total_written_off"),
#         func.sum(-Transaction.profit).label("stock_value_lost"),
#     ).filter(
#         Transaction.owner_id == user.id,
#         func.lower(Transaction.transaction_type) == "writeoff",
#     )
#     if year:
#         query = query.filter(extract("year", Transaction.timestamp) == year)
#     data = query.group_by(
#         extract("year", Transaction.timestamp),
#         extract("month", Transaction.timestamp),
#         Transaction.product_id,
#     ).order_by(
#         extract("year", Transaction.timestamp),
#         extract("month", Transaction.timestamp),
#     ).all()

#     result = []
#     for row in data:
#         product = db.query(Product).filter(Product.id == row.product_id).first()
#         display_unit = product.display_unit if product else "units"
#         unit_of_measure = product.unit_of_measure if product else "pcs"
#         result.append({
#             "year": int(row.year),
#             "month": int(row.month),
#             "month_name": MONTH_NAMES[int(row.month)],
#             "product_name": product.product_name if product else f"[deleted] {row.product_id}",
#             "total_written_off": format_quantity(row.total_written_off or 0, unit_of_measure, display_unit),
#             "stock_value_lost": round(row.stock_value_lost or 0, 2),
#         })
#     return success_response("Monthly write-offs fetched", result)


# ─────────────────────────────────────────────────────────────
# TOP SELLING PRODUCTS
# ─────────────────────────────────────────────────────────────
@router.get(
    "/analytics/top-selling-products",
    summary="Top Selling Products",
    description="""
## 🏆 Top Selling Products

Ranked by total quantity sold. Only sell transactions counted.
""",
)
def top_selling_products(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    data = db.query(
        Transaction.product_id,
        func.sum(Transaction.quantity).label("total_sold"),
        func.sum(Transaction.total_price).label("total_revenue"),
    ).filter(
        Transaction.owner_id == user.id,
        func.lower(Transaction.transaction_type) == "sell",
    ).group_by(Transaction.product_id).order_by(
        func.sum(Transaction.quantity).desc()
    ).all()

    result = []
    for row in data:
        product = db.query(Product).filter(Product.id == row.product_id).first()
        display_unit = product.display_unit if product else "units"
        unit_of_measure = product.unit_of_measure if product else "pcs"
        result.append({
            "product_name": product.product_name if product else f"[deleted] {row.product_id}",
            "product_id": row.product_id,
            "total_sold": format_quantity(row.total_sold or 0, unit_of_measure, display_unit),
            "total_revenue": round(row.total_revenue or 0, 2),
        })
    return success_response("Top selling products fetched", result)


# ─────────────────────────────────────────────────────────────
# ALL TRANSACTIONS
# ─────────────────────────────────────────────────────────────
@router.get(
    "/transactions",
    summary="All Transactions",
    description="""
## 📋 All Transactions

Every transaction ordered newest first. Includes sell, add/update, and write-off records.

---
### Transaction Types:
| Type       | Meaning                                                    |
|------------|------------------------------------------------------------|
| `sell`     | Stock sold to customer — profit is positive                |
| `update`   | Stock added / purchased — profit is 0                      |
| `writeoff` | Stock removed (damaged/freebie/expired) — profit is negative |

---
### Response:
```json
[
  {
    "product_name": "Sugar",
    "quantity": "2.00 kg",
    "unit": "kg",
    "price_per_unit": 57,
    "total_price": 114.0,
    "profit": 4.0,
    "transaction_type": "sell",
    "timestamp": "2024-01-17T10:30:00"
  }
]
```
> `price_per_unit` is shown in **display unit** terms (₹/kg, ₹/pcs) — not raw base-unit values.
> `unit` reflects the exact unit used in that transaction (sell unit, not always product display unit).
""",
)
def get_transactions(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    txs = db.query(Transaction).filter(
        Transaction.owner_id == user.id
    ).order_by(Transaction.timestamp.desc()).all()
    return [_tx_row(tx) for tx in txs]


# ─────────────────────────────────────────────────────────────
# SALES ONLY
# ─────────────────────────────────────────────────────────────
@router.get(
    "/transactions/sales",
    summary="Sales Transactions Only",
    description="""
## 🛒 Sales Transactions

Only `sell` type transactions, newest first.
`price_per_unit` shown in display-unit terms (₹/kg, ₹/pcs etc.).
""",
)
def get_sales_transactions(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    txs = db.query(Transaction).filter(
        Transaction.owner_id == user.id,
        func.lower(Transaction.transaction_type) == "sell",
    ).order_by(Transaction.timestamp.desc()).all()
    return [_tx_row(tx) for tx in txs]


# ─────────────────────────────────────────────────────────────
# PURCHASES ONLY
# ─────────────────────────────────────────────────────────────
@router.get(
    "/transactions/purchases",
    summary="Purchase / Stock-Add Transactions Only",
    description="""
## 📦 Purchase Transactions

Only `update`/`add` type transactions, newest first.
`price_per_unit` is the **cost price** per display unit at time of purchase.
""",
)
def get_purchase_transactions(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    txs = db.query(Transaction).filter(
        Transaction.owner_id == user.id,
        func.lower(Transaction.transaction_type).in_(["add", "update"]),
    ).order_by(Transaction.timestamp.desc()).all()
    return [_tx_row(tx) for tx in txs]

# ─────────────────────────────────────────────────────────────
# WRITE-OFFS TRANSACTIONS
# ─────────────────────────────────────────────────────────────
@router.get(
    "/transactions/write-offs",
    summary="Write-Off Transactions Only",
    description="""
## 🗑️ Write-Off Transactions

Only `writeoff` type transactions, newest first.
These carry negative profit representing real business losses.
""",
)
def get_writeoff_transactions(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    txs = db.query(Transaction).filter(
        Transaction.owner_id == user.id,
        func.lower(Transaction.transaction_type) == "writeoff",
    ).order_by(Transaction.timestamp.desc()).all()
    return [_tx_row(tx) for tx in txs]