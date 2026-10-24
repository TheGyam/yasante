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


def searchable(request, model, fields):
    """A search match is a yes or no about the value: hidden fields only for those who may reveal them."""
    return fields if can_reveal(request.user) else [name for name in fields if not names_hidden(model, name)]


def search_without_hidden(request, ma, queryset, term):
    """An admin's own search, kept off hidden fields as the workspace's lists are."""
    from copy import copy

    ma = copy(ma)
    ma.search_fields = searchable(request, ma.model, ma.get_search_fields(request))
    return ma.get_search_results(request, queryset, term)


def names_hidden(model, path):
    """Whether a lookup like `client__phone__startswith` reaches a hidden field."""
    from django.core.exceptions import FieldDoesNotExist

    for part in path.lstrip("^=@").split("__"):
        if part in masked_fields(model):
            return True
        try:
            field = model._meta.get_field(part)
        except FieldDoesNotExist:
            return False  # a lookup such as startswith: the path ended on a visible field
        if not field.is_relation or field.related_model is None:
            return False
        model = field.related_model
    return False


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
