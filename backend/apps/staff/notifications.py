from html import escape

from django.db import transaction
from django.utils import timezone

from apps.accounts.emails import _page, _send
from .network import client_ip


def notify_factor_change(request, user, event):
    text = (
        f"Your Yasante staff account: {event}.\n\n"
        f"When: {timezone.now().isoformat()}\n"
        f"IP: {client_ip(request)}\n\n"
        "If this wasn't you, contact the admin immediately."
    )
    subject = f"Yasante staff security: {event}"
    html = _page(subject, f"<p>{escape(text).replace(chr(10), '<br>')}</p>")
    transaction.on_commit(lambda: _send(user.email, subject, text, html))
