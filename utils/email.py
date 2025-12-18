import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import streamlit as st
import os

def send_unlock_email(graduate_email, app_url):
    if os.path.exists("data/email_sent.txt"):
        return

    try:
        secrets = st.secrets["email"]
    except:
        st.error("Email secrets not configured.")
        return

    msg = MIMEMultipart()
    msg["From"] = secrets.sender_email
    msg["To"] = graduate_email
    msg["Subject"] = "🎓 Your Graduation Time Capsule is OPEN!"

    body = f"""
    Dear Graduate,

    The moment you've been waiting for has arrived! 🎉

    Your friends and family left secret messages and created a beautiful photo mosaic just for you.

    Open your Time Capsule now:
    {app_url}

    This is a once-in-a-lifetime memory — enjoy every message and smile!

    With love,
    Your Graduation Party Team ❤️
    """

    msg.attach(MIMEText(body, "plain"))

    try:
        server = smtplib.SMTP(secrets.smtp_server, secrets.smtp_port)
        server.starttls()
        server.login(secrets.sender_email, secrets.sender_password)
        server.sendmail(secrets.sender_email, graduate_email, msg.as_string())
        server.quit()

        os.makedirs("data", exist_ok=True)
        with open("data/email_sent.txt", "w") as f:
            f.write("sent")
        st.success("Unlock notification sent!")
    except Exception as e:
        st.error(f"Email failed: {e}")