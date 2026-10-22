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
    assert ever["appointments"] == 2 and ever["spending"] == [{"currency": "GBP", "amount": 210.0}]
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


def test_spending_in_several_currencies_is_never_added_up(api, make_user, make_stylist, book):
    from apps.bookings.models import Booking

    client = make_user()
    for country, price in (("GB", 60), ("GB", 40), ("DE", 45), ("GH", 300)):
        made = book(client, make_stylist(country=country))
        Booking.objects.filter(pk=made["id"]).update(status="completed", price=price, scheduled_for=timezone.now() - timedelta(days=2))
    body = api(client).get("/api/insights/?period=all").json()
    assert body["spending"] == [
        {"currency": "GBP", "amount": 100.0},
        {"currency": "EUR", "amount": 45.0},
        {"currency": "GHS", "amount": 300.0},
    ]


def test_a_take_down_or_a_wash_isnt_the_style_she_has_in(api, make_user, make_stylist, styles):
    from datetime import timedelta

    from apps.bookings.models import Booking
    from django.utils import timezone

    client = make_user()
    profile = make_stylist()
    now = timezone.now()

    def done(name, days_ago):
        return Booking.objects.create(
            client=client, stylist=profile.account, stylist_profile=profile, stylist_name=profile.display_name,
            service_id=profile.menu_items.first().pk, service_name=name, price=50, status="completed",
            scheduled_for=now - timedelta(days=days_ago),
        )

    done("Knotless braids", 30)
    done("Wash and blow dry", 10)
    current = api(client).get("/api/insights/").json()["currentStyle"]
    assert current["name"] == "Knotless braids"

    done("Wash and go", 5)
    assert api(client).get("/api/insights/").json()["currentStyle"]["name"] == "Wash and go"

    done("Take down and wash", 2)
    assert "currentStyle" not in api(client).get("/api/insights/").json()


def test_what_she_had_done_who_she_goes_back_to_and_her_care(api, make_user, make_stylist):
    from datetime import timedelta

    from apps.bookings.models import Booking
    from apps.planner.models import CarePlan, CarePlanSession
    from django.utils import timezone

    client, profile = make_user(), make_stylist()
    now = timezone.now()
    for name, days, minutes in (("Knotless braids", 40, 300), ("Knotless braids", 10, 300), ("Cornrows", 5, 120)):
        Booking.objects.create(
            client=client, stylist=profile.account, stylist_profile=profile, stylist_name=profile.display_name,
            stylist_handle=profile.handle, service_id=profile.menu_items.first().pk, service_name=name, price=50,
            status="completed", scheduled_for=now - timedelta(days=days), duration_minutes=minutes,
        )
    plan = CarePlan.objects.create(user=client, name="Wash day", frequency="weekly", time_of_day="evening")
    for days in (1, 1, 3):
        CarePlanSession.objects.create(plan=plan, user=client, completed_at=now - timedelta(days=days))

    ever = api(client).get("/api/insights/?period=all").json()
    assert ever["styleCounts"] == [{"name": "Knotless braids", "times": 2}, {"name": "Cornrows", "times": 1}]
    assert ever["favouriteStylist"] == {"name": profile.display_name, "handle": profile.handle, "times": 3}
    assert ever["hoursInChair"] == 12.0
    # Two different days, though she did it twice on one of them.
    assert ever["carePlanDays"] == 2
