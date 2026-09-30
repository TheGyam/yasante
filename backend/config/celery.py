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
# Times are UTC; London is UTC or UTC+1, so "morning" jobs run at 8 UTC.
app.conf.beat_schedule = {
    "prune-client-errors": {"task": "apps.common.tasks.prune_client_errors", "schedule": crontab(hour=3, minute=0)},
    "enforce-retention": {"task": "apps.common.tasks.enforce_retention", "schedule": crontab(hour=3, minute=15)},
    # Lapse requests and unpaid deposits, complete old appointments.
    "sweep-bookings": {
        "task": "apps.bookings.tasks.sweep_bookings",
        "schedule": crontab(minute="*/5"),
    },
    # Prep (3 days), attendance (24h), stylist heads-up (12h), morning-of.
    "send-reminders": {
        "task": "apps.bookings.tasks.send_reminders",
        "schedule": crontab(minute="*/15"),
    },
    "open-check-ins": {
        "task": "apps.bookings.tasks.open_check_ins",
        "schedule": crontab(hour=10, minute=0),
    },
    "weekly-digest": {
        "task": "apps.bookings.tasks.weekly_digest",
        "schedule": crontab(hour=8, minute=0, day_of_week="mon"),
    },
    "nightly-stats": {
        "task": "apps.stylists.tasks.nightly_stats",
        "schedule": crontab(hour=2, minute=15),
    },
    "monthly-recap": {
        "task": "apps.stylists.tasks.monthly_recap",
        "schedule": crontab(hour=9, minute=0, day_of_month=1),
    },
    "length-prompt": {
        "task": "apps.profiles.tasks.prompt_length",
        "schedule": crontab(hour=10, minute=0, day_of_week="sun"),
    },
    "insurance-reminders": {
        "task": "apps.bookings.tasks.insurance_reminders",
        "schedule": crontab(hour=9, minute=0),
    },
    "product-import": {
        "task": "apps.shelf.tasks.weekly_product_import",
        "schedule": crontab(hour=3, minute=30, day_of_week="wed"),
    },
}
