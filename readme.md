# StockFlow — Inventory OS

> A full-stack inventory management system built for small businesses. Manage stock, record sales, scan barcodes, use voice commands, and track profit/loss — all in one dark-themed dashboard.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Products](#products)
  - [Insights & Analytics](#insights--analytics)
  - [Transactions](#transactions)
- [Unit System](#unit-system)
- [Voice Command Guide](#voice-command-guide)
- [Screenshots](#screenshots)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Barcode Scanning** — Manual entry, image upload, or live camera scan to look up or register products
- **Inventory Management** — Add, update, sell, archive (soft delete), and permanently delete products with full audit trail
- **Voice Commands** — Natural language commands like `"sell 2 kg sugar for 57 rupees"` with fuzzy matching for typos and regional speech patterns
- **Analytics Dashboard** — Monthly profit breakdown charts, top-selling products, write-off summary, and sales trends
- **Transaction History** — Full ledger with tabs for All / Sales / Purchases / Write-offs, searchable and paginated
- **Write-off Tracking** — Record damaged, expired, or freebied stock with reason; deducted from profit automatically
- **Soft Delete / Archive** — Mark products inactive without losing transaction history; hard delete also preserves the ledger via `product_name_snapshot`
- **JWT Authentication** — OTP-based email verification on signup, access + refresh token flow
- **Unit-aware Stock** — All quantities stored in base units (g, ml, pcs) and displayed in user-friendly units (kg, l, dozen, pkt)
- **Weighted Average Cost** — Adding new stock at a different price automatically recalculates the weighted average cost per unit

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Recharts, React Router v6 |
| Styling | Plain CSS with CSS custom properties (dark theme) |
| Backend | FastAPI (Python 3.11+) |
| Database | PostgreSQL 15 (Docker) |
| ORM | SQLAlchemy 2.x |
| Auth | JWT (python-jose), bcrypt, OTP email verification |
| Barcode | ZXing (browser camera), pyzbar (server-side image scan) |
| Containerisation | Docker Compose |

---

## Project Structure

```
stockflow/
│
├── backend/                        # FastAPI application
│   ├── main.py                     # App entry point, CORS, startup migrations
│   ├── db/
│   │   ├── database.py             # SQLAlchemy engine & session
│   │   └── models.py               # ORM models (Product, Transaction, User)
│   ├── router/
│   │   ├── auth_router.py          # /auth — OTP, login, refresh, logout
│   │   ├── product_router.py       # /products — CRUD, scan, sell, voice
│   │   ├── insights_router.py      # /insights — analytics, transactions
│   │   └── chart_router.py         # /charts — chart-specific aggregations
│   ├── services/
│   │   └── product_service.py      # Core business logic (create, sell, delete)
│   ├── schemas/
│   │   ├── product.py              # Pydantic request/response models
│   │   └── auth1.py                # Auth schemas
│   └── utils/
│       ├── auth.py                 # JWT helpers, get_current_user
│       ├── formatter.py            # format_quantity, format_unit_price
│       ├── measurement_unit_converter.py   # Base unit conversions
│       ├── unit_mapper.py          # Unit alias normalisation
│       ├── response.py             # success_response() wrapper
│       ├── otp.py                  # OTP generation
│       └── email_verification.py  # Email sender
│
└── frontend/                       # React / Vite application
    └── src/
        ├── App.jsx                 # Routes
        ├── layout/
        │   ├── Layout.jsx
        │   ├── Sidebar.jsx
        │   └── Topbar.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── Dashboard.jsx
        │   ├── Inventory.jsx
        │   ├── ScanManage.jsx
        │   ├── VoiceCommand.jsx
        │   ├── Chartsinsights.jsx
        │   └── Transactions.jsx
        ├── components/
        │   ├── ProtectedRoute.jsx
        │   └── inventory/
        │       ├── AddProductModal.jsx
        │       ├── EditProductModal.jsx
        │       └── SellProductModal.jsx
        └── services/
            ├── api.jsx             # Axios instance with auth interceptor
            ├── productService.js   # Product API calls
            └── Insightservice.js   # Analytics & transaction API calls
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)
- Python 3.11+
- Node.js 18+
- npm or yarn

---

### Backend Setup

**1. Start PostgreSQL with Docker**

```bash
docker run --name postgres-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -e POSTGRES_DB=stock_db \
  -p 5433:5432 \
  -d postgres:15
```

**2. Clone the repository and install dependencies**

```bash
git clone https://github.com/your-username/stockflow.git
cd stockflow/backend
pip install -r requirements.txt
```

**3. Configure environment variables**

Create a `.env` file in the `backend/` directory (see [Environment Variables](#environment-variables)).

**4. Start the backend**

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

On the first startup, `startup_event()` in `main.py` automatically:
- Creates all database tables
- Runs idempotent SQL migrations (adds columns, makes `product_id` nullable for clean deletes)
- Backfills `product_name_snapshot` on existing transaction rows

You should see this in the terminal output:
```
Database tables created / verified successfully
Startup migrations complete.
```

**5. Explore the API**

Visit [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive Swagger UI.

---

### Frontend Setup

```bash
cd stockflow/frontend
npm install
npm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173) by default.

---

## Environment Variables

Create `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/stock_db

# JWT
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email (for OTP verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## Database Schema

### products

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | Auto-increment |
| `product_id` | varchar | Barcode / user-defined ID |
| `owner_id` | integer FK | References `users.id` |
| `product_name` | varchar | |
| `description` | varchar | |
| `quantity` | float | Stored in **base units** (g, ml, pcs) |
| `unit_of_measure` | varchar | Base unit (g / ml / pcs) |
| `display_unit` | varchar | User-facing unit (kg / l / dozen / pkt) |
| `unit_price` | float | Price **per base unit** (₹/g, ₹/ml, ₹/pcs) |
| `total_price` | float | `quantity × unit_price` |
| `is_active` | boolean | `FALSE` = archived/soft-deleted |
| `aliases` | varchar | Lowercase name for fuzzy search |
| `low_stock_threshold` | float | Alert threshold |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### transactions

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `product_id` | integer FK | References `products.id` — **nullable** (SET NULL on delete) |
| `owner_id` | integer FK | References `users.id` |
| `product_name_snapshot` | varchar | Product name at time of transaction — preserved after deletion |
| `transaction_type` | varchar | `sell` / `add` / `update` / `writeoff` |
| `quantity` | float | In base units |
| `unit` | varchar | Display unit for this transaction |
| `price_per_unit` | float | Per base unit |
| `total_price` | float | Revenue (sell) or cost (add) |
| `profit` | float | Revenue − cost for sell; −cost for writeoff; 0 for add |
| `note` | varchar | Write-off reason (damaged / expired / freebie / stolen / spillage) |
| `timestamp` | timestamp | |

> **Why nullable `product_id`?** When a product is permanently deleted, all its transaction rows have `product_id` set to `NULL`. The `product_name_snapshot` column preserves the product name so the full sales history remains readable in the Transactions page.

---

## API Reference

All endpoints except auth require a Bearer JWT token:
```
Authorization: Bearer <access_token>
```

All successful responses follow this envelope:
```json
{
  "status": "success",
  "message": "...",
  "data": { ... }
}
```

---

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/send_otp` | Send OTP to email for signup/login |
| `POST` | `/auth/verify_otp` | Verify OTP and receive tokens |
| `POST` | `/auth/refresh_token` | Get new access token using refresh token |
| `POST` | `/auth/logout` | Invalidate refresh token |

---

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/products/` | List all products (`?include_inactive=true` to include archived) |
| `POST` | `/products/add` | Register a new product |
| `GET` | `/products/{barcode}` | Get product by barcode |
| `PUT` | `/products/update/{barcode}` | Add stock or update price/name |
| `PUT` | `/products/sell/{barcode}` | Record a sale |
| `POST` | `/products/scan` | Look up product by barcode image |
| `PUT` | `/products/sell_scan` | Sell via scanned barcode image |
| `POST` | `/products/voice_command` | Execute natural language inventory command |
| `GET` | `/products/search` | Search by name / description / alias (`?q=sugar`) |
| `PUT` | `/products/archive/{barcode}` | Soft delete — hides product, keeps all transactions |
| `PUT` | `/products/reactivate/{barcode}` | Restore an archived product |
| `DELETE` | `/products/{barcode}` | Permanent delete (or partial write-off with request body) |

**Add Product — Request Body**
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

**Sell Product — Request Body**
```json
{
  "quantity": 2,
  "unit_of_measure": "kg",
  "selling_price": 57
}
```
> `selling_price` is **per display unit** (₹57/kg), not the total.

**Write-off — Request Body** (DELETE with body)
```json
{
  "quantity": 5,
  "unit_of_measure": "kg",
  "reason": "damaged"
}
```
Write-off reasons: `damaged` · `expired` · `freebie` · `stolen` · `spillage`

---

### Insights & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/insights/dashboard` | Summary KPIs |
| `GET` | `/insights/analytics/profit` | Daily profit breakdown |
| `GET` | `/insights/analytics/profit/monthly` | Monthly profit (net, sell, write-off) |
| `GET` | `/insights/analytics/sales/monthly` | Monthly sales revenue per product |
| `GET` | `/insights/analytics/write-offs` | All-time write-off summary by product |
| `GET` | `/insights/analytics/write-offs/monthly` | Monthly write-off summary |
| `GET` | `/insights/analytics/top-selling-products` | Ranked by total revenue |

---

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/insights/transactions` | All transactions (newest first) |
| `GET` | `/insights/transactions/sales` | Sales only |
| `GET` | `/insights/transactions/purchases` | Stock additions only |
| `GET` | `/insights/transactions/write-offs` | Write-offs only |

---

## Unit System

All quantities are normalised to base units internally. The API response always converts back to display units automatically.

| Display Unit | Base Unit | Factor | Category |
|-------------|-----------|--------|----------|
| `kg` | `g` | × 1000 | weight |
| `g` | `g` | × 1 | weight |
| `l` | `ml` | × 1000 | volume |
| `ml` | `ml` | × 1 | volume |
| `dozen` | `pcs` | × 12 | count |
| `pcs` | `pcs` | × 1 | count |
| `pkt` | `pcs` | × 1 | count |
| `pkg` | `pcs` | × 1 | count |
| `bottles` | `pcs` | × 1 | count |

**Example:** Adding 50 kg sugar at ₹55/kg:
- Stored as: `50,000 g` at `₹0.055/g`
- Displayed as: `50.00 kg` at `₹55/kg`
- Total value: `50,000 × 0.055 = ₹2,750` ✓

---

## Voice Command Guide

The voice command endpoint accepts natural language and uses fuzzy matching to handle typos, speech-to-text errors, and regional phrasing.

**Sell**
```
sell 2 kg sugar for 57
sell two kg sugar for 57 rupees
cell 5 pcs soap at 30        ← "cell" auto-corrected to "sell"
```

**Add / Restock**
```
add 10 kg sugar
restock 5 litres oil         ← "restock" maps to update
refill twenty five pcs soap  ← two-token number parsed
```

**Write-off / Delete**
```
delete sugar
delete 5 kg sugar            ← partial write-off
damaged two dozen eggs       ← "damaged" maps to delete/write-off
```

**Supported quantity words:** one–nineteen, twenty–ninety, hundred, thousand, half, quarter, and two-token combos like `twenty five`, `thirty two`.

**Supported unit aliases:** kilograms → kg, litres → l, pieces/units/nos → pcs, packet/pouch → pkt, doz/twelve → dozen, bottles → bottle.

---

## Screenshots

| Dashboard | Inventory |
|-----------|-----------|
| KPI cards, stock value, low stock alerts | Filterable table with sell/edit/archive/delete actions |

| Charts & Insights | Transactions |
|-------------------|-------------|
| Monthly profit bar chart, top selling, write-off summary | Full ledger with All/Sales/Purchases/Write-offs tabs |

| Voice Command | Scan & Manage |
|---------------|---------------|
| Mic + manual text input with fuzzy correction | Manual, image, and camera barcode modes |

---

## Known Limitations

- Camera barcode scanning requires HTTPS in production (browser security restriction on `getUserMedia`)
- Voice command supports English and common Hinglish terms; regional languages beyond basic words are not supported
- OTP email requires a valid SMTP configuration; disable email verification in dev by commenting out the OTP check in `auth_router.py`
- No multi-user roles yet — every registered user has their own isolated inventory (owner-scoped queries)
- The ghost-delete fallback (products renamed to `__ghost__xxx`) only triggers if the startup migration hasn't run yet; after migration it is never reached

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please keep pull requests focused — one feature or fix per PR.


<div align="center">
  Built with FastAPI + React · Dark theme · Made for Indian small businesses 🇮🇳
</div>