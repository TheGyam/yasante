import logging
from django.contrib.admin.models import LogEntry, CHANGE
from django.contrib.auth import get_user_model
from django.utils import timezone
from .network import client_ip

logger = logging.getLogger("apps.staff.security")


def security_event(request, event, user=None, email=""):
    ip = client_ip(request) if request else "server operator"
    email = email or (user.email if user else "")
    logger.info("%s email=%r ip=%r at=%s", event, email, ip, timezone.now().isoformat())
    actor = user or get_user_model().objects.filter(is_superuser=True).order_by("pk").first()
    if actor:
        # LogEntry requires a user FK. System events are anchored to an administrator,
        # but explicitly displayed as System rather than attributing the attempt to them.
        system = user is None or request is None
        LogEntry.objects.create(user=actor, content_type=None, object_id=str(user.pk) if user else "",
                                object_repr=email[:200], action_flag=CHANGE,
                                change_message=f"{'System · ' if system else ''}{event} · {email} · {ip}")
