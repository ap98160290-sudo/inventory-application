# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker,declarative_base
# from dotenv import load_dotenv
# import os
# load_dotenv()

# SQLALCHEMY_DATABASE_URL=os.getenv("Database_URL")
# 
# if not SQLALCHEMY_DATABASE_URL:
#     raise ValueError("No DATABASE_URL found in .env file")
# engine=create_engine(SQLALCHEMY_DATABASE_URL) #actual db connection.
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Base = declarative_base() 


# from sqlalchemy.exc import OperationalError
# # Dependency function to get a database conection for each request.
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     except OperationalError:
#         db.rollback()
#     except Exception:
#         db.rollback()
#         raise
#     finally:
#         db.close()
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError

# ── How this works in Docker vs local dev ────────────────────────────────────
#
# In Docker (docker-compose up):
#   docker-compose.yml injects DATABASE_URL directly as an OS environment
#   variable into the container. os.getenv() reads it instantly — no .env
#   file parsing needed. The .env file mounted at /app/.env is irrelevant
#   because Compose already resolved the variables before the container starts.
#
# In local dev (uvicorn main:app --reload):
#   No Docker injection, so os.getenv() falls back to the hardcoded localhost
#   string below.
#
# NEVER raise ValueError here — crashing at import time gives a confusing
# traceback that hides the real problem.
# ─────────────────────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres123@localhost:5433/stock_db"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    except OperationalError:
        db.rollback()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()