"""Local error capture: bounded, scrubbed reports and durable issue groups."""
import hashlib
import json
import logging
import re
import traceback
from datetime import timedelta
from html import escape

from celery.signals import task_failure
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone


def scrub(value):
    text = str(value or "")
    text = re.sub(r"(?i)\bbearer\s+[^\s\"'<>]+", "Bearer [redacted]", text)
    text = re.sub(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", "[token]", text)
    text = re.sub(r"[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}", "[email]", text)
    text = re.sub(r"(https?://[^\s?\"']+)\?[^\s\"']+", r"\1", text)
    return text


def clean_context(value):
    if isinstance(value, dict):
        return {str(key)[:80]: ("[redacted]" if re.search(r"token|password|secret|authorization|cookie", str(key), re.I) else clean_context(item)) for key, item in list(value.items())[:30]}
    if isinstance(value, list):
        return [clean_context(item) for item in value[:30]]
    return scrub(value)[:2000] if isinstance(value, str) else value


def fingerprint(platform, message, stack):
    frame = next((line.strip() for line in stack.splitlines() if line.strip().startswith(("at ", 'File "'))), "")
    normal = re.sub(r"\b[0-9a-f]{8}-[0-9a-f-]{27,}\b|\b[0-9a-f]{16,}\b|\d+", "#", message + "\n" + frame, flags=re.I)
    return hashlib.sha1((platform + "\n" + normal).encode()).hexdigest()


ALERTS_PER_HOUR = 6


def alert_issue(issue_id, new=False):
    """Runs in the worker. Anyone can post an error, so mail is capped per issue and overall."""
    from .models import ClientError, ErrorIssue
    from apps.accounts.emails import _send, _page
    from django.contrib.auth import get_user_model
    issue = ErrorIssue.objects.filter(pk=issue_id).first()
    if issue is None or issue.status == "ignored":
        return
    if not new and ClientError.objects.filter(fingerprint=issue.fingerprint, created_at__gte=timezone.now()-timedelta(hours=1)).count() < 20:
        return
    if not cache.add(f"error-alert:{issue.fingerprint}", True, 6 * 3600):
        return
    cache.add("error-alerts:hour", 0, 3600)
    if cache.incr("error-alerts:hour") > ALERTS_PER_HOUR:
        return
    text = f"{issue.title}\nPlatform: {issue.platform}\nOccurrences: {issue.count}\nOpen the staff workspace's Errors page to investigate."
    for email in get_user_model().objects.filter(is_superuser=True, is_active=True).values_list("email", flat=True):
        _send(email, "Yasante: " + issue.title[:120], text, _page("An issue needs attention", f"<p>{escape(text)}</p>"))


def record_error(**data):
    from .models import ClientError, ErrorIssue
    data["message"] = scrub(data.get("message"))[:500]
    data["stack"] = scrub(data.get("stack"))[:20000]
    data["context"] = clean_context(data.get("context") or {})
    data["platform"] = str(data.get("platform", ""))[:20]
    data["fingerprint"] = fingerprint(data["platform"], data["message"], data["stack"])
    with transaction.atomic():
        issue, new = ErrorIssue.objects.get_or_create(fingerprint=data["fingerprint"], defaults={"title": data["message"], "platform": data["platform"]})
        issue = ErrorIssue.objects.select_for_update().get(pk=issue.pk)
        occurrence = ClientError.objects.create(**data)
        issue.count += 1
        issue.last_seen = occurrence.created_at
        issue.app_version = str(data.get("app_version", ""))[:40]
        issue.users_affected = ClientError.objects.filter(fingerprint=issue.fingerprint, user__isnull=False).values("user").distinct().count()
        if issue.status == "resolved":
            issue.status, issue.regressed = "open", True
        issue.save()
        from .tasks import send_error_alert
        transaction.on_commit(lambda: send_error_alert.delay(issue.pk, new), robust=True)
    return occurrence


class ErrorHandler(logging.Handler):
    def emit(self, record):
        if not record.exc_info:
            return
        try:
            request = getattr(record, "request", None)
            user = getattr(request, "user", None)
            record_error(kind="server", platform="server", message=str(record.exc_info[1]),
                         stack="".join(traceback.format_exception(*record.exc_info)),
                         user=user if user and user.is_authenticated else None,
                         context={"method": getattr(request, "method", ""), "path": getattr(request, "path", "").split("?")[0]})
        except Exception:
            pass  # Reporting must never break a request or recursively log a DB failure.


@task_failure.connect
def capture_task_failure(sender=None, exception=None, traceback=None, **kwargs):
    try:
        import traceback as trace
        record_error(kind="server", platform="server", message=str(exception),
                     stack="".join(trace.format_exception(type(exception), exception, traceback)),
                     context={"task": getattr(sender, "name", "")})
    except Exception:
        pass
