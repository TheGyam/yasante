"""
"More like this" (`/api/looks/<id>/related/`, open to anyone) leads with looks "Saved by
people who saved this look", from `LookNeighbour`. Those pairs are built from private
saves, opens and bookings as well as likes, and one person is enough to make one. So on a
look only she has touched in public, a comment with her name on it, the first suggestion
is something she did in private.
"""

import pytest

pytestmark = pytest.mark.django_db


def _private_save(user, look):
    from apps.planner.models import Collection, CollectionItem

    collection = Collection.objects.create(user=user, name="Mine")
    CollectionItem.objects.create(collection=collection, kind="look", ref_id=str(look.pk))


def _related(api, look):
    from apps.feed.stats import refresh_neighbours

    refresh_neighbours()
    return api().get(f"/api/looks/{look.pk}/related/").json()["data"]


def _setup(make_user, make_look):
    from apps.looks.models import LookComment

    poster, efua = make_user(), make_user(name="Efua")
    look = make_look(poster, style="twists")
    # What she saved, in a collection nobody else can see: nothing in common with the look.
    secret = make_look(make_user(), style="silk-press")
    for _ in range(3):
        make_look(make_user(), style="silk-press")
    LookComment.objects.create(look=look, author=efua, body="Love this")
    return look, efua, secret


@pytest.mark.xfail(strict=True, reason="F47: one person's private save leads 'More like this' for anyone")
def test_one_persons_private_save_is_not_shown_as_like_this(api, make_user, make_look):
    look, efua, secret = _setup(make_user, make_look)
    _private_save(efua, secret)
    found = {item["id"]: item for item in _related(api, look)}
    assert found.get(str(secret.pk), {}).get("source") != "similar", found[str(secret.pk)]


def test_the_control_without_her_save_it_is_not_like_this(api, make_user, make_look):
    """Guards the test above: the pair comes from her save and nothing else."""
    look, efua, secret = _setup(make_user, make_look)
    found = {item["id"]: item for item in _related(api, look)}
    assert found.get(str(secret.pk), {}).get("source") != "similar"
