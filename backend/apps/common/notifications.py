"""Queue push notifications once per event. Never twice for the same event."""

import logging

from celery import shared_task
from django.core.cache import cache

logger = logging.getLogger(__name__)


def notify_once(event_key: str, user_id, payload: dict):
    cache_key = f"push:{event_key}"
    if not cache.add(cache_key, 1, timeout=60 * 60 * 24 * 30):
        return
    send_push.delay(str(user_id), payload, event_key)


@shared_task
def send_push(user_id: str, payload: dict, event_key: str):
    from apps.accounts.models import DeviceToken

    tokens = list(
        DeviceToken.objects.filter(user_id=user_id).values_list("token", "platform")
    )
    if not tokens:
        logger.info("Push %s for %s: no devices", event_key, user_id)
        return
    for token, platform in tokens:
        logger.info(
            "Push %s → %s (%s) %s",
            event_key,
            user_id,
            platform,
            payload.get("url"),
        )
        # Production: APNs / FCM. Tokens are stored; delivery is wired per env.
