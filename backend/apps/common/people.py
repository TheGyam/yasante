"""
How a person reads in a feed: her current stylist name and avatar when she has a
page, otherwise her account's. Read at request time, so a renamed stylist shows
her new name everywhere.
"""


def load_people(account_ids):
    """{account_id: {"name", "handle", "avatar_uri", "base_area"}} for many at once."""
    from apps.accounts.models import User
    from apps.stylists.models import StylistProfile

    ids = {i for i in account_ids if i}
    if not ids:
        return {}
    profiles = {
        p.account_id: p
        for p in StylistProfile.objects.filter(account_id__in=ids).only(
            "account_id", "display_name", "handle", "avatar_uri", "published", "base_area"
        )
    }
    people = {}
    for user in User.objects.filter(pk__in=ids).only("id", "name", "username", "avatar_uri"):
        profile = profiles.get(user.pk)
        # A stylist posts as her brand; anyone else as her username, or her first name
        # until she picks one. Never a full name on a public post.
        own = user.username or (user.name or "").split(" ")[0]
        people[user.pk] = {
            "name": (profile.display_name if profile else "") or own or "Someone",
            "handle": profile.handle if profile and profile.published else None,
            "avatar_uri": (profile.avatar_uri if profile else "") or user.avatar_uri or None,
            "base_area": profile.base_area if profile else None,
        }
    return people


def person(account_id):
    return load_people([account_id]).get(account_id) or {
        "name": "Someone",
        "handle": None,
        "avatar_uri": None,
        "base_area": None,
    }
