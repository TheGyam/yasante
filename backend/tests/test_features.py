"""Feature switches: who is_on() says yes to, the cache that backs it, and the
public endpoint the app reads before sign-in decides anything."""

import pytest
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache

from apps.features.models import Switch
from apps.features.switches import CACHE_KEY, is_on

pytestmark = pytest.mark.django_db


class FakeUser:
    """A signed-in user needs only a pk for is_on() — no need for 1000 real rows."""

    is_authenticated = True

    def __init__(self, pk):
        self.pk = pk


def test_unknown_key_is_false(make_user):
    assert is_on("does_not_exist", make_user()) is False
    assert is_on("does_not_exist", AnonymousUser()) is False


def test_each_mode_for_each_kind_of_visitor(make_user):
    anon = AnonymousUser()
    plain = make_user()
    staffer = make_user(is_staff=True)
    listed_user = make_user()

    Switch.objects.create(key="off_switch", mode="off")
    Switch.objects.create(key="everyone_switch", mode="everyone")
    Switch.objects.create(key="staff_switch", mode="staff")
    listed = Switch.objects.create(key="listed_switch", mode="listed")
    listed.users.add(listed_user)

    for user in (anon, plain, staffer, listed_user):
        assert is_on("off_switch", user) is False
        assert is_on("everyone_switch", user) is True

    assert is_on("staff_switch", anon) is False
    assert is_on("staff_switch", plain) is False
    assert is_on("staff_switch", staffer) is True

    assert is_on("listed_switch", anon) is False
    assert is_on("listed_switch", plain) is False
    assert is_on("listed_switch", staffer) is False
    assert is_on("listed_switch", listed_user) is True


def test_percent_share_grows_without_losing_who_was_already_in():
    switch = Switch.objects.create(key="percent_switch", mode="percent", percent=0)
    users = [FakeUser(i) for i in range(1000)]

    assert all(is_on("percent_switch", u) is False for u in users)
    # A signed-out visitor is never in a percentage, even at 100.
    assert is_on("percent_switch", AnonymousUser()) is False

    switch.percent = 100
    switch.save()
    assert all(is_on("percent_switch", u) is True for u in users)

    switch.percent = 30
    switch.save()
    in_30 = {u.pk for u in users if is_on("percent_switch", u)}
    assert 250 <= len(in_30) <= 350

    switch.percent = 50
    switch.save()
    in_50 = {u.pk for u in users if is_on("percent_switch", u)}
    assert in_30 <= in_50


def test_changing_a_switch_clears_the_cache(make_user):
    switch = Switch.objects.create(key="toggle_switch", mode="off")
    user = make_user()

    assert is_on("toggle_switch", user) is False
    assert cache.get(CACHE_KEY) is not None  # warmed by the call above

    switch.mode = "everyone"
    switch.save()  # what the admin does when a change is saved
    assert cache.get(CACHE_KEY) is None

    assert is_on("toggle_switch", user) is True


def test_adding_a_listed_user_clears_the_cache(make_user):
    switch = Switch.objects.create(key="listed_switch2", mode="listed")
    user = make_user()

    assert is_on("listed_switch2", user) is False
    switch.users.add(user)
    assert cache.get(CACHE_KEY) is None
    assert is_on("listed_switch2", user) is True


def test_deleting_a_switch_clears_the_cache(make_user):
    switch = Switch.objects.create(key="doomed_switch", mode="everyone")
    user = make_user()

    assert is_on("doomed_switch", user) is True
    switch.delete()
    assert cache.get(CACHE_KEY) is None
    assert is_on("doomed_switch", user) is False


def test_endpoint_signed_out_and_signed_in(api, make_user, django_assert_max_num_queries):
    staffer = make_user(is_staff=True)

    with django_assert_max_num_queries(1):
        signed_out = api().get("/api/features/")
    assert signed_out.status_code == 200
    body = signed_out.json()["features"]
    assert body["multi_photo_looks"] is False
    assert body["video_posts"] is False
    assert signed_out["Cache-Control"] == "private, max-age=60"
    assert "Authorization" in signed_out["Vary"]

    with django_assert_max_num_queries(0):
        signed_in = api(staffer).get("/api/features/")
    assert signed_in.json()["features"]["multi_photo_looks"] is True
