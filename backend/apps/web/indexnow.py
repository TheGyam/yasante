"""
IndexNow: tells Bing (whose index feeds ChatGPT search and Copilot), Yandex, Seznam
and Naver the moment a public page is new or changed, instead of waiting to be
crawled. Free. The key isn't secret: it's published at /<key>.txt to prove the site
sent the ping.
"""

import json
import logging
import urllib.request

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.db.models.signals import post_save

logger = logging.getLogger(__name__)
ENDPOINT = "https://api.indexnow.org/indexnow"
HOST = "yasante.com"


@shared_task(ignore_result=True)
def ping(paths):
    key = settings.INDEXNOW_KEY
    body = json.dumps(
        {
            "host": HOST,
            "key": key,
            "keyLocation": f"https://{HOST}/{key}.txt",
            "urlList": [f"https://{HOST}{p}" for p in paths],
        }
    ).encode()
    request = urllib.request.Request(
        ENDPOINT, data=body, headers={"Content-Type": "application/json; charset=utf-8"}
    )
    try:
        urllib.request.urlopen(request, timeout=10).close()
    except Exception:  # noqa: BLE001 — a missed ping only means waiting for the crawler
        logger.warning("IndexNow ping failed for %s", paths, exc_info=True)


def announce(*paths):
    """Queue a ping once the change is saved. Off unless INDEXNOW_ENABLED (production)."""
    if settings.INDEXNOW_ENABLED and paths:
        transaction.on_commit(lambda: ping.delay(list(paths)))


def _stylist_saved(sender, instance, **kwargs):
    if instance.published:
        announce(f"/{instance.handle}", "/llms.txt")


def _look_saved(sender, instance, created, **kwargs):
    if created and instance.visibility == "public" and instance.status == "live":
        paths = [f"/looks/{instance.pk}"]
        if instance.stylist_handle:
            paths.append(f"/{instance.stylist_handle}")
        announce(*paths)


def connect():
    from apps.looks.models import Look
    from apps.stylists.models import StylistProfile

    post_save.connect(_stylist_saved, sender=StylistProfile, dispatch_uid="indexnow-stylist")
    post_save.connect(_look_saved, sender=Look, dispatch_uid="indexnow-look")
