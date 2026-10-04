"""
The workspace's background jobs. Celery only loads each app's tasks.py, so every job
the workspace hands to the worker is named here, or the worker drops it as unknown.
"""

from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from .broadcasts import send_broadcast

__all__ = ["send_broadcast", "resume_broadcasts"]


@shared_task(ignore_result=True)
def resume_broadcasts():
    """
    Any push to many people that hasn't finished after five minutes (a restart, a lost
    job) is sent again. Safe: each person's copy has its own key, so nobody gets two.
    """
    from .models import Broadcast

    stuck = Broadcast.objects.filter(
        finished_at__isnull=True,
        created_at__lt=timezone.now() - timedelta(minutes=5),
        created_at__gt=timezone.now() - timedelta(days=2),
    )
    for broadcast_id in stuck.values_list("pk", flat=True):
        send_broadcast.delay(broadcast_id)
