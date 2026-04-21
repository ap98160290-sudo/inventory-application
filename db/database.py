from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker,declarative_base
from dotenv import load_dotenv
import os
load_dotenv()
#fetching the url using os.getenv()
SQLALCHEMY_DATABASE_URL=os.getenv("Database_URL")
# Optional safety check so your app crashes immediately if the .env is missing
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("No DATABASE_URL found in .env file")
engine=create_engine(SQLALCHEMY_DATABASE_URL) #actual db connection.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base() #parent class for all our models.


from sqlalchemy.exc import OperationalError
# Dependency function to get a database conection for each request.
def get_db():
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
