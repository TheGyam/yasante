"""Account emails: the verification code."""

import logging
from html import escape

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

PINK = "#FF8FB8"


def send_email_code(email, name, code):
    """
    Sends her the six-digit code. True if the mail server took it; False (logged) if
    not, so the app can say so and let her ask again.
    """
    first = (name or "").split(" ")[0] or "there"
    minutes = settings.PHONE_CODE_EXPIRY_SECONDS // 60
    text = (
        f"Hi {first},\n\n"
        f"Your Yasante code is {code}\n\n"
        f"Enter it in the app to confirm this is your email. It works for {minutes} minutes.\n\n"
        "If you didn’t sign up for Yasante, you can ignore this email.\n"
    )
    html = f"""\
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1216">
  <p style="font-size:22px;font-weight:700;margin:0 0 24px;color:{PINK}">yasante</p>
  <p style="font-size:16px;margin:0 0 16px">Hi {escape(first)},</p>
  <p style="font-size:16px;margin:0 0 24px">Here’s your code to confirm this is your email:</p>
  <p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:0 0 24px">{code}</p>
  <p style="font-size:14px;color:#6b5a62;margin:0 0 8px">It works for {minutes} minutes.</p>
  <p style="font-size:14px;color:#6b5a62;margin:0">If you didn’t sign up for Yasante, you can ignore this email.</p>
</div>"""
    message = EmailMultiAlternatives(
        subject=f"{code} is your Yasante code",
        body=text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
    )
    message.attach_alternative(html, "text/html")
    try:
        message.send()
        return True
    except Exception:  # noqa: BLE001 — any mail failure is the same to her: try again
        logger.exception("Couldn't send the email code to %s", email)
        return False
