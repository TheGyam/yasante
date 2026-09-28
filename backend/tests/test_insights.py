"""A client's hair in numbers, from what they already do in the app."""

from datetime import timedelta

import pytest
from django.utils import timezone

pytestmark = pytest.mark.django_db


def test_the_month_and_the_long_view(api, make_user, make_stylist, book):
    from apps.bookings.models import Booking
    from apps.profiles.models import HairLog, HairProfile, HairProfileSnapshot

    client, profile = make_user(), make_stylist()
    now = timezone.now()
    # Two appointments: one taken down after 40 days, one in now.
    first = Booking.objects.get(pk=book(client, profile)["id"])
    second = Booking.objects.get(pk=book(client, profile)["id"])
    Booking.objects.filter(pk=first.pk).update(status="completed", scheduled_for=now - timedelta(days=80), price=120)
    Booking.objects.filter(pk=second.pk).update(status="completed", scheduled_for=now - timedelta(days=10), price=90)
    HairLog.objects.create(user=client, kind="take_down", at=now - timedelta(days=40), booking_id=first.pk)
    # Washes on Sundays, a week apart.
    for weeks in (3, 2, 1):
        HairLog.objects.create(user=client, kind="wash", at=now - timedelta(weeks=weeks), local_weekday=7)
    HairLog.objects.create(user=client, kind="trim", at=now - timedelta(days=30))
    # Length: chin at 20cm long ago, shoulder at 26cm now.
    old = HairProfileSnapshot.objects.create(user=client, length="chin", length_cm=20)
    HairProfileSnapshot.objects.filter(pk=old.pk).update(recorded_at=now - timedelta(days=200))
    HairProfile.objects.create(user=client, length="shoulder", length_cm=26)
    HairProfileSnapshot.objects.create(user=client, length="shoulder", length_cm=26)

    ever = api(client).get("/api/insights/?period=all").json()
    assert ever["appointments"] == 2 and ever["spent"] == 210
    assert ever["styleLastsDays"] == 40
    assert ever["currentStyle"]["days"] == 10 and ever["currentStyle"]["name"] == second.service_name
    assert ever["usualWashDay"] == "Sunday" and ever["washEveryDays"] == 7
    assert ever["daysSinceTrim"] == 30
    assert ever["length"]["now"] == "Shoulder" and ever["length"]["grewCm"] == 6 and ever["length"]["grewSteps"] == 2

    month = api(client).get("/api/insights/").json()
    assert month["period"] == "month" and month["appointments"] <= 1


def test_someone_new_gets_empty_numbers_not_an_error(api, make_user):
    body = api(make_user()).get("/api/insights/").json()
    # Empty values are left out, as everywhere in the API.
    assert body["appointments"] == 0 and "currentStyle" not in body and "length" not in body
