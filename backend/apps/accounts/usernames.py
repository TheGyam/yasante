"""
Usernames: what a person's posts show. One namespace with stylist handles, so
"braidsbyama" is only ever Braids by Ama, and the same rules as handles.
"""

from apps.common.identifiers import POLICY, UNAVAILABLE, identifier_problem, normalise  # noqa: F401


def username_problem(value, user=None):
    """Why a username can't be used, or None if it can."""
    from apps.stylists.models import StylistProfile

    from .models import User

    problem = identifier_problem(value, max_length=POLICY["username_max"], current=getattr(user, "username", None))
    if problem:
        return problem
    users = User.objects.filter(username__iexact=value)
    stylists = StylistProfile.objects.filter(handle__iexact=value)
    if user is not None:
        users = users.exclude(pk=user.pk)
        stylists = stylists.exclude(account=user)
    if users.exists() or stylists.exists():
        return UNAVAILABLE
    return None
