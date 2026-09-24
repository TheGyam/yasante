"""
Usernames: what a person's posts show. One namespace with stylist handles, so
"braidsbyama" is only ever Braids by Ama, and the same rules as handles.
"""

import re

USERNAME = re.compile(r"^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$")


def normalise(value):
    return str(value or "").strip().lstrip("@").lower()


def username_problem(value, user=None):
    """Why a username can't be used, or None if it can."""
    from apps.stylists.models import NOT_HANDLES, StylistProfile

    from .models import User

    if not USERNAME.match(value) or re.search(r"[._]{2,}", value):
        return "3 to 30 letters, numbers, dots or underscores, not starting or ending with a dot"
    if value in NOT_HANDLES:
        return "That one's reserved"
    users = User.objects.filter(username=value)
    stylists = StylistProfile.objects.filter(handle=value)
    if user is not None:
        users = users.exclude(pk=user.pk)
        stylists = stylists.exclude(account=user)
    if users.exists() or stylists.exists():
        return "Someone already has that"
    return None
