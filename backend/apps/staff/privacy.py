"""
What staff see of people's personal data, and the trail of when they looked.

Fields listed in MASKED arrive in the workspace as "hidden" with a Show button. Showing
one needs the "reveal personal data" permission (superusers have it) and is written to
the staff activity log, as are exports and views of private photos.
"""

from django.contrib.admin.models import CHANGE, LogEntry
from django.contrib.contenttypes.models import ContentType

# Personal details nobody needs to glance at: a home address, a postcode, a phone number.
MASKED = {
    "accounts.user": {"phone"},
    "profiles.hairprofile": {"postcode"},
    "bookings.booking": {"address"},
    "stylists.stylistprofile": {"address"},
}

REVEAL_PERMISSION = "staff.reveal_personal_data"


def masked_fields(model):
    return MASKED.get(model._meta.label_lower, set())


def can_reveal(user):
    return user.has_perm(REVEAL_PERMISSION)


def log_access(request, model, message, obj=None):
    """A line in the staff activity trail: who looked at or took what, and when."""
    LogEntry.objects.create(
        user=request.user,
        content_type=ContentType.objects.get_for_model(model),
        object_id=str(obj.pk) if obj is not None else "",
        object_repr=str(obj)[:200] if obj is not None else str(model._meta.verbose_name_plural)[:200],
        action_flag=CHANGE,
        change_message=message,
    )
