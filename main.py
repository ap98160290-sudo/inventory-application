from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text

from router.product_router import router as product_router
from router.auth_router import router as auth_router
from db import models  # Ensure models are imported to create tables
from db.database import Base, engine
from router.insights_router import router as insight_router
from router.chart_router import router as chart_router

app = FastAPI(title="Inventory API Updating Stocks Via Barcode Scanning")
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(product_router)
app.include_router(insight_router)
app.include_router(chart_router)


@app.on_event("startup")
def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created / verified successfully")
    except SQLAlchemyError as e:
        print(f"Database connection failed: {e}")

    # ── Safe idempotent migrations ─────────────────────────────────────────────
    # These run on every startup. Every statement is guarded so they silently
    # skip if already applied. No Alembic needed.
    #
    # WHY MIGRATION #4 IS CRITICAL:
    #   Without it, transactions.product_id is still NOT NULL in Postgres.
    #   Every delete therefore crashes and falls back to ghost-delete, which:
    #     - Creates duplicate write-off entries on each retry
    #     - Leaves phantom __ghost__ products visible in the inactive filter
    #     - Inflates write-off totals by 2x-5x the real value
    # ──────────────────────────────────────────────────────────────────────────
    MIGRATIONS = [
        # 1. Write-off reason column
        "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS note VARCHAR;",

        # 2. Product name snapshot — preserves name after product is deleted
        "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS product_name_snapshot VARCHAR;",

        # 3. Soft-delete flag on products
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",

        # 4. THE CRITICAL FIX — make product_id nullable so hard-delete works.
        #    This drops the NOT NULL constraint while keeping the FK relationship.
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name  = 'transactions'
                  AND column_name = 'product_id'
                  AND is_nullable = 'NO'
            ) THEN
                ALTER TABLE transactions ALTER COLUMN product_id DROP NOT NULL;
                RAISE NOTICE 'transactions.product_id is now nullable — clean hard-delete enabled.';
            END IF;
        END $$;
        """,

        # 5. Backfill product_name_snapshot for transactions created before
        #    this column was added
        """
        UPDATE transactions t
        SET    product_name_snapshot = p.product_name
        FROM   products p
        WHERE  t.product_id = p.id
          AND  t.product_name_snapshot IS NULL;
        """,
    ]

    with engine.connect() as conn:
        for sql in MIGRATIONS:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception as migration_err:
                print(f"[startup migration] skipped (safe): {migration_err}")

    print("Startup migrations complete.")


@app.get("/")
def read_root():
    return {"message": "Welcome to the Inventory API"}


@app.exception_handler(HTTPException)
async def custom_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status":      "error",
            "status_code": exc.status_code,
            "message":     exc.detail,
            "data":        None,
        }
    )


@app.exception_handler(SQLAlchemyError)
async def sql_exception_handler(request: Request, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=500,
        content={
            "status":      "error",
            "status_code": 500,
            "message":     "Database error occurred",
            "data":        None,
        }
    )