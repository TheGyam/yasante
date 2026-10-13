"""
Account emails. Built from tables with inline styles, the only layout every mail app
(Gmail, Outlook, Apple Mail) draws the same way, with a plain-text copy alongside.
"""

import logging
from html import escape

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

PINK = "#FF8FB8"
INK = "#0B0709"
SOFT = "#6E5C65"
PAPER = "#FFF7FA"
# The app icon, hosted with the site (web/public/email-icon.png): mail apps need a full address.
ICON = "https://yasante.com/static/site/email-icon.png"


def _page(preheader, body):
    """The frame every Yasante email shares: a quiet page, the wordmark, a card."""
    return f"""\
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Yasante</title>
</head>
<body style="margin:0;padding:0;background:{PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{PAPER};">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
      <tr><td align="center" style="padding:0 0 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:44px;height:44px;vertical-align:middle;"><img src="{ICON}" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border:0;border-radius:10px;"></td>
          <td style="padding-left:10px;font-family:Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:{INK};letter-spacing:-0.3px;">yasante</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#FFFFFF;border-radius:24px;padding:36px 32px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{INK};box-shadow:0 1px 3px rgba(11,7,9,0.06);">
        {body}
      </td></tr>
      <tr><td align="center" style="padding:28px 24px 0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:{SOFT};">
        Yasante — find a style you love, book the stylist who can do it,<br>and look after your hair in between.<br><br>
        <a href="https://yasante.com" style="color:{SOFT};text-decoration:underline;">yasante.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


def send_email_code(email, name, code):
    """
    Sends her the six-digit code. True if the mail server took it; False (logged) if
    not, so the app can say so and let her ask again.
    """
    first = (name or "").split(" ")[0] or "there"
    minutes = settings.VERIFICATION_CODE_EXPIRY_SECONDS // 60
    spaced = f"{code[:3]} {code[3:]}"

    text = (
        f"Hi {first},\n\n"
        "Welcome to Yasante! We're so glad you're here.\n\n"
        "To finish setting up your account, pop this code into the app:\n\n"
        f"    {spaced}\n\n"
        f"It's good for the next {minutes} minutes.\n\n"
        "Once you're in, you can explore looks from people with hair like yours, save the "
        "styles you love, and book stylists near you.\n\n"
        "Didn't sign up? You can safely ignore this email. Nobody can use your address "
        "without this code.\n\n"
        "With love,\nThe Yasante team\n"
        "https://yasante.com\n"
    )

    body = f"""\
<p style="margin:0 0 8px;font-size:15px;color:{SOFT};">Hi {escape(first)},</p>
<h1 style="margin:0 0 16px;font-size:26px;line-height:32px;font-weight:700;letter-spacing:-0.4px;color:{INK};">Welcome to Yasante 💗</h1>
<p style="margin:0 0 28px;font-size:16px;line-height:24px;color:{INK};">We’re so glad you’re here. To finish setting up your account, pop this code into the app:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:{PAPER};border:1px solid #FFE0EC;border-radius:18px;padding:22px 12px;">
  <span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:{INK};">{spaced}</span>
</td></tr></table>
<p style="margin:14px 0 28px;font-size:13px;line-height:20px;color:{SOFT};text-align:center;">It’s good for the next {minutes} minutes.</p>
<p style="margin:0 0 24px;font-size:16px;line-height:24px;color:{INK};">Once you’re in, you can explore looks from people with hair like yours, save the styles you love, and book stylists near you.</p>
<p style="margin:0 0 28px;font-size:14px;line-height:21px;color:{SOFT};">Didn’t sign up? You can safely ignore this email. Nobody can use your address without this code.</p>
<p style="margin:0;font-size:15px;line-height:22px;color:{INK};">With love,<br><strong>The Yasante team</strong></p>"""

    return _send(
        email,
        f"{code} is your Yasante code",
        text,
        _page(f"Your code is {spaced}. Welcome to Yasante!", body),
    )


def send_password_reset(email, name, link):
    """The link to choose a new password. True if the mail server took it."""
    first = (name or "").split(" ")[0] or "there"
    text = (
        f"Hi {first},\n\n"
        "Someone (hopefully you!) asked to reset the password for your Yasante account.\n\n"
        "Open this link to choose a new one:\n\n"
        f"{link}\n\n"
        "It works for the next hour, and only once.\n\n"
        "Didn't ask for this? You can ignore this email. Your password stays the same, "
        "and your account is safe.\n\n"
        "With love,\nThe Yasante team\n"
        "https://yasante.com\n"
    )
    body = f"""\
<p style="margin:0 0 8px;font-size:15px;color:{SOFT};">Hi {escape(first)},</p>
<h1 style="margin:0 0 16px;font-size:26px;line-height:32px;font-weight:700;letter-spacing:-0.4px;color:{INK};">Let’s get you back in</h1>
<p style="margin:0 0 28px;font-size:16px;line-height:24px;color:{INK};">Someone (hopefully you!) asked to reset the password for your Yasante account. Use the button below to choose a new one.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <a href="{escape(link)}" style="display:inline-block;background:{PINK};color:{INK};font-size:16px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:999px;">Choose a new password</a>
</td></tr></table>
<p style="margin:14px 0 28px;font-size:13px;line-height:20px;color:{SOFT};text-align:center;">It works for the next hour, and only once.</p>
<p style="margin:0 0 28px;font-size:14px;line-height:21px;color:{SOFT};">Didn’t ask for this? You can ignore this email. Your password stays the same, and your account is safe.</p>
<p style="margin:0;font-size:15px;line-height:22px;color:{INK};">With love,<br><strong>The Yasante team</strong></p>"""
    return _send(
        email,
        "Reset your Yasante password",
        text,
        _page("Choose a new password for your Yasante account.", body),
    )


SITE = "https://yasante.com"


def send_booking_notice(email, name, title, body, path, button):
    """
    A booking update for someone with no phone signed in to the app (she booked on the
    website): the same words the notification would have said, and a button to the page.
    """
    first = (name or "").split(" ")[0] or "there"
    # Written for a phone ("Tap to answer"); in an email it's a button.
    body = body.replace("Tap to ", "Open it to ")
    link = f"{SITE}{path}"
    text = (
        f"Hi {first},\n\n{title}\n\n{body}\n\n{button}: {link}\n\n"
        "With love,\nThe Yasante team\nhttps://yasante.com\n"
    )
    html = f"""\
<p style="margin:0 0 8px;font-size:15px;color:{SOFT};">Hi {escape(first)},</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:30px;font-weight:700;letter-spacing:-0.4px;color:{INK};">{escape(title)}</h1>
<p style="margin:0 0 28px;font-size:16px;line-height:24px;color:{INK};">{escape(body)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <a href="{escape(link)}" style="display:inline-block;background:{PINK};color:{INK};font-size:16px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:999px;">{escape(button)}</a>
</td></tr></table>
<p style="margin:28px 0 0;font-size:15px;line-height:22px;color:{INK};">With love,<br><strong>The Yasante team</strong></p>"""
    return _send(email, title, text, _page(body, html))


def _send(to, subject, text, html):
    """True if the mail server took it; False (logged) so the caller can say so."""
    message = EmailMultiAlternatives(
        subject=subject, body=text, from_email=settings.DEFAULT_FROM_EMAIL, to=[to]
    )
    message.attach_alternative(html, "text/html")
    try:
        message.send()
        return True
    except Exception:  # noqa: BLE001 — any mail failure is the same to her: try again
        logger.exception("Couldn't send %r to %s", subject, to)
        return False
