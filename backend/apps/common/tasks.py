from datetime import timedelta
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from .models import ClientError


@shared_task
def prune_client_errors():
    return ClientError.objects.filter(created_at__lt=timezone.now() - timedelta(days=90)).delete()[0]


@shared_task(ignore_result=True)
def send_error_alert(issue_id, new=False):
    from .error_reporting import alert_issue
    alert_issue(issue_id, new)


# How long we keep what people did, tied to who they are. Totals outlive the names.
FORGET_WHO_AFTER = timedelta(days=90)
DELETE_AFTER = timedelta(days=365)


@shared_task
def enforce_retention():
    """
    Analytics events go after 12 months. Searches, never linked to anyone, go after 12
    months. Stylist page views lose the viewer after 90 days; the counts stay, because
    stylists see them. What people saw and opened in the feed goes after 90 days.
    """
    from apps.feed.models import FeedEvent
    from apps.accounts.models import ReleasedName
    from apps.profiles.models import AnalyticsEvent
    from apps.stylists.models import PageView

    from .models import SearchLog

    now = timezone.now()
    return {
        "analytics_deleted": AnalyticsEvent.objects.filter(at__lt=now - DELETE_AFTER).delete()[0],
        "searches_deleted": SearchLog.objects.filter(created_at__lt=now - DELETE_AFTER).delete()[0],
        "views_anonymised": PageView.objects.filter(viewed_at__lt=now - FORGET_WHO_AFTER, viewer__isnull=False).update(viewer=None),
        "feed_events_deleted": FeedEvent.objects.filter(created_at__lt=now - FORGET_WHO_AFTER).delete()[0],
        # A given-up name, once its hold is over, is nobody's business.
        "name_holds_deleted": ReleasedName.objects.filter(
            released_at__lt=now - timedelta(days=settings.NAME_HOLD_DAYS)
        ).delete()[0],
    }
