"""
Push notifications: one call, `notify`, for every message the app sends.

- Each belongs to a category she can switch off (NOTIFICATION_CATEGORIES).
- Each has an event key, stored uniquely in NotificationLog, so it's sent once
  however many times a job or a request retries.
- Each says which mode it opens in and where, so tapping a booking request lands in
  stylist mode on that request.
- Delivery goes through Expo's push service (free; the app registers Expo push
  tokens). Set PUSH_DELIVERY=expo to send; anything else only logs, which is what
  development and tests use.
"""

import json
import logging
import urllib.error
import urllib.request

from celery import shared_task
from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_BATCH = 100


def muted_categories(user_id):
    """Switched off by her, plus every opt-in category she hasn't switched on."""
    from .models import OPT_IN_CATEGORIES, NotificationPreference

    pref = NotificationPreference.objects.filter(user_id=user_id).first()
    muted = set(pref.muted if pref else [])
    return muted | (OPT_IN_CATEGORIES - set(pref.opted_in if pref else []))


def notify(user_id, category, event_key, title, body, url=None, mode=None, action_category=None, **extra):
    """Queue one notification. Returns its log row, or None if it was already sent."""
    from .models import NotificationLog

    if not user_id:
        return None
    data = {k: v for k, v in {"url": url, "mode": mode, **extra}.items() if v is not None}
    status = "muted" if category in muted_categories(user_id) else "queued"
    try:
        with transaction.atomic():
            log = NotificationLog.objects.create(
                user_id=user_id,
                category=category,
                event_key=event_key[:200],
                title=title[:200],
                body=body[:500],
                data={**data, **({"_category": action_category} if action_category else {})},
                status=status,
            )
    except IntegrityError:
        return None  # Already sent: idempotent by design.
    if status == "queued":
        # After the surrounding transaction commits, so the job sees the row.
        transaction.on_commit(lambda: send_push.delay(str(log.pk)))
    return log


def _post_to_expo(messages):
    body = json.dumps(messages).encode()
    req = urllib.request.Request(
        EXPO_PUSH_URL,
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.loads(response.read().decode()).get("data", [])


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_push(self, log_id: str):
    from apps.accounts.models import DeviceToken

    from .models import NotificationLog

    log = NotificationLog.objects.filter(pk=log_id, status="queued").first()
    if log is None:
        return
    tokens = list(DeviceToken.objects.filter(user_id=log.user_id).values_list("token", flat=True))
    if not tokens:
        NotificationLog.objects.filter(pk=log.pk).update(status="no_device")
        return
    data = {k: v for k, v in log.data.items() if not k.startswith("_")}
    category = log.data.get("_category")
    messages = [
        {
            "to": token,
            "title": log.title,
            "body": log.body,
            "data": data,
            "sound": "default",
            **({"categoryId": category} if category else {}),
        }
        for token in tokens
        if token.startswith(("ExponentPushToken", "ExpoPushToken"))
    ]
    if getattr(settings, "PUSH_DELIVERY", "log") != "expo":
        logger.info("Push (log only) %s → %s: %s", log.event_key, log.user_id, log.title)
        NotificationLog.objects.filter(pk=log.pk).update(status="sent", sent_at=timezone.now())
        return
    if not messages:
        NotificationLog.objects.filter(pk=log.pk).update(status="no_device", error="No Expo tokens")
        return
    try:
        tickets = []
        for start in range(0, len(messages), EXPO_BATCH):
            tickets += _post_to_expo(messages[start : start + EXPO_BATCH])
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        raise self.retry(exc=exc)
    # A phone that uninstalled the app: forget its token so we stop trying.
    for message, ticket in zip(messages, tickets):
        if ticket.get("details", {}).get("error") == "DeviceNotRegistered":
            DeviceToken.objects.filter(token=message["to"]).delete()
    errors = [t.get("message", "") for t in tickets if t.get("status") == "error"]
    NotificationLog.objects.filter(pk=log.pk).update(
        status="failed" if errors and len(errors) == len(tickets) else "sent",
        error="; ".join(errors)[:300],
        sent_at=timezone.now(),
    )


# Kept for any caller of the old name.
def notify_once(event_key, user_id, payload):
    return notify(
        user_id,
        payload.get("category", "booking_updates"),
        event_key,
        payload.get("title", "Yasante"),
        payload.get("body", ""),
        url=payload.get("url"),
        mode=payload.get("mode"),
    )
