# # import email

# from fastapi import APIRouter, Depends, HTTPException
# from jose import jwt
# from sqlalchemy.orm import Session
# from db.database import get_db
# from schemas import auth1
# from schemas.auth1 import EmailRequest, OTPVerification  
# from db.models import OTP, User
# from utils import otp
# from utils.auth import ALGORITHM, Secret_Key, create_refresh_token, create_token
# from utils.otp import generate_otp
# from datetime import datetime, timedelta
# from utils.email_verification import send_otp_email


# router = APIRouter(prefix="/auth", tags=["Authentication"])
# @router.post("/send_otp")
# def send_otp(data: EmailRequest, db: Session = Depends(get_db)):
#     otp= generate_otp()
#     expiry = datetime.utcnow() + timedelta(minutes=5)

#     # delete existing OTP for the user if any
#     db.query(OTP).filter(OTP.email == data.email).delete()

#     #store new OTP
#     new_otp = OTP(email=data.email, otp=otp, expires_at=expiry)
#     db.add(new_otp)
#     db.commit()
#     send_otp_email(data.email, otp)
#     return {"message": "OTP sent to email"}


# @router.post("/verify_otp")
# def verify_otp(data: OTPVerification, db: Session = Depends(get_db)):
#     record = db.query(OTP).filter(OTP.email == data.email).first()
#     if not record:
#         raise HTTPException(404, "User not found")
    
#     if record.otp != data.otp or datetime.utcnow() > record.expires_at:
#         raise HTTPException(400, "Invalid or expired OTP")
    
#     # Mark user as verified and delete OTP record
#     db.delete(record)
#     user = db.query(User).filter(User.email == data.email).first()
#     if not user:
#         user = User(email=data.email, is_verified=True)
#         db.add(user)
#     else:
#         user.is_verified = True
#     db.commit()
#     db.refresh(user)
#     access_token= create_token({"user_id": user.id})
#     refresh_token = create_refresh_token({"user_id": user.id})
#     return {"message": "Email verified successfully", "access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


# @router.post("/refresh_token")
# def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
#     try:
#         payload = jwt.decode(refresh_token, Secret_Key, algorithms=[ALGORITHM])
#         user_id = payload.get("user_id")

#         if user_id is None:
#             raise HTTPException(status_code=401, detail="Invalid token")

#         user = db.query(User).filter(User.id == user_id).first()
#         if not user:
#             raise HTTPException(status_code=404, detail="User not found")

#         new_access_token = create_token({"user_id": user.id})

#         return {
#             "access_token": new_access_token,
#             "token_type": "bearer"
#         }

#     except:
#         raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from db.database import get_db
from schemas.auth1 import EmailRequest, OTPVerification
from db.models import OTP, TokenBlacklist, User
from utils.auth import ALGORITHM, Secret_Key, create_refresh_token, create_token
from utils.otp import generate_otp
from datetime import datetime, timedelta
from utils.email_verification import send_otp_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ---------------- SEND OTP ----------------

@router.post(
    "/send_otp",
    summary="Send OTP to Email",
    description="""
## 📧 Send a One-Time Password (OTP) to the User's Email

Generates a 6-digit OTP, stores it with a 5-minute expiry, and sends it
to the provided email address. This is the first step of the login / registration flow.

---

### Request Body:
```json
{
  "email": "user@example.com"
}
```

---

### Response:
```json
{
  "message": "OTP sent to email"
}
```

---

### Flow:
1. Call this endpoint with your email
2. Check your inbox for the OTP (also check spam)
3. Call `POST /auth/verify_otp` with the email + OTP to get your access token

---

### Notes:
- Any previously issued OTP for this email is **invalidated** immediately
  when a new one is requested — only the latest OTP is valid
- OTP expires after **5 minutes** — call this endpoint again to get a fresh one
- There is no separate register endpoint — new users are automatically created
  on first successful OTP verification

---

### Common Errors:
| Code | Reason                                      |
|------|---------------------------------------------|
| 422  | Invalid or missing email in request body    |
| 500  | Email delivery failure (check SMTP config)  |
""",
)
# def send_otp(data: EmailRequest, db: Session = Depends(get_db)):
#     otp = generate_otp()
#     expiry = datetime.utcnow() + timedelta(minutes=5)

#     # Invalidate any existing OTP for this email
#     db.query(OTP).filter(OTP.email == data.email).delete()

#     # Store new OTP
#     new_otp = OTP(email=data.email, otp=otp, expires_at=expiry)
#     db.add(new_otp)
#     db.commit()

#     send_otp_email(data.email, otp)
#     return {"message": "OTP sent to email"}

def send_otp(data: EmailRequest, db: Session = Depends(get_db)):
    otp = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=5)

    db.query(OTP).filter(OTP.email == data.email).delete()

    new_otp = OTP(email=data.email, otp=otp, expires_at=expiry)
    db.add(new_otp)
    db.commit()

    try:
        send_otp_email(data.email, otp)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to send email")

    return {"message": "OTP sent to email"}


# ---------------- VERIFY OTP ----------------

@router.post(
    "/verify_otp",
    summary="Verify OTP and Get Access Token",
    description="""
## ✅ Verify OTP — Login or Register

Verifies the OTP sent to the user's email. On success, returns a JWT access token
and a refresh token. This endpoint handles both **new users** (auto-registration)
and **returning users** (login).

---

### Request Body:
```json
{
  "email": "user@example.com",
  "otp": "482931"
}
```

---

### Response:
```json
{
  "message": "Email verified successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

### How to use the token:
Include the `access_token` in the `Authorization` header for all protected endpoints:
```
Authorization: Bearer <access_token>
```

---

### Token Lifetimes:
| Token           | Lifetime   | How to renew                        |
|-----------------|------------|-------------------------------------|
| `access_token`  | Short (minutes/hours) | Call `POST /auth/refresh_token` |
| `refresh_token` | Long (days) | Re-verify OTP to get a new one     |

---

### Common Errors:
| Code | Reason                                           |
|------|--------------------------------------------------|
| 404  | No OTP found for this email — call send_otp first |
| 400  | OTP is wrong or has expired (5-minute window)    |
| 422  | Missing email or OTP in request body             |
""",
)
def verify_otp(data: OTPVerification, db: Session = Depends(get_db)):
    record = db.query(OTP).filter(OTP.email == data.email).first()

    if not record:
        raise HTTPException(
            404,
            "No OTP found for this email. "
            "Please call POST /auth/send_otp first to request a new OTP.",
        )

    if record.otp != data.otp or datetime.utcnow() > record.expires_at:
        raise HTTPException(
            400,
            "Invalid or expired OTP. "
            "OTPs are valid for 5 minutes only. "
            "Call POST /auth/send_otp to request a fresh OTP.",
        )

    # OTP is valid — remove it so it cannot be reused
    db.delete(record)

    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # New user — auto-register
        user = User(email=data.email, is_verified=True)
        db.add(user)
    else:
        user.is_verified = True

    db.commit()
    db.refresh(user)

    access_token = create_token({"user_id": user.id})
    refresh_token = create_refresh_token({"user_id": user.id})

    return {
        "message": "Email verified successfully",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# ---------------- REFRESH TOKEN ----------------

@router.post(
    "/refresh_token",
    summary="Refresh Access Token",
    description="""
## 🔄 Refresh an Expired Access Token

Use this endpoint when your `access_token` has expired.
Pass your `refresh_token` to get a new `access_token` without re-verifying your email.

---

### Query Parameter:
| Param           | Type   | Required | Description                  |
|-----------------|--------|----------|------------------------------|
| `refresh_token` | string | ✅ Yes   | The refresh token from login |

---

### Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

### How to use the new token:
Replace the old `access_token` in your `Authorization` header:
```
Authorization: Bearer <new_access_token>
```

---

### Token Strategy:
1. On login (`verify_otp`) you receive both an `access_token` and a `refresh_token`
2. Use the `access_token` for all API calls
3. When the `access_token` expires, call this endpoint with your `refresh_token`
4. If the `refresh_token` has also expired, call `POST /auth/send_otp` to log in again

---

### Common Errors:
| Code | Reason                                                    |
|------|-----------------------------------------------------------|
| 401  | Refresh token is invalid, tampered with, or expired       |
| 404  | User associated with the token no longer exists           |
""",
)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(refresh_token, Secret_Key, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token — user_id claim missing.",
            )

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found. The account may have been deleted.",
            )

        new_access_token = create_token({"user_id": user.id})

        return {
            "access_token": new_access_token,
            "token_type": "bearer",
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token. "
            "Please log in again via POST /auth/send_otp.",
        )





bearer_scheme = HTTPBearer()


@router.post(
    "/logout",
    summary="Logout — Invalidate Access Token",
    description="""
## 🔒 Logout

Invalidates the current access token by adding it to a blacklist.
After calling this endpoint the token cannot be used for any further API calls.

---

### How to call:
Include the access token in the Authorization header as usual:
```
Authorization: Bearer <access_token>
```

---

### Response:
```json
{ "message": "Logged out successfully" }
```

---

### Notes:
- The refresh token is NOT invalidated server-side (it lives only in the client).
  Clear it from `localStorage` on the frontend after calling this endpoint.
- To fully log out, the frontend should:
  1. Call `POST /auth/logout`
  2. Delete `access_token` and `refresh_token` from localStorage
  3. Redirect to the login page
""",
)
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    # Validate the token is a real JWT before blacklisting
    try:
        jwt.decode(token, Secret_Key, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Check if already blacklisted
    already = db.query(TokenBlacklist).filter(TokenBlacklist.token == token).first()
    if not already:
        db.add(TokenBlacklist(token=token))
        db.commit()

    return {"message": "Logged out successfully"}


# ── utils/auth.py — update get_current_user to check blacklist ───────────────
"""
IMPORTANT: Update your existing get_current_user dependency to check the
blacklist BEFORE accepting a token:

"""