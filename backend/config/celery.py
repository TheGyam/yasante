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
    # Apple and Google's verdict on each push, a few minutes after Expo accepts it.
    "push-receipts": {"task": "apps.common.notifications.check_push_receipts", "schedule": crontab(minute="*/10")},
    # A push to many people that didn't finish (a restart, a lost job) goes again.
    "resume-broadcasts": {"task": "apps.staff.tasks.resume_broadcasts", "schedule": crontab(minute="*/5")},
    # Lapse requests and unpaid deposits, complete old appointments.
    "sweep-bookings": {
        "task": "apps.bookings.tasks.sweep_bookings",
        "schedule": crontab(minute="*/5"),
    },
    # One more day comes into reach each morning: tell whoever was waiting for it.
    "open-new-days": {
        "task": "apps.bookings.tasks.open_new_days",
        "schedule": crontab(hour=7, minute=0),
    },
    # Prep (3 days), attendance (24h), stylist heads-up (12h), morning-of.
    "send-reminders": {
        "task": "apps.bookings.tasks.send_reminders",
        "schedule": crontab(minute="*/15"),
    },
    # A week before a style usually comes out, with consent: time to rebook.
    "nudge-rebooks": {
        "task": "apps.bookings.tasks.nudge_rebooks",
        "schedule": crontab(hour=10, minute=30),
    },
    "open-check-ins": {
        "task": "apps.bookings.tasks.open_check_ins",
        "schedule": crontab(hour=10, minute=0),
    },
    # What she tags along with changed: one note a day at most, in the early evening.
    "tagging-along": {
        "task": "apps.planner.tasks.tell_people_tagging_along",
        "schedule": crontab(hour=17, minute=30),
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
    # On the hour, so it lands at the hour she usually washes.
    "wash-day-reminders": {
        "task": "apps.profiles.tasks.wash_day_reminders",
        "schedule": crontab(minute=0),
    },
    "length-prompt": {
        "task": "apps.profiles.tasks.prompt_length",
        "schedule": crontab(hour=10, minute=0, day_of_week="sun"),
    },
    "insurance-reminders": {
        "task": "apps.bookings.tasks.insurance_reminders",
        "schedule": crontab(hour=9, minute=0),
    },
    # How each look is doing, for ranking the feed.
    "feed-look-stats": {"task": "apps.feed.tasks.refresh_look_stats", "schedule": crontab(minute="*/10")},
    # Which looks the same people engage with: "more like this" and the feed's "similar".
    "feed-neighbours": {"task": "apps.feed.tasks.refresh_neighbours", "schedule": crontab(hour=2, minute=45)},
    # Early evening: how her looks did today; Thursdays, the weekly pick for those who asked.
    "feed-activity-digest": {"task": "apps.feed.tasks.look_activity_digest", "schedule": crontab(hour=19, minute=0)},
    "feed-picked-for-you": {"task": "apps.feed.tasks.picked_for_you", "schedule": crontab(hour=18, minute=30, day_of_week="thu")},
    "product-import": {
        "task": "apps.shelf.tasks.weekly_product_import",
        "schedule": crontab(hour=3, minute=30, day_of_week="wed"),
    },
}
