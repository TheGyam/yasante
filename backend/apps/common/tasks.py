from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from .models import ClientError


@shared_task
def prune_client_errors():
    return ClientError.objects.filter(created_at__lt=timezone.now() - timedelta(days=90)).delete()[0]


@shared_task(ignore_result=True)
def send_error_alert(issue_id, new=False):
    from .error_reporting import alert_issue
    alert_issue(issue_id, new)
