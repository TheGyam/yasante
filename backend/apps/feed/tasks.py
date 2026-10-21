from celery import shared_task

from . import notifications, stats


@shared_task
def refresh_look_stats():
    return stats.refresh_look_stats()


@shared_task
def refresh_neighbours():
    return stats.refresh_neighbours()


@shared_task
def look_activity_digest():
    return notifications.look_activity_digest()


@shared_task
def picked_for_you():
    return notifications.picked_for_you()
