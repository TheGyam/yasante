"""
The hair trends report is research output, so docs/DATA_AND_CONSENT_PLAN.md's rules hold:
a minimum group of 20 people, months never times. Upstream's own test
(`tests/test_hair_trends.py`) shows one volunteer's 20 bookings as a group.
"""

from datetime import datetime, timedelta

import pytest

pytestmark = pytest.mark.django_db


def _report(start, end):
    from apps.bookings.models import Booking
    from apps.common.models import SearchLog
    from apps.looks.models import Look
    from apps.staff.insights import UK, Median
    from apps.staff.trends import hair_trends

    return hair_trends(Booking.objects.all(), Look.objects.all(), SearchLog.objects.all(), start, end, UK, Median)


@pytest.fixture
def booked(make_stylist):
    from apps.bookings.models import Booking

    stylist = make_stylist()

    def book(client, n=1, at=None, price=100):
        for _ in range(n):
            b = Booking.objects.create(
                status="completed", client=client, client_name="x", stylist=stylist.account, stylist_profile=stylist,
                stylist_name="x", service_id=stylist.menu_items.first().pk, service_name="x", price=price, currency="GBP",
                area="SE15", policy={}, policy_version="2026-10-20", styles=["knotless"],
            )
            if at:
                Booking.objects.filter(pk=b.pk).update(created_at=at)

    return book


def _wide():
    from django.utils import timezone

    now = timezone.now()
    return now - timedelta(days=1), now + timedelta(days=1)


@pytest.mark.xfail(strict=True, reason="F45: trend groups count bookings, not people")
def test_one_persons_twenty_bookings_are_not_a_group(make_user, booked, styles):
    booked(make_user(), 20)
    rows, _ = _report(*_wide())
    assert rows == [], rows


@pytest.mark.xfail(strict=True, reason="F45: trend groups count bookings, not people")
def test_one_volunteers_hair_is_not_a_group(make_user, booked, styles, consent):
    volunteer = make_user(texture="coily")
    consent(volunteer, "research")
    booked(volunteer, 20)
    _, meta = _report(*_wide())
    assert meta["byHair"] == [], meta["byHair"]


def test_the_control_twenty_people_are_a_group(make_user, booked, styles, consent):
    """Guards the two above: twenty different people do make a row."""
    people = [make_user(texture="coily") for _ in range(20)]
    for person in people:
        consent(person, "research")
        booked(person)
    rows, meta = _report(*_wide())
    assert [row["values"][0] for row in rows] == [20]
    assert meta["byHair"] == [{"style": "Knotless braids", "hair": "coily", "bookings": 20}]


@pytest.mark.xfail(strict=True, reason="F45: a range ending mid-month lets two reports be subtracted to one booking")
def test_moving_the_range_a_day_does_not_isolate_one_booking(make_user, booked, styles):
    from apps.staff.insights import UK

    day = lambda d: datetime(2026, 9, d, tzinfo=UK)
    for _ in range(20):
        booked(make_user(), at=day(10) + timedelta(hours=12))
    booked(make_user(name="Target"), at=day(11) + timedelta(hours=12), price=400)
    before, _ = _report(day(1), day(11))
    after, _ = _report(day(1), day(12))
    # The September row must not be one booking and one price apart between the two.
    assert before == after, f"Sep row: {before[0]['values']} vs {after[0]['values']}"
