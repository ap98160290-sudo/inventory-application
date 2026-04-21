from pydantic import EmailStr,BaseModel,Field

class EmailRequest(BaseModel):
    email:EmailStr=Field(...,min_length=5)

class OTPVerification(BaseModel):
    email:EmailStr=Field(...,min_length=5)
    otp:str=Field(...,min_length=6,max_length=6)

