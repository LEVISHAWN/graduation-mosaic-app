import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional


def _load_email_config():
    """Load SMTP config from environment variables.

    Required env vars:
      SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SENDER_EMAIL

    Returns a dict with keys: host, port, user, password, sender_email, sender_name
    """
    try:
        host = os.environ['SMTP_HOST']
        port = int(os.environ.get('SMTP_PORT', '587'))
        user = os.environ['SMTP_USER']
        password = os.environ['SMTP_PASS']
        sender_email = os.environ.get('SENDER_EMAIL', user)
        sender_name = os.environ.get('SENDER_NAME', '')
    except KeyError as e:
        raise RuntimeError(f"Missing email configuration environment variable: {e}")

    return {
        'host': host,
        'port': port,
        'user': user,
        'password': password,
        'sender_email': sender_email,
        'sender_name': sender_name,
    }


def send_unlock_email(graduate_email: str, app_url: str, messages: Optional[List[str]] = None, force: bool = False) -> bool:
    """Send an unlock notification email to the graduate including unlocked messages.

    - graduate_email: recipient address
    - app_url: link to the app (where the graduate can read messages)
    - messages: optional list of message strings to include in the email body
    - force: if False, the function will not resend if data/email_sent.txt exists

    Returns True on success, raises an exception on failure.
    """
    data_flag = os.path.join('data', 'email_sent.txt')
    if not force and os.path.exists(data_flag):
        # already sent
        return False

    cfg = _load_email_config()

    msg = MIMEMultipart('alternative')
    from_header = cfg['sender_email']
    if cfg.get('sender_name'):
        from_header = f"{cfg['sender_name']} <{cfg['sender_email']}>"

    msg['From'] = from_header
    msg['To'] = graduate_email
    msg['Subject'] = os.environ.get('EMAIL_SUBJECT', '🎓 Your Graduation Time Capsule is OPEN!')

    # Plain text body
    plain_lines = [
        "Dear Graduate,",
        "",
        "The moment you've been waiting for has arrived! 🎉",
        "",
    ]
    if messages:
        plain_lines.append("The following messages were unlocked for you:\n")
        for i, m in enumerate(messages, 1):
            plain_lines.append(f"{i}. {m}\n")

    plain_lines.extend(["", "Open your Time Capsule here:", app_url, "", "With love,", "Your Graduation Party Team ❤️"])
    plain_body = "\n".join(plain_lines)

    # HTML body (simple formatting)
    html = ["<html><body>", f"<p>Dear Graduate,</p>", "<p>The moment you've been waiting for has arrived! 🎉</p>"]
    if messages:
        html.append("<p>The following messages were unlocked for you:</p>")
        html.append('<ol>')
        for m in messages:
            # escape minimal HTML
            safe = (m.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))
            html.append(f"<li>{safe}</li>")
        html.append('</ol>')

    html.append(f"<p><a href=\"{app_url}\">Open your Time Capsule</a></p>")
    html.append("<p>With love,<br/>Your Graduation Party Team ❤️</p>")
    html.append("</body></html>")
    html_body = '\n'.join(html)

    msg.attach(MIMEText(plain_body, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    # Send via SMTP
    try:
        if cfg['port'] == 465:
            server = smtplib.SMTP_SSL(cfg['host'], cfg['port'])
        else:
            server = smtplib.SMTP(cfg['host'], cfg['port'])
            server.ehlo()
            server.starttls()

        server.login(cfg['user'], cfg['password'])
        server.sendmail(cfg['sender_email'], [graduate_email], msg.as_string())
        server.quit()

        os.makedirs('data', exist_ok=True)
        with open(data_flag, 'w') as f:
            f.write('sent')
        return True
    except Exception as e:
        # do not swallow exception — let the caller handle/log it
        raise