from celery import shared_task

from . import stats


@shared_task
def refresh_look_stats():
    return stats.refresh_look_stats()


@shared_task
def refresh_neighbours():
    return stats.refresh_neighbours()
