"""
What staff see of people's personal data, and the trail of when they looked.

Fields listed in MASKED arrive in the workspace as "hidden" with a Show button, and are
left out of record lists and CSV exports. Showing
one needs the "reveal personal data" permission (superusers have it) and is written to
the staff activity log, as are exports and views of private photos.
"""

from django.contrib.admin.models import CHANGE, LogEntry
from django.contrib.contenttypes.models import ContentType

# Hair details are special category data: the policy says nobody else sees them.
HAIR = {"texture", "length", "shrunk_length", "density", "porosity", "goals", "scalp", "chemicals", "length_cm", "photo_uri"}

# Personal details nobody needs to glance at: a home address, a postcode, a phone number,
# and anything about someone's hair. Hidden in forms, lists and exports alike.
MASKED = {
    "accounts.user": {"phone"},
    "profiles.hairprofile": {"postcode", *HAIR, "next_styles", "next_length", "next_colour", "next_upkeep", "next_sit"},
    "profiles.hairprofilesnapshot": HAIR,
    "bookings.booking": {"address", "client_hair"},
    "bookings.checkin": {"holding", "scalp", "again"},
    "shelf.shelfitem": {"hair_snapshot"},
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
