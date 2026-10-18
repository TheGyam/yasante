"""Times: stored in UTC, read on the stylist's clock, marked when that isn't yours."""

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

pytestmark = pytest.mark.django_db


def test_her_hours_are_on_her_own_clock(make_stylist):
    from zoneinfo import ZoneInfo

    from apps.stylists.slots import free_times

    profile = make_stylist()
    profile.time_zone = "America/New_York"
    profile.save()
    found = free_times(profile, 60)
    assert found["time_zone"] == "America/New_York"
    new_york = ZoneInfo("America/New_York")
    starts = [
        datetime.fromisoformat(t.replace("Z", "+00:00")).astimezone(new_york)
        for day in found["days"]
        for t in day["times"]
    ]
    # 09:00 to 18:00 there, whatever the hour is in London: an hour's job starts by 17:00.
    assert starts and min(s.hour for s in starts) == 9
    assert max((s.hour, s.minute) for s in starts) == (17, 0)


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
