import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv
import os 
load_dotenv()

EMAIL=os.getenv("SENDER_EMAIL")
PASSWORD=os.getenv("SENDER_PASSWORD")

# def send_otp_email(recipient_email: str, otp: str):
#     msg = MIMEText(f"Your OTP is: {otp}")
#     msg['Subject'] = 'Email Verification'
#     msg['From'] = EMAIL
#     msg['To'] = recipient_email

#     with smtplib.SMTP('smtp.gmail.com', 587) as server:
#         server.starttls()
#         server.login(EMAIL, PASSWORD)
#         server.send_message(msg)

def send_otp_email(recipient_email: str, otp: str):
    msg = MIMEText(f"Your OTP is: {otp}")
    msg['Subject'] = 'Email Verification'
    msg['From'] = EMAIL
    msg['To'] = recipient_email

    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.ehlo()              #  REQUIRED
            server.starttls()
            server.ehlo()              #  REQUIRED again

            server.login(EMAIL, PASSWORD)
            server.send_message(msg)

    except Exception as e:
        print("EMAIL ERROR:", str(e))
        raise