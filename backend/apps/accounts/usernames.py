"""
Usernames: what a person's posts show. One namespace with stylist handles, so
"braidsbyama" is only ever Braids by Ama, and the same rules as handles.
"""

from apps.common.identifiers import POLICY, UNAVAILABLE, identifier_problem, normalise  # noqa: F401


def name_in_use(value, user=None):
    """
    Whether `value` is someone else's: their username or handle (one namespace, any
    case), or a name they gave up that's still held. `user`'s own never counts.
    """
    from apps.stylists.models import StylistProfile

    from .models import ReleasedName, User

    users = User.objects.filter(username__iexact=value)
    stylists = StylistProfile.objects.filter(handle__iexact=value)
    if user is not None:
        users = users.exclude(pk=user.pk)
        stylists = stylists.exclude(account=user)
    return users.exists() or stylists.exists() or ReleasedName.held(value, user)


def username_problem(value, user=None):
    """Why a username can't be used, or None if it can."""
    problem = identifier_problem(value, max_length=POLICY["username_max"], current=getattr(user, "username", None))
    if problem:
        return problem
    if value != getattr(user, "username", None) and name_in_use(value, user):
        return UNAVAILABLE
    return None
