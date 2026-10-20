"""
The booking state machine and its rules: pricing, free times, clashes, deposits,
the address, cancellations, moves, close-out, reviews, check-ins, the waitlist.
"""

from datetime import timedelta
from datetime import timezone as dt_timezone
from zoneinfo import ZoneInfo

import pytest
from django.utils import timezone

pytestmark = pytest.mark.django_db


def _iso(dt):
    return dt.astimezone(dt_timezone.utc).isoformat().replace("+00:00", "Z")


@pytest.fixture
def setup(make_stylist, make_user):
    return make_stylist(deposit="fixed"), make_user(texture="coily")


def test_a_request_is_priced_by_the_server_and_hides_the_address(api, setup, book):
    profile, client = setup
    booking = book(client, profile)
    assert booking["status"] == "requested"
    assert booking["price"] == 120 and booking["fromPrice"] is True
    assert booking["durationMinutes"] == 300
    assert "address" not in booking
    assert booking["area"] == "Peckham"
    assert booking["policy"]["noticeHours"] == 48
    lapses = timezone.datetime.fromisoformat(booking["expiresAt"].replace("Z", "+00:00"))
    start = timezone.datetime.fromisoformat(booking["requestedTimes"][0].replace("Z", "+00:00"))
    # 48 hours to answer, but never later than 2 hours before the time asked for.
    assert lapses == min(lapses, start - timedelta(hours=2))
    assert lapses - timezone.now() <= timedelta(hours=48)


def test_options_price_it_and_every_group_must_be_chosen(api, setup, book, slot):
    profile, client = setup
    cornrows = profile.menu_items.get(name="Cornrows")
    body = {
        "stylistId": str(profile.account_id),
        "serviceId": str(cornrows.pk),
        "requestedTimes": [slot(api(client), profile, cornrows)],
        "policyVersion": "v1",
    }
    missing = api(client).post("/api/bookings/", body)
    assert missing.status_code == 400 and "size" in missing.json()["message"]
    priced = book(client, profile, cornrows, options={"size": "small"})
    assert priced["price"] == 75 and priced["fromPrice"] is False
    assert priced["optionLabels"] == ["Small"] and priced["durationMinutes"] == 180


@pytest.mark.parametrize(
    "change,code,words",
    [
        ({"policyVersion": ""}, 400, "terms"),
        ({"requestedTimes": []}, 400, "come"),
        ({"serviceId": "00000000-0000-0000-0000-000000000000"}, 400, "menu"),
    ],
)
def test_a_request_is_refused_when_it_breaks_a_rule(api, setup, slot, change, code, words):
    profile, client = setup
    service = profile.menu_items.get(name="Knotless braids")
    body = {
        "stylistId": str(profile.account_id),
        "serviceId": str(service.pk),
        "requestedTimes": [slot(api(client), profile, service)],
        "policyVersion": "v1",
        **change,
    }
    response = api(client).post("/api/bookings/", body)
    assert response.status_code == code and words in response.json()["message"]


def test_booking_needs_a_live_page_and_someone_else_but_no_phone_check(api, make_stylist, make_user, slot):
    profile = make_stylist()
    service = profile.menu_items.first()
    body = {"stylistId": str(profile.account_id), "serviceId": str(service.pk), "policyVersion": "v1"}
    unverified = make_user(verified=False)
    body["requestedTimes"] = [slot(api(unverified), profile, service)]
    assert api(unverified).post("/api/bookings/", body).status_code == 201
    assert api(profile.account).post("/api/bookings/", body).status_code == 400
    draft = make_stylist(published=False)
    assert (
        api(make_user()).post("/api/bookings/", {**body, "stylistId": str(draft.account_id)}).status_code
        == 404
    )


def test_days_off_and_times_outside_working_hours_are_refused(api, setup):
    profile, client = setup
    service = profile.menu_items.get(name="Knotless braids")
    body = {"stylistId": str(profile.account_id), "serviceId": str(service.pk), "policyVersion": "v1"}
    now = timezone.now().astimezone(ZoneInfo("Europe/London"))
    sunday = now + timedelta(days=(6 - now.weekday()) % 7 + 7)
    sunday = sunday.replace(hour=10, minute=0, second=0, microsecond=0)
    off = api(client).post("/api/bookings/", {**body, "requestedTimes": [_iso(sunday)]})
    assert off.status_code == 400 and "doesn’t work" in off.json()["message"]
    monday_late = (sunday + timedelta(days=1)).replace(hour=17)
    late = api(client).post("/api/bookings/", {**body, "requestedTimes": [_iso(monday_late)]})
    assert late.status_code == 400 and f"outside {profile.display_name}’s hours" in late.json()["message"]


def test_the_same_time_can_only_be_asked_for_once(api, setup, make_user, book, slot):
    profile, client = setup
    service = profile.menu_items.get(name="Knotless braids")
    time = slot(api(client), profile, service)
    book(client, profile, service, time=time)
    body = {
        "stylistId": str(profile.account_id),
        "serviceId": str(service.pk),
        "requestedTimes": [time],
        "policyVersion": "v1",
    }
    clash = api(make_user()).post("/api/bookings/", body)
    assert clash.status_code == 409 and "just asked for that time" in clash.json()["message"]


def test_request_deposit_then_confirmed_reveals_the_address(api, setup, book):
    profile, client = setup
    booking = book(client, profile)
    as_stylist, as_client = api(profile.account), api(client)
    url = f"/api/bookings/{booking['id']}"
    assert as_client.post(f"{url}/accept/", {"scheduledFor": booking["requestedTimes"][0]}).status_code == 403
    accepted = as_stylist.post(
        f"{url}/accept/",
        {"scheduledFor": booking["requestedTimes"][0], "deposit": {"amount": 20, "method": "Monzo · monzo.me/ama"}},
    ).json()
    assert accepted["status"] == "awaiting_deposit"
    assert accepted["deposit"] == {"amount": 20, "method": "Monzo · monzo.me/ama", "status": "awaiting"}
    assert "address" not in as_client.get(f"{url}/").json()
    confirmed = as_stylist.post(f"{url}/deposit-received/").json()
    assert confirmed["status"] == "confirmed"
    assert as_client.get(f"{url}/").json()["address"] == "12 Bellenden Road, Peckham"
    assert as_stylist.post(f"{url}/accept/", {"scheduledFor": booking["requestedTimes"][0]}).status_code == 409


def test_accepting_without_a_deposit_confirms_straight_away(api, setup, book):
    profile, client = setup
    booking = book(client, profile)
    done = api(profile.account).post(
        f"/api/bookings/{booking['id']}/accept/", {"scheduledFor": booking["requestedTimes"][0]}
    ).json()
    assert done["status"] == "confirmed" and "expiresAt" not in done


def test_only_the_two_people_can_see_a_booking(api, setup, book, make_user):
    profile, client = setup
    booking = book(client, profile)
    assert api(make_user()).get(f"/api/bookings/{booking['id']}/").status_code == 403
    assert api(client).get("/api/bookings/", role="client").json()[0]["id"] == booking["id"]
    assert api(profile.account).get("/api/bookings/", role="stylist").json()[0]["id"] == booking["id"]
    assert api(profile.account).get("/api/bookings/", role="stylist", status="confirmed").json() == []


def test_the_stylist_sees_her_record_and_hair_the_client_never_does(api, setup, book, consent):
    from apps.bookings.models import Booking

    profile, client = setup
    consent(client, "personalisation")
    booking = book(client, profile)
    # An early cancellation elsewhere is never counted; a late one is.
    Booking.objects.filter(pk=booking["id"]).update()
    for status in ("cancelled_in_time", "cancelled_late", "no_show", "completed"):
        Booking.objects.create(
            status=status, client=client, client_name=client.name, stylist=profile.account,
            stylist_profile=profile, stylist_name="x", service_id=profile.menu_items.first().pk,
            service_name="x", price=1, area="x", policy={}, policy_version="v1",
        )
    seen_by_stylist = api(profile.account).get(f"/api/bookings/{booking['id']}/").json()
    assert seen_by_stylist["clientRecord"] == {"attended": 1, "noShows": 1, "lateCancellations": 1}
    assert "coily" in seen_by_stylist["clientHair"]
    seen_by_client = api(client).get(f"/api/bookings/{booking['id']}/").json()
    assert "clientRecord" not in seen_by_client and "clientHair" not in seen_by_client


def test_she_can_suggest_another_time_and_the_client_answers(api, setup, book, make_user):
    profile, client = setup
    booking = book(client, profile)
    url = f"/api/bookings/{booking['id']}"
    later = _iso(timezone.now() + timedelta(days=10))
    proposed = api(profile.account).post(f"{url}/propose/", {"scheduledFor": later}).json()
    assert proposed["proposal"]["scheduledFor"] and proposed["status"] == "requested"
    assert api(make_user()).post(f"{url}/proposal/", {"accept": True}).status_code == 403
    taken = api(client).post(f"{url}/proposal/", {"accept": True}).json()
    assert taken["status"] == "confirmed" and "proposal" not in taken

    second = book(client, profile)
    # Never a time that's already booked.
    taken_time = api(profile.account).post(f"/api/bookings/{second['id']}/propose/", {"scheduledFor": later})
    assert taken_time.status_code == 409 and "already booked" in taken_time.json()["message"]
    other = _iso(timezone.now() + timedelta(days=11))
    api(profile.account).post(f"/api/bookings/{second['id']}/propose/", {"scheduledFor": other})
    no = api(client).post(f"/api/bookings/{second['id']}/proposal/", {"accept": False}).json()
    assert no["status"] == "declined"


def test_declining(api, setup, book):
    profile, client = setup
    booking = book(client, profile)
    declined = api(profile.account).post(f"/api/bookings/{booking['id']}/decline/", {"reason": "Fully booked"})
    assert declined.json()["status"] == "declined"
    again = api(profile.account).post(f"/api/bookings/{booking['id']}/decline/")
    assert again.status_code == 409


def _confirmed(api, profile, client, book, hours_ahead=None):
    from apps.bookings.models import Booking

    booking = book(client, profile)
    api(profile.account).post(
        f"/api/bookings/{booking['id']}/accept/", {"scheduledFor": booking["requestedTimes"][0]}
    )
    if hours_ahead is not None:
        Booking.objects.filter(pk=booking["id"]).update(
            scheduled_for=timezone.now() + timedelta(hours=hours_ahead)
        )
    return booking["id"]


def test_a_client_cancelling_in_time_or_late_is_the_servers_call(api, setup, book):
    profile, client = setup  # 48 hours' notice
    early = _confirmed(api, profile, client, book, hours_ahead=100)
    assert api(client).post(f"/api/bookings/{early}/cancel/").json()["status"] == "cancelled_in_time"
    late = _confirmed(api, profile, client, book, hours_ahead=10)
    assert api(client).post(f"/api/bookings/{late}/cancel/").json()["status"] == "cancelled_late"
    hers = _confirmed(api, profile, client, book)
    assert api(profile.account).post(f"/api/bookings/{hers}/cancel/").json()["status"] == "cancelled_by_stylist"
    assert api(client).post(f"/api/bookings/{hers}/cancel/").status_code == 409


def test_a_client_can_withdraw_a_request_but_the_stylist_declines_it(api, setup, book):
    profile, client = setup
    asked = book(client, profile)
    # The stylist answers a request with a no; cancelling isn't hers to do here.
    assert api(profile.account).post(f"/api/bookings/{asked['id']}/cancel/").status_code == 409
    withdrawn = api(client).post(f"/api/bookings/{asked['id']}/cancel/").json()
    assert withdrawn["status"] == "cancelled_in_time"


def test_a_cancellation_opens_the_slot_to_the_waitlist_but_not_the_canceller(api, setup, book, make_user):
    from apps.bookings.models import Booking, SlotInterest

    profile, client = setup
    booking_id = _confirmed(api, profile, client, book)
    day = Booking.objects.get(pk=booking_id).scheduled_for
    waiter = make_user()
    body = {
        "stylistId": str(profile.account_id),
        "from": _iso(day - timedelta(days=1)),
        "to": _iso(day + timedelta(days=1)),
    }
    watched = api(waiter).post("/api/slot-interests/", body).json()
    api(client).post("/api/slot-interests/", body)
    api(client).post(f"/api/bookings/{booking_id}/cancel/")
    assert SlotInterest.objects.get(pk=watched["id"]).opened_on is not None
    assert SlotInterest.objects.get(client=client).opened_on is None
    mine = api(waiter).get("/api/slot-interests/").json()[0]
    assert set(mine) >= {"id", "stylistId", "stylistName", "from", "to", "openedOn"}
    assert api(waiter).delete(f"/api/slot-interests/{watched['id']}/").status_code == 204
    assert api(waiter).delete(f"/api/slot-interests/{watched['id']}/").status_code == 404


def test_booking_her_ends_the_wait_for_a_slot_with_her(api, setup, book):
    profile, client = setup
    now = timezone.now()
    body = {"stylistId": str(profile.account_id), "from": _iso(now), "to": _iso(now + timedelta(days=7))}
    api(client).post("/api/slot-interests/", body)
    assert len(api(client).get("/api/slot-interests/").json()) == 1
    book(client, profile)
    assert api(client).get("/api/slot-interests/").json() == []


def test_close_out_rules(api, setup, book):
    profile, client = setup
    future = _confirmed(api, profile, client, book, hours_ahead=30)
    early = api(profile.account).post(f"/api/bookings/{future}/close/", {"outcome": "no_show"})
    assert early.status_code == 400 and "after the start time" in early.json()["message"]
    started = _confirmed(api, profile, client, book, hours_ahead=-6)
    url = f"/api/bookings/{started}/close/"
    no_size = api(profile.account).post(url, {"outcome": "attended", "timing": {"outcome": "over"}})
    assert no_size.status_code == 400
    bad_reason = api(profile.account).post(
        url, {"outcome": "attended", "timing": {"outcome": "over", "bucket": "30_60", "reason": "made up"}}
    )
    assert bad_reason.status_code == 400
    assert api(client).post(url, {"outcome": "attended"}).status_code == 403
    closed = api(profile.account).post(
        url,
        {"outcome": "attended", "actualPrice": 140, "timing": {"outcome": "over", "bucket": "30_60", "reason": "more_hair"}},
    ).json()
    assert closed["status"] == "completed" and closed["actualPrice"] == 140
    assert closed["timing"] == {"outcome": "over", "bucket": "30_60", "reason": "more_hair"}
    page = api().get(f"/api/stylists/by-handle/{profile.handle}/").json()
    assert page["confirmedStyles"] == 1


def _open_at(days, hour=10):
    """A working time (Monday to Saturday, 10:00 London) about `days` from now."""
    from zoneinfo import ZoneInfo

    london = ZoneInfo("Europe/London")
    day = (timezone.now().astimezone(london) + timedelta(days=days)).replace(hour=hour, minute=0, second=0, microsecond=0)
    while day.isoweekday() == 7:  # the fixture's Sunday is closed
        day += timedelta(days=1)
    return day


def test_attendance_and_moves(api, setup, book, make_user):
    profile, client = setup
    booking_id = _confirmed(api, profile, client, book)
    url = f"/api/bookings/{booking_id}"
    assert api(client).post(f"{url}/attending/").json()["attendanceConfirmedAt"]
    past = api(client).post(f"{url}/move/", {"scheduledFor": _iso(timezone.now() - timedelta(days=1))})
    assert past.status_code == 400
    moved = api(client).post(f"{url}/move/", {"scheduledFor": _iso(_open_at(12))}).json()
    assert moved["moveRequest"]["by"] == "client"
    assert api(client).post(f"{url}/move/", {"scheduledFor": _iso(_open_at(13))}).status_code == 409
    assert api(client).post(f"{url}/move/answer/", {"accept": True}).status_code == 403
    answered = api(profile.account).post(f"{url}/move/answer/", {"accept": True}).json()
    assert answered["moves"] == 1 and "moveRequest" not in answered
    assert "attendanceConfirmedAt" not in answered  # a new day needs a new yes
    second = api(client).post(f"{url}/move/", {"scheduledFor": _iso(_open_at(14))})
    assert second.status_code == 409 and "moved once" in second.json()["message"]


def _completed(api, profile, client, book, days_ago=0):
    from apps.bookings.models import Booking

    booking_id = _confirmed(api, profile, client, book, hours_ahead=-6)
    api(profile.account).post(f"/api/bookings/{booking_id}/close/", {"outcome": "attended"})
    if days_ago:
        Booking.objects.filter(pk=booking_id).update(completed_at=timezone.now() - timedelta(days=days_ago))
    return booking_id


def test_a_rebook_nudge_comes_a_week_before_her_style_usually_comes_out(api, setup, book, consent):
    from apps.bookings.models import Booking
    from apps.bookings.tasks import nudge_rebooks
    from apps.common.models import NotificationLog
    from apps.profiles.models import log_hair

    profile, client = setup
    now = timezone.now()

    def styled(days_ago):
        booking_id = _completed(api, profile, client, book)
        Booking.objects.filter(pk=booking_id).update(scheduled_for=now - timedelta(days=days_ago))
        return booking_id

    # Her last style lasted four weeks; this one went in 23 days ago, so it's due in five.
    before = styled(60)
    log_hair(client, "take_down", at=now - timedelta(days=32), booking_id=before)
    current = styled(23)
    nudges = lambda: NotificationLog.objects.filter(user=client, event_key=f"booking:{current}:rebook")

    nudge_rebooks(now=now)
    assert not nudges().exists()  # not without her yes to using hair details

    consent(client, "personalisation")
    nudge_rebooks(now=now)
    nudge_rebooks(now=now)
    nudge = nudges().get()
    assert nudge.category == "after_appointment" and nudge.data["url"] == f"/book/{profile.handle}"
    assert nudge.body.startswith("It’s nearly time for your knotless braids to come out.")
    assert "is free on" in nudge.body


def test_reviews_follow_a_completed_appointment_once(api, setup, book):
    profile, client = setup
    pending = _confirmed(api, profile, client, book)
    assert api(client).post(f"/api/bookings/{pending}/review/", {"rating": 5}).status_code == 409
    done = _completed(api, profile, client, book)
    url = f"/api/bookings/{done}/review/"
    assert api(client).post(url, {"rating": 6}).status_code == 400
    assert api(profile.account).post(url, {"rating": 5}).status_code == 403
    review = api(client).post(url, {"rating": 5, "body": "Neat parts"}).json()
    assert review["status"] == "published" and review["authorName"] == client.name.split()[0]
    assert api(client).post(url, {"rating": 4}).status_code == 409
    assert api(client).get(f"/api/bookings/{done}/").json()["review"] == {"rating": 5, "status": "published"}
    # A review shows on her page at once; moderation follows reports, not approval.
    shown = api().get(f"/api/stylists/by-handle/{profile.handle}/").json()["reviews"]
    assert [r["id"] for r in shown] == [review["id"]]
    report = api(profile.account).post(f"/api/reviews/{review['id']}/report/", {"reason": "not-real"})
    assert report.status_code == 204


def test_started_on_time_and_contesting_are_once_each(api, setup, book):
    from apps.bookings.models import Booking

    profile, client = setup
    done = _completed(api, profile, client, book)
    url = f"/api/bookings/{done}"
    assert api(client).post(f"{url}/started-on-time/", {"onTime": True}).json()["startedOnTime"] is True
    assert api(client).post(f"{url}/started-on-time/", {"onTime": False}).status_code == 409
    assert api(client).post(f"{url}/contest/", {"what": "timing"}).status_code == 409
    Booking.objects.filter(pk=done).update(timing_outcome="over", timing_bucket="30_60")
    assert api(client).post(f"{url}/contest/", {"what": "timing"}).json()["contested"] == {"timing": True}
    assert api(client).post(f"{url}/contest/", {"what": "timing"}).status_code == 409
    assert api(client).post(f"{url}/contest/", {"what": "no_show"}).status_code == 409


def test_check_ins_open_at_two_and_four_weeks(api, setup, book):
    profile, client = setup
    answers = {"holding": "fresh", "scalp": "comfortable", "again": "yes"}
    fresh = _completed(api, profile, client, book, days_ago=3)
    assert api(client).post(f"/api/bookings/{fresh}/check-in/", {"week": 2, **answers}).status_code == 409
    due = _completed(api, profile, client, book, days_ago=15)
    assert api(client).get(f"/api/bookings/{due}/").json()["checkInDue"] == 2
    assert api(client).post(f"/api/bookings/{due}/check-in/", {"week": 2, "holding": "fresh"}).status_code == 400
    assert api(client).post(f"/api/bookings/{due}/check-in/", {"week": 2, **answers}).status_code == 204
    assert "checkInDue" not in api(client).get(f"/api/bookings/{due}/").json()
    assert api(client).post(f"/api/bookings/{due}/check-in/", {"week": 2, **answers}).status_code == 409


def test_the_scalp_question_is_asked_and_kept_only_with_hair_consent(api, setup, book, consent):
    from apps.bookings.models import CheckIn

    profile, client = setup
    two = {"holding": "fresh", "again": "yes"}
    due = _completed(api, profile, client, book, days_ago=15)
    # Without her yes, two answers are enough, and a scalp answer sent anyway isn't kept.
    assert api(client).post(f"/api/bookings/{due}/check-in/", {"week": 2, **two, "scalp": "sore"}).status_code == 204
    assert CheckIn.objects.get(booking_id=due).scalp == ""

    consent(client, "personalisation")
    later = _completed(api, profile, client, book, days_ago=15)
    assert api(client).post(f"/api/bookings/{later}/check-in/", {"week": 2, **two}).status_code == 400
    assert api(client).post(f"/api/bookings/{later}/check-in/", {"week": 2, **two, "scalp": "itchy"}).status_code == 204
    assert CheckIn.objects.get(booking_id=later).scalp == "itchy"


def test_a_stylist_stops_seeing_her_hair_once_she_turns_hair_details_off(api, setup, book, consent):
    from apps.bookings.models import Booking

    profile, client = setup
    consent(client, "personalisation")
    before = book(client, profile)
    assert "coily" in api(profile.account).get(f"/api/bookings/{before['id']}/").json()["clientHair"]
    assert "coily" in Booking.objects.get(pk=before["id"]).client_hair

    consent(client, "personalisation", granted=False)
    assert "clientHair" not in api(profile.account).get(f"/api/bookings/{before['id']}/").json()
    after = book(client, profile)
    assert Booking.objects.get(pk=after["id"]).client_hair == ""


def test_lapses_apply_on_read_even_if_the_job_is_late(api, setup, book):
    from apps.bookings.models import Booking

    profile, client = setup
    booking = book(client, profile)
    Booking.objects.filter(pk=booking["id"]).update(expires_at=timezone.now() - timedelta(minutes=1))
    assert api(client).get(f"/api/bookings/{booking['id']}/").json()["status"] == "expired"
    late_accept = api(profile.account).post(
        f"/api/bookings/{booking['id']}/accept/", {"scheduledFor": booking["requestedTimes"][0]}
    )
    assert late_accept.status_code == 409


def test_an_unclosed_appointment_completes_itself(api, setup, book):
    from apps.bookings.models import Booking

    profile, client = setup
    booking_id = _confirmed(api, profile, client, book)
    Booking.objects.filter(pk=booking_id).update(scheduled_for=timezone.now() - timedelta(days=3))
    assert api(client).get(f"/api/bookings/{booking_id}/").json()["status"] == "completed"


def test_a_travelling_stylist_gets_the_clients_address_once_confirmed(api, make_user, make_stylist, slot):
    profile = make_stylist()
    profile.service_models = ["home", "mobile"]
    profile.save()
    client = make_user()
    service = profile.menu_items.get(name="Knotless braids")
    as_client = api(client)
    body = {
        "stylistId": str(profile.account_id), "serviceId": str(service.pk), "bringingOwnHair": False,
        "requestedTimes": [slot(as_client, profile, service)], "policyVersion": "2026-09",
        "atClient": True, "clientAddress": "4 Choumert Grove, se15 4rb",
    }
    booking = as_client.post("/api/bookings/", body).json()
    assert booking["atClient"] and booking["area"] == "SE15"
    assert booking["address"] == "4 Choumert Grove, se15 4rb"  # the client sees their own
    as_stylist = api(profile.account)
    seen = as_stylist.get(f"/api/bookings/{booking['id']}/").json()
    assert seen["area"] == "SE15" and "address" not in seen  # not before confirming
    as_stylist.post(f"/api/bookings/{booking['id']}/accept/", {"scheduledFor": booking["requestedTimes"][0]})
    assert as_stylist.get(f"/api/bookings/{booking['id']}/").json()["address"] == "4 Choumert Grove, se15 4rb"


def test_coming_to_the_client_needs_a_postcode_and_a_stylist_who_travels(api, make_user, make_stylist, slot):
    profile = make_stylist()
    client = make_user()
    service = profile.menu_items.get(name="Knotless braids")
    as_client = api(client)
    body = {
        "stylistId": str(profile.account_id), "serviceId": str(service.pk), "bringingOwnHair": False,
        "requestedTimes": [slot(as_client, profile, service)], "policyVersion": "2026-09", "atClient": True,
        "clientAddress": "4 Choumert Grove, SE15 4RB",
    }
    assert "doesn’t travel" in as_client.post("/api/bookings/", body).json()["message"]
    profile.service_models = ["mobile"]
    profile.save()
    body["clientAddress"] = "4 Choumert Grove"
    assert "postcode" in as_client.post("/api/bookings/", body).json()["message"]


def test_outside_the_uk_a_home_visit_needs_a_street_and_an_area_not_a_postcode(api, make_user, make_stylist, slot):
    profile = make_stylist(country="GH")
    profile.service_models = ["mobile"]
    profile.save()
    service = profile.menu_items.get(name="Knotless braids")
    as_client = api(make_user())
    body = {
        "stylistId": str(profile.account_id), "serviceId": str(service.pk), "bringingOwnHair": False,
        "requestedTimes": [slot(as_client, profile, service)], "policyVersion": "2026-09", "atClient": True,
        "clientAddress": "12 Lagos Avenue",
    }
    assert "your area" in as_client.post("/api/bookings/", body).json()["message"]
    body["clientAddress"] = "House 12, Lagos Avenue, East Legon"
    booking = as_client.post("/api/bookings/", body).json()
    # She sees the area first, and the street only once she's confirmed.
    seen = api(profile.account).get(f"/api/bookings/{booking['id']}/").json()
    assert seen["area"] == "East Legon" and "address" not in seen


def test_a_move_lands_on_a_working_day_and_never_on_another_booking(api, setup, book, make_user):
    profile, client = setup
    booking_id = _confirmed(api, profile, client, book)
    url = f"/api/bookings/{booking_id}"
    sunday = _open_at(8)
    while sunday.isoweekday() != 7:
        sunday += timedelta(days=1)
    closed = api(client).post(f"{url}/move/", {"scheduledFor": _iso(sunday)})
    assert closed.status_code == 400 and "doesn’t work that day" in closed.json()["message"]
    late = api(client).post(f"{url}/move/", {"scheduledFor": _iso(_open_at(9, hour=21))})
    assert late.status_code == 400 and "outside" in late.json()["message"]
    # The stylist may move her own appointment to a Sunday.
    assert api(profile.account).post(f"{url}/move/", {"scheduledFor": _iso(sunday)}).status_code == 200


def test_a_confirmed_booking_has_a_calendar_file(api, setup, book):
    profile, client = setup
    booking_id = _confirmed(api, profile, client, book)
    url = api(client).get(f"/api/bookings/{booking_id}/").json()["calendarUrl"]
    path = url.split("://", 1)[1].split("/", 1)[1]
    response = api().client.get("/" + path)  # no sign-in: the phone's calendar opens it
    body = response.content.decode()
    assert response.status_code == 200 and response["Content-Type"].startswith("text/calendar")
    assert "BEGIN:VEVENT" in body and "DTSTART:" in body and profile.display_name in body
    assert api().client.get("/api/bookings/calendar/forged.ics").status_code == 404


def test_her_notice_hides_times_too_soon_and_the_server_holds_to_it(api, setup, make_user):
    from apps.stylists.models import StylistProfile

    profile, client = setup
    knotless = profile.menu_items.get(name="Knotless braids")
    url = f"/api/stylists/by-handle/{profile.handle}/slots/"

    def first_free(hours_notice=None):
        if hours_notice:
            StylistProfile.objects.filter(pk=profile.pk).update(
                availability={**profile.availability, "lead_hours": hours_notice}
            )
        days = api().get(url, service=str(knotless.pk)).json()["days"]
        return timezone.datetime.fromisoformat(days[0]["times"][0].replace("Z", "+00:00"))

    # A day's notice unless she says otherwise; three days when she asks for that.
    assert first_free() >= timezone.now() + timedelta(hours=24)
    assert first_free(72) >= timezone.now() + timedelta(hours=72)

    # A time inside her notice is refused, whatever an old page offered.
    soon = (timezone.now() + timedelta(hours=30)).replace(minute=0, second=0, microsecond=0)
    body = {
        "stylistId": str(profile.account_id),
        "serviceId": str(knotless.pk),
        "bringingOwnHair": False,
        "requestedTimes": [soon.isoformat()],
        "policyVersion": "2026-09",
    }
    refused = api(client).post("/api/bookings/", body)
    assert refused.status_code == 400 and "3 days’ notice" in refused.json()["message"]
    # One of the usual choices or her own number of hours, from an hour to 30 days.
    me = api(profile.account)
    for wrong in (0, -3, 721, "12", True, 1.5):
        assert me.patch("/api/stylists/me/", {"availability": {**profile.availability, "leadHours": wrong}}).status_code == 400
    assert me.patch("/api/stylists/me/", {"availability": {**profile.availability, "leadHours": 36}}).status_code == 200
    assert me.get("/api/stylists/me/").json()["availability"]["leadHours"] == 36
    refused = api(client).post("/api/bookings/", body)
    assert "36 hours’ notice" in refused.json()["message"]


def test_a_time_already_gone_cant_be_accepted_or_suggested(api, setup, book):
    from apps.bookings.models import Booking

    profile, client = setup
    booking = book(client, profile)
    past = (timezone.now() - timedelta(hours=1)).isoformat()
    Booking.objects.filter(pk=booking["id"]).update(requested_times=[timezone.now() - timedelta(hours=1)])
    stylist = api(profile.account)
    assert stylist.post(f"/api/bookings/{booking['id']}/accept/", {"scheduledFor": past}).status_code == 400
    assert stylist.post(f"/api/bookings/{booking['id']}/propose/", {"scheduledFor": past}).status_code == 400
