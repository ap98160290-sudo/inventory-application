from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer,HTTPAuthorizationCredentials
from jose import  JWTError, jwt
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import User


Secret_Key="secret"
ALGORITHM="HS256"

def create_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, Secret_Key, algorithm=ALGORITHM)

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, Secret_Key, algorithm=ALGORITHM)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    db: Session = Depends(get_db)
):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, Secret_Key, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user=db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

bearer_scheme=HTTPBearer()  

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    # Check blacklist first
    from db.models import TokenBlacklist
    if db.query(TokenBlacklist).filter(TokenBlacklist.token == token).first():
        raise HTTPException(status_code=401, detail="Token has been invalidated. Please log in again.")

    try:
        payload = jwt.decode(token, Secret_Key, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


def is_token_blacklisted(token: str, db: Session) -> bool:
    from db.models import TokenBlacklist
    return db.query(TokenBlacklist).filter(TokenBlacklist.token == token).first() is not None