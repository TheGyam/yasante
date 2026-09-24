"""
Insights groundwork (plan, section 13): what must be recorded from day one, so
the client's private stats and the annual recap can be built later.
"""

import pytest

from tests.test_bookings import _completed

pytestmark = pytest.mark.django_db


@pytest.fixture
def setup(make_stylist, make_user):
    return make_stylist(deposit="fixed"), make_user(texture="coily")


def test_every_booking_change_is_in_the_audit_trail_with_who_did_it(api, setup, book):
    from apps.bookings.held import sweep
    from apps.bookings.models import Booking, BookingEvent
    from django.utils import timezone

    profile, client = setup
    done = _completed(api, profile, client, book)
    trail = list(BookingEvent.objects.filter(booking_id=done).values_list("action", "to_status", "actor_role"))
    assert trail[0] == ("created", "requested", "client")
    assert ("status", "confirmed", "stylist") in trail
    assert trail[-1] == ("status", "completed", "stylist")

    # A lapse is the system's doing.
    lapsing = book(client, profile)["id"]
    Booking.objects.filter(pk=lapsing).update(expires_at=timezone.now())
    sweep()
    assert BookingEvent.objects.filter(booking_id=lapsing).last().actor_role == "system"


def test_bookings_carry_style_tags_from_the_menu(styles, api, setup, book):
    # (styles first: the taxonomy has to exist before her menu is written)
    from apps.bookings.models import Booking
    from apps.stylists.pricing import guess_styles

    profile, client = setup
    booking = book(client, profile)
    assert Booking.objects.get(pk=booking["id"]).styles == ["knotless"]
    assert booking["styles"] == ["knotless"]
    pairs = [("knotless", "Knotless braids"), ("boho", "Boho braids"), ("locs", "Locs"), ("faux-locs", "Faux locs")]
    assert guess_styles("Boho knotless", pairs) == ["boho", "knotless"]
    assert guess_styles("Faux locs", pairs) == ["faux-locs"]
    assert guess_styles("Loc retwist", pairs) == ["locs"]
    assert guess_styles("Take down and wash", pairs) == []


def test_a_check_in_says_when_a_style_came_out(api, setup, book):
    from apps.profiles.models import HairLog

    profile, client = setup
    answers = {"holding": "okay", "scalp": "comfortable", "again": "yes"}
    due = _completed(api, profile, client, book, days_ago=29)
    body = {"week": 4, "stillIn": False, "localAt": "2026-10-25T10:30:00", **answers}
    assert api(client).post(f"/api/bookings/{due}/check-in/", body).status_code == 204
    out = HairLog.objects.get(user=client, kind="take_down")
    assert str(out.booking_id) == due and out.local_weekday == 7 and out.local_hour == 10


def test_trims_and_wash_days_are_logged_on_her_own_clock(api, make_user):
    me = make_user()
    me_api = api(me)
    trim = me_api.post("/api/hair-log/", {"kind": "trim", "localAt": "2026-09-27T09:15:00"})
    assert trim.status_code == 201 and trim.json()["kind"] == "trim"
    me_api.post("/api/hair-log/", {"kind": "wash"})
    assert [e["kind"] for e in me_api.get("/api/hair-log/").json()] == ["wash", "trim"]
    assert me_api.post("/api/hair-log/", {"kind": "nap"}).status_code == 400
    from apps.profiles.models import HairLog

    assert HairLog.objects.get(kind="trim").local_weekday == 7
    # Someone else's appointment can't be tagged.
    other = "00000000-0000-0000-0000-000000000000"
    assert me_api.post("/api/hair-log/", {"kind": "take_down", "bookingId": other}).status_code == 404


def test_care_sessions_keep_the_local_day(api, make_user):
    from apps.planner.models import CarePlanSession

    me = api(make_user())
    plan = me.post(
        "/api/care-plans/",
        {"name": "Wash day", "frequency": "weekly", "timeOfDay": "morning", "steps": ["Shampoo"]},
    ).json()
    me.post(f"/api/care-plans/{plan['id']}/sessions/", {"localAt": "2026-09-27T08:00:00+01:00"})
    session = CarePlanSession.objects.get()
    assert (session.local_weekday, session.local_hour) == (7, 8)


def test_length_keeps_neck_and_an_optional_measurement_in_history(api, make_user):
    from apps.profiles.models import HairProfileSnapshot

    me = make_user()
    url = f"/api/users/{me.pk}/hair-profile/"
    assert api(me).patch(url, {"length": "neck", "lengthCm": 30.5}).status_code == 200
    api(me).patch(url, {"length": "shoulder"})
    history = list(HairProfileSnapshot.objects.filter(user=me).order_by("recorded_at").values_list("length", "length_cm"))
    assert history[-2:] == [("neck", 30.5), ("shoulder", 30.5)]


def test_monthly_length_prompt_goes_to_those_who_have_not_updated(make_user):
    from datetime import timedelta

    from apps.common.models import NotificationLog
    from apps.profiles.models import HairProfile, HairProfileSnapshot
    from apps.profiles.tasks import prompt_length
    from django.utils import timezone

    stale, fresh, never = make_user(), make_user(), make_user()
    for user in (stale, fresh):
        HairProfile.objects.update_or_create(user=user, defaults={"length": "chin"})
        HairProfileSnapshot.objects.create(user=user, length="chin")
    HairProfileSnapshot.objects.filter(user=stale).update(recorded_at=timezone.now() - timedelta(days=40))
    prompt_length()
    prompt_length()  # once a month, however often it runs
    told = list(NotificationLog.objects.values_list("user_id", flat=True))
    assert told == [stale.pk]
    assert NotificationLog.objects.get().data["url"] == "/hair-profile/length"
    assert never.pk not in told
