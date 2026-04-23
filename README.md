# StockFlow — Inventory OS

> A full-stack inventory management system built for small businesses. Manage stock, record sales, scan barcodes, use voice commands, and track profit/loss — all in one dark-themed dashboard.

![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start — Docker (Recommended)](#quick-start--docker-recommended)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Unit System](#unit-system)
- [Voice Command Guide](#voice-command-guide)
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
- **Fully Dockerized** — One command brings up the entire stack: Postgres, FastAPI, and React/Nginx

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Recharts, React Router v6 |
| Styling | Plain CSS with CSS custom properties (dark theme) |
| Backend | FastAPI (Python 3.11+) |
| Database | PostgreSQL 15 |
| ORM | SQLAlchemy 2.x |
| Auth | JWT (python-jose), bcrypt, OTP email verification |
| Barcode | ZXing (browser camera), pyzbar (server-side image scan) |
| Web Server | Nginx (serves React build, proxies API calls) |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
inventory_application/
│
├── backend/                            # FastAPI application
│   ├── Dockerfile.backend              # Backend container definition
│   ├── main.py                         # App entry point, CORS, startup migrations
│   ├── requirements.txt
│   ├── db/
│   │   ├── database.py                 # SQLAlchemy engine & session (reads DATABASE_URL env var)
│   │   └── models.py                   # ORM models: Product, Transaction, User
│   ├── router/
│   │   ├── auth_router.py              # /auth  — OTP, login, refresh, logout
│   │   ├── product_router.py           # /products — CRUD, scan, sell, voice
│   │   ├── insights_router.py          # /insights — analytics, transactions
│   │   └── chart_router.py             # /charts — chart-specific aggregations
│   ├── services/
│   │   └── product_service.py          # Core business logic (create, sell, delete)
│   ├── schemas/
│   │   ├── product.py                  # Pydantic request/response models
│   │   └── auth1.py                    # Auth schemas
│   ├── barcode/                        # Barcode scanning utilities
│   └── utils/
│       ├── auth.py                     # JWT helpers, get_current_user
│       ├── formatter.py                # format_quantity, format_unit_price
│       ├── measurement_unit_converter.py
│       ├── unit_mapper.py              # Unit alias normalisation
│       ├── response.py                 # success_response() wrapper
│       ├── otp.py                      # OTP generation
│       └── email_verification.py      # Email sender
│
├── frontend/                           # React / Vite application
│   ├── Dockerfile.frontend             # Frontend container (builds React, serves via Nginx)
│   ├── nginx.conf                      # Nginx config: SPA routing + API proxy
│   ├── package.json
│   └── src/
│       ├── App.jsx                     # Routes
│       ├── layout/
│       │   ├── Layout.jsx
│       │   ├── Sidebar.jsx
│       │   └── Topbar.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Inventory.jsx
│       │   ├── ScanManage.jsx
│       │   ├── VoiceCommand.jsx
│       │   ├── Chartsinsights.jsx
│       │   └── Transactions.jsx
│       ├── components/
│       │   ├── ProtectedRoute.jsx
│       │   └── inventory/
│       │       ├── AddProductModal.jsx
│       │       ├── EditProductModal.jsx
│       │       └── SellProductModal.jsx
│       └── services/
│           ├── api.jsx                 # Axios instance with auth interceptor
│           ├── productService.js       # Product API calls
│           └── Insightservice.js       # Analytics & transaction API calls
│
├── docker-compose.yml                  # Development stack
├── docker-compose-prod.yml             # Production stack (uses pre-built Docker Hub images)
├── .env                                # Your local secrets (never commit this)
├── .env.example                        # Template — copy to .env and fill in values
├── .dockerignore
├── .gitignore
└── readme.md
```

---

## Quick Start — Docker (Recommended)

This is the fastest way to get the full app running. You only need **Docker Desktop** installed — no Python, Node, or Postgres setup required.

### Option A — Production (Pre-built images from Docker Hub)

If you just want to run the app without building anything:

**1. Clone the repository**
```bash
git clone https://github.com/ap98160290-sudo/inventory-application.git
cd inventory-application
```

**2. Set up environment variables**
```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Now open `.env` and fill in your values — at minimum set `SENDER_EMAIL`, `SENDER_PASSWORD`, and a strong `SECRET_KEY` (see [Environment Variables](#environment-variables)).

**3. Start the stack**
```bash
docker-compose -f docker-compose-prod.yml up -d
```

**4. Open the app**

| Service | URL |
|---------|-----|
| 🌐 Frontend | http://localhost |
| ⚡ Backend API | http://localhost:8000 |
| 📖 Swagger UI | http://localhost:8000/docs |

**5. Stop the stack**
```bash
docker-compose -f docker-compose-prod.yml down
```

---

### Option B — Development (Build from source)

Use this if you want to make code changes and build the images yourself.

**1. Clone and configure**
```bash
git clone https://github.com/ap98160290-sudo/inventory-application.git
cd inventory-application
cp .env.example .env   # then edit .env with your values
```

**2. Build and start all services**
```bash
docker-compose up --build
```

Docker Compose starts everything in the correct order:
1. **PostgreSQL** starts first and waits until healthy (`pg_isready`)
2. **FastAPI backend** starts, runs automatic DB migrations, then serves on port `8000`
3. **React frontend** (built with Nginx) starts and serves on port `80`

On first startup you'll see:
```
stockflow-backend  | Database tables created / verified successfully
stockflow-backend  | Startup migrations complete.
stockflow-backend  | INFO: Application startup complete.
```

**3. Run in detached mode (background)**
```bash
docker-compose up --build -d
```

**4. View logs**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

**5. Stop and remove containers**
```bash
# Stop (keeps data volume)
docker-compose down

# Stop and delete all data including the database volume
docker-compose down -v
```

**6. Rebuild after code changes**
```bash
docker-compose up --build
```

---

### What Docker Compose sets up

```
┌─────────────────────────────────────────────────────┐
│                 Docker Network: stockflow-net         │
│                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌────────┐ │
│  │   Nginx :80  │───▶│  FastAPI     │───▶│  PG    │ │
│  │  (frontend)  │    │  :8000       │    │  :5432 │ │
│  │  React SPA   │    │  (backend)   │    │  (db)  │ │
│  └──────────────┘    └──────────────┘    └────────┘ │
└─────────────────────────────────────────────────────┘

Host ports exposed:
  :80   → frontend (React app)
  :8000 → backend  (FastAPI / Swagger)
  :5434 → postgres (for direct DB access with a client like DBeaver)
```

Nginx handles two jobs in one container: serves the React build as static files, and proxies any `/api/*` requests to the FastAPI backend — so the browser never hits cross-origin issues in production.

---

## Local Development Setup

Only use this if you want hot-reload for both frontend and backend without Docker.

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL running (you can use the Docker db service: `docker-compose up db`)

### Backend

```bash
cd backend
pip install -r requirements.txt

# Set env vars (PowerShell)
$env:DATABASE_URL = "postgresql://postgres:postgres123@localhost:5434/stock_db"
$env:SECRET_KEY   = "your-secret-key"

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

> In local dev, the frontend `.env` or `vite.config.js` should point `VITE_API_BASE_URL` to `http://localhost:8000`.

---

## Environment Variables

The `.env` file lives in the **root** of the project (next to `docker-compose.yml`). Docker Compose reads it automatically and injects values into each container.

```env
# ── PostgreSQL ────────────────────────────────────────────────────────────────
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=stock_db

# ── Database URL (FastAPI uses this inside Docker) ────────────────────────────
# "db" is the Docker Compose service name — DNS resolves automatically
DATABASE_URL=postgresql://postgres:postgres123@db:5432/stock_db

# ── JWT — generate with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-64-char-random-string-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# ── Email / OTP (Gmail App Password recommended) ─────────────────────────────
# https://support.google.com/accounts/answer/185833
SENDER_EMAIL=your-email@gmail.com
SENDER_PASSWORD=your-16-char-app-password

# ── Frontend build-time variable ──────────────────────────────────────────────
VITE_API_BASE_URL=http://localhost:8000
```

> **Never commit your `.env` file.** It is already in `.gitignore`. Commit only `.env.example` with placeholder values.

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
| `is_active` | boolean | `FALSE` = archived / soft-deleted |
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
| `product_name_snapshot` | varchar | Product name preserved after deletion |
| `transaction_type` | varchar | `sell` / `add` / `update` / `writeoff` |
| `quantity` | float | In base units |
| `unit` | varchar | Display unit for this transaction |
| `price_per_unit` | float | Per base unit |
| `total_price` | float | Revenue (sell) or cost (add) |
| `profit` | float | Revenue − cost for sell; −cost for writeoff; 0 for add |
| `note` | varchar | Write-off reason (damaged / expired / freebie / stolen / spillage) |
| `timestamp` | timestamp | |

> **Why nullable `product_id`?** When a product is permanently deleted, its transaction rows have `product_id` set to `NULL` via `ON DELETE SET NULL`. The `product_name_snapshot` column preserves the product name so the full sales history stays readable.

> **Auto-migrations:** On every startup, `main.py` runs idempotent `ALTER TABLE ... IF NOT EXISTS` statements via SQLAlchemy. No Alembic or manual migration commands needed — just restart the container.

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

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/send_otp` | Send OTP to email for signup/login |
| `POST` | `/auth/verify_otp` | Verify OTP and receive access + refresh tokens |
| `POST` | `/auth/refresh_token` | Get new access token using refresh token |
| `POST` | `/auth/logout` | Invalidate refresh token |

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/products/` | List all products (`?include_inactive=true` for archived) |
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

**Add Product**
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

**Sell Product**
```json
{
  "quantity": 2,
  "unit_of_measure": "kg",
  "selling_price": 57
}
```
> `selling_price` is **per display unit** (₹57/kg), not the total.

**Write-off** (DELETE with body)
```json
{
  "quantity": 5,
  "unit_of_measure": "kg",
  "reason": "damaged"
}
```
Reasons: `damaged` · `expired` · `freebie` · `stolen` · `spillage`

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

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/insights/transactions` | All transactions (newest first) |
| `GET` | `/insights/transactions/sales` | Sales only |
| `GET` | `/insights/transactions/purchases` | Stock additions only |
| `GET` | `/insights/transactions/write-offs` | Write-offs only |

---

## Unit System

All quantities are normalised to base units internally. API responses always convert back to display units automatically.

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
- Stored as `50,000 g` at `₹0.055/g`
- Displayed as `50.00 kg` at `₹55/kg`
- Total value: `50,000 × 0.055 = ₹2,750` ✓

---

## Voice Command Guide

The voice command endpoint accepts natural language and uses fuzzy matching for typos, speech-to-text errors, and regional phrasing.

**Sell**
```
sell 2 kg sugar for 57
sell two kg sugar for 57 rupees
cell 5 pcs soap at 30        ← "cell" auto-corrected to "sell"
shell two dozen egg for 120  ← "shell" auto-corrected
```

**Add / Restock**
```
add 10 kg sugar
restock 5 litres oil         ← "restock" maps to update
refill twenty five pcs soap  ← two-token spoken number parsed
```

**Write-off / Delete**
```
delete sugar
delete 5 kg sugar            ← partial write-off
damaged two dozen eggs       ← "damaged" maps to write-off
```

**Supported quantities:** one–nineteen, twenty–ninety, hundred, thousand, half, quarter, and two-token combos like `twenty five`, `forty five`.

**Supported unit aliases:** kilograms → kg, litres → l, pieces/units/nos → pcs, packet/pouch → pkt, doz/twelve → dozen, bottles → bottle.

---

## Known Limitations

- Camera barcode scanning requires HTTPS in production (browser `getUserMedia` restriction)
- Voice commands support English and common Hinglish terms; full regional language support is not implemented
- OTP email requires valid SMTP credentials; for dev testing you can temporarily bypass the OTP check in `auth_router.py`
- No multi-user roles yet — every registered user has their own fully isolated inventory (all queries are owner-scoped)
- The `__ghost__` delete fallback only triggers if the startup DB migration hasn't run yet; after the first successful startup it is never reached

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please keep pull requests focused — one feature or fix per PR.

---


<div align="center">
  Built with FastAPI + React · Fully Dockerized · Made for Indian small businesses 🇮🇳
</div>
