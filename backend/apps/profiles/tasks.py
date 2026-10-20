import json
import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage
from django.utils import timezone

"""
Profile background tasks.
"""


logger = logging.getLogger(__name__)


# What a person gets back of their own data (UK GDPR, right of access): every row that is
# theirs, by the relation that makes it theirs. Not included: staff records about them
# (audit log, moderation notes), secrets (sign-in and push tokens, codes), and other
# people's details (who blocked them, who's waiting on a stylist's slots).
EXPORT = {
    "account": ("accounts.User", "pk"),
    "hair_profile": ("profiles.HairProfile", "user"),
    "hair_snapshots": ("profiles.HairProfileSnapshot", "user"),
    "hair_log": ("profiles.HairLog", "user"),
    "consents": ("profiles.ConsentRecord", "user"),
    "notification_settings": ("common.NotificationPreference", "user"),
    "notifications_sent": ("common.NotificationLog", "user"),
    "uploads": ("common.Media", "owner"),
    "activity": ("profiles.AnalyticsEvent", "user"),
    "devices": ("accounts.DeviceToken", "user"),
    "looks": ("looks.Look", "author"),
    "look_likes": ("looks.LookLike", "user"),
    "comments": ("looks.LookComment", "author"),
    "comment_likes": ("looks.CommentLike", "user"),
    "reports_made": ("looks.Report", "reporter"),
    "people_blocked": ("looks.Block", "blocker"),
    "not_for_me": ("looks.NotForMe", "user"),
    "moderation_of_your_content": ("looks.ModerationAction", "author"),
    "appeals": ("looks.Appeal", "author"),
    "collections": ("planner.Collection", "user"),
    "collection_items": ("planner.CollectionItem", "collection__user"),
    "care_plans": ("planner.CarePlan", "user"),
    "care_plan_steps": ("planner.CarePlanStep", "plan__user"),
    "care_plan_sessions": ("planner.CarePlanSession", "user"),
    "shelf": ("shelf.ShelfItem", "user"),
    "products_added": ("shelf.Product", "added_by"),
    "saved_content": ("content.Favorite", "user"),
    "bookings_as_client": ("bookings.Booking", "client"),
    "booking_check_ins": ("bookings.CheckIn", "booking__client"),
    "reviews_written": ("bookings.Review", "booking__client"),
    "review_reports_made": ("bookings.ReviewReport", "reporter"),
    "slot_alerts": ("bookings.SlotInterest", "client"),
    "pages_viewed": ("stylists.PageView", "viewer"),
    "stylist_page": ("stylists.StylistProfile", "account"),
    "stylist_menu": ("stylists.MenuItem", "stylist__account"),
    "stylist_portfolio": ("stylists.PortfolioPhoto", "stylist__account"),
    "stylist_payment_methods": ("stylists.PaymentMethod", "stylist__account"),
    "stylist_checks": ("stylists.Verification", "account"),
    # Her appointments as a stylist. A client's address isn't hers to take away: she
    # sees it only while a booking is confirmed.
    "bookings_as_stylist": ("bookings.Booking", "stylist"),
    "reviews_received": ("bookings.Review", "booking__stylist"),
}
# Never sent, on any row: credentials and the like.
SECRET = ("password", "token", "secret", "code_hash", "apple_id", "google_id")
# Map points are worked out on the server for distances, and stay there.
SERVER_ONLY = ("latitude", "longitude")
NOT_FOR_STYLIST = ("address",)


def collect_user_data(user):
    """Everything EXPORT names, as plain JSON-ready dicts."""
    from django.apps import apps

    data = {"exported_at": timezone.now().isoformat()}
    for key, (label, relation) in EXPORT.items():
        model = apps.get_model(label)
        names = [
            f.attname
            for f in model._meta.concrete_fields
            if not any(word in f.name for word in SECRET)
            and f.name not in SERVER_ONLY
            and not (key == "bookings_as_stylist" and f.name in NOT_FOR_STYLIST)
        ]
        rows = list(model.objects.filter(**{relation: user.pk}).values(*names))
        data[key] = rows[0] if key == "account" and rows else rows
    return data


@shared_task(bind=True, max_retries=3)
def generate_data_export(self, user_id: str):
    """Everything Yasante holds about her, emailed to her as a file."""
    from apps.accounts.models import User

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning("Data export: user %s not found", user_id)
        return

    payload = json.dumps(collect_user_data(user), indent=2, default=str, ensure_ascii=False)
    first = (user.name or "").split(" ")[0] or "there"
    message = EmailMessage(
        "Your Yasante data",
        f"Hi {first},\n\nAttached is a copy of everything Yasante holds about you: your "
        "account, hair profile, looks, comments, collections, shelf, care plans, bookings "
        "and reviews. It's a JSON file, which any text editor opens.\n\n"
        "Didn't ask for this? Reply to this email and we'll look into it.\n\n"
        "The Yasante team\n",
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
    )
    message.attach("yasante-data.json", payload, "application/json")
    try:
        message.send()
    except Exception as error:  # the mail server; try again shortly
        raise self.retry(exc=error, countdown=60)

    logger.info("Data export sent to %s", user.email)



@shared_task
def wash_day_reminders(now=None):
    """
    Hourly: on the weekday and at the hour she usually washes, a reminder, for people
    who switched wash-day reminders on and let us use their hair details. Once a day.
    """
    from django.utils import timezone

    from apps.common import zones
    from apps.common.notifications import notify

    from .insights import usual_wash
    from .models import consenting

    now = now or timezone.now()
    asked = consenting("personalisation").filter(notification_preference__opted_in__contains=["wash_day"])
    for user in asked:
        usual = usual_wash(list(user.hair_log.filter(kind="wash")))
        local = now.astimezone(zones.of(user))
        if usual and usual == (local.isoweekday(), local.hour):
            notify(
                user.pk,
                "wash_day",
                f"wash:{user.pk}:{local.date()}",
                "Wash day",
                "It’s your usual wash day. Tap “Wash day done” when you’re finished.",
                url="/hair-profile",
                mode="client",
            )


@shared_task
def prompt_length(now=None):
    """
    Monthly: "has it grown?" to anyone whose length hasn't changed in 30 days. The
    growth curve is only as good as how often it's answered (plan, section 13).
    """
    from datetime import timedelta

    from django.db.models import Max
    from django.utils import timezone

    from apps.common.notifications import notify

    from .models import HairProfile, HairProfileSnapshot, consenting

    now = now or timezone.now()
    # Only people who let us use their hair details: their length is one of them.
    with_length = (
        HairProfile.objects.filter(user__in=consenting("personalisation"))
        .exclude(length="", shrunk_length="")
        .values_list("user_id", flat=True)
    )
    last = dict(
        HairProfileSnapshot.objects.filter(user_id__in=with_length)
        .exclude(length="", shrunk_length="")
        .values_list("user_id")
        .annotate(at=Max("recorded_at"))
    )
    for user_id, at in last.items():
        if at <= now - timedelta(days=30):
            notify(
                user_id,
                "reminders",
                f"length:{user_id}:{now:%Y-%m}",
                "Has it grown?",
                "One drag to update your length. Over a year, it’s your growth curve.",
                url="/hair-profile/length",
                mode="client",
            )
