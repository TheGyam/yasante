"""Times: stored in UTC, read on the stylist's clock, marked when that isn't yours."""

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

pytestmark = pytest.mark.django_db


def test_her_hours_are_on_her_own_clock(make_stylist):
    from apps.stylists.slots import is_open_on, start_fits

    profile = make_stylist()
    profile.time_zone = "America/New_York"
    profile.save()
    # Tuesday 14:00 UTC is 10:00 in New York: inside 09:00–18:00 there.
    assert start_fits(profile, datetime(2026, 10, 6, 14, 0, tzinfo=timezone.utc), 60)
    # 22:30 UTC is 18:30 in New York: after she's finished (it'd be fine in London hours).
    assert not start_fits(profile, datetime(2026, 10, 6, 22, 30, tzinfo=timezone.utc), 60)
    assert is_open_on(profile, datetime(2026, 10, 6, 14, 0, tzinfo=timezone.utc))


def test_a_time_is_marked_when_it_isnt_the_readers_own():
    from apps.bookings.notify import _when

    booking = SimpleNamespace(stylist_profile=SimpleNamespace(time_zone="Europe/London"))
    at = datetime(2026, 10, 6, 9, 0, tzinfo=timezone.utc)  # 10:00 in London (BST)
    in_london = SimpleNamespace(time_zone="Europe/London")
    in_new_york = SimpleNamespace(time_zone="America/New_York")
    assert _when(at, booking, in_london) == "Tue 6 Oct, 10:00"
    assert _when(at, booking, in_new_york) == "Tue 6 Oct, 10:00 (UK time)"


def test_a_phone_says_its_zone(api, make_user):
    user = make_user()
    ok = api(user).patch(f"/api/users/{user.pk}/", {"timeZone": "America/New_York"})
    assert ok.status_code == 200
    user.refresh_from_db()
    assert user.time_zone == "America/New_York"
    assert api(user).patch(f"/api/users/{user.pk}/", {"timeZone": "Mars/Base"}).status_code == 400
