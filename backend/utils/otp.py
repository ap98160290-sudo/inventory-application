import random

def generate_otp(length=6):
    """Generates a random OTP of specified length."""
    digits = "0123456789"
    otp = "".join(random.choice(digits) for _ in range(length))
    return otp