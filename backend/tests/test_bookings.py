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
    assert timedelta(hours=47) < lapses - timezone.now() <= timedelta(hours=48)


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
    assert late.status_code == 400 and "outside the stylist’s hours" in late.json()["message"]


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


def test_the_stylist_sees_her_record_and_hair_the_client_never_does(api, setup, book):
    from apps.bookings.models import Booking

    profile, client = setup
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
    api(profile.account).post(f"/api/bookings/{second['id']}/propose/", {"scheduledFor": later})
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
