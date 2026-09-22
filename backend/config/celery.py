"""
Celery application for Yasante backend.

Auto-discovers tasks in every app under apps/.
"""

import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("yasante")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# ──────────────────────────────────────────────
# Periodic tasks (Celery Beat)
# ──────────────────────────────────────────────
app.conf.beat_schedule = {
    # Expire stale booking requests (48h)
    "expire-stale-requests": {
        "task": "apps.bookings.tasks.expire_stale_requests",
        "schedule": crontab(minute="*/5"),
    },
    # Expire unpaid deposits (24h)
    "expire-unpaid-deposits": {
        "task": "apps.bookings.tasks.expire_unpaid_deposits",
        "schedule": crontab(minute="*/5"),
    },
    # Auto-complete bookings (24h after appointment end)
    "auto-complete-bookings": {
        "task": "apps.bookings.tasks.auto_complete_bookings",
        "schedule": crontab(minute="*/10"),
    },
    # Send attendance reminders (day before)
    "send-attendance-reminders": {
        "task": "apps.bookings.tasks.send_attendance_reminders",
        "schedule": crontab(hour=9, minute=0),  # 9 AM UTC daily
    },
    # Open check-ins (day 14 and 28)
    "open-check-ins": {
        "task": "apps.bookings.tasks.open_check_ins",
        "schedule": crontab(hour=8, minute=0),  # 8 AM UTC daily
    },
}
