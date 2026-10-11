"""
Nothing clashes: every time someone is waiting to hear about is held, a client is never
in two chairs, and a stylist is booked only as far ahead, as soon, and on the days she
says. Free times come a month or two at a time.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from django.utils import timezone

pytestmark = pytest.mark.django_db
LONDON = ZoneInfo("Europe/London")


def _at(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _iso(dt):
    return _at(dt.isoformat()).astimezone(ZoneInfo("UTC")).isoformat().replace("+00:00", "Z")


def _slots(as_api, profile, service=None, **params):
    if service is not None:
        params["service"] = str(service.pk)
    response = as_api.get(f"/api/stylists/by-handle/{profile.handle}/slots/", **params)
    assert response.status_code == 200, response.json()
    return response.json()


def _offered(found):
    return {_at(t) for day in found["days"] for t in day["times"]}


def _ask(as_api, profile, service, time, options=None):
    return as_api.post(
        "/api/bookings/",
        {
            "stylistId": str(profile.account_id),
            "serviceId": str(service.pk),
            "options": options or {},
            "requestedTimes": [time if isinstance(time, str) else _iso(time)],
            "policyVersion": "2026-09",
        },
    )


def _today():
    return timezone.now().astimezone(LONDON).date()


def test_an_unanswered_request_holds_its_time_until_it_lapses(api, make_stylist, make_user, book):
    from apps.bookings.models import Booking

    profile = make_stylist()
    knotless = profile.menu_items.get(name="Knotless braids")
    first = book(make_user(), profile)
    time = _at(first["requestedTimes"][0])
    assert time not in _offered(_slots(api(), profile, knotless))
    assert _ask(api(make_user()), profile, knotless, time).status_code == 409
    # Lapsed, even before the sweep has run: free again for anyone.
    Booking.objects.filter(pk=first["id"]).update(expires_at=timezone.now() - timedelta(minutes=1))
    assert time in _offered(_slots(api(), profile, knotless))
    assert _ask(api(make_user()), profile, knotless, time).status_code == 201


def test_a_suggested_time_is_held_for_the_client_and_the_one_asked_for_frees(api, make_stylist, make_user, book):
    profile = make_stylist()
    knotless = profile.menu_items.get(name="Knotless braids")
    asked = book(make_user(), profile)
    asked_at = _at(asked["requestedTimes"][0])
    other = next(t for t in sorted(_offered(_slots(api(), profile, knotless))) if t.date() != asked_at.date())
    url = f"/api/bookings/{asked['id']}"
    stylist = api(profile.account)
    # Accepting is for the time asked; anything else is a suggestion.
    wrong = stylist.post(f"{url}/accept/", {"scheduledFor": _iso(other)})
    assert wrong.status_code == 400 and "Suggest it instead" in wrong.json()["message"]
    assert stylist.post(f"{url}/propose/", {"scheduledFor": _iso(other)}).status_code == 200
    # The suggestion is the client's to answer: nobody else can take it meanwhile.
    assert _ask(api(make_user()), profile, knotless, other).status_code == 409
    assert _ask(api(make_user()), profile, knotless, asked_at).status_code == 201


def test_a_move_waiting_for_an_answer_holds_the_new_time(api, make_stylist, make_user, book):
    profile = make_stylist()
    knotless = profile.menu_items.get(name="Knotless braids")
    client = make_user()
    booking = book(client, profile)
    url = f"/api/bookings/{booking['id']}"
    api(profile.account).post(f"{url}/accept/", {"scheduledFor": booking["requestedTimes"][0]})

    # The times she could move to: her own appointment's time counts as free.
    moving = _slots(api(client), profile, booking=booking["id"])
    assert _at(booking["requestedTimes"][0]) in _offered(moving)
    assert moving["minutes"] == 300
    # Only she can ask that, for her own confirmed appointment.
    assert api(make_user()).get(f"/api/stylists/by-handle/{profile.handle}/slots/", booking=booking["id"]).status_code == 404

    target = next(t for t in sorted(_offered(moving)) if t.date() != _at(booking["requestedTimes"][0]).date())
    assert api(client).post(f"{url}/move/", {"scheduledFor": _iso(target)}).status_code == 200
    assert _ask(api(make_user()), profile, knotless, target).status_code == 409
    # A no frees it again.
    api(profile.account).post(f"{url}/move/answer/", {"accept": False})
    assert _ask(api(make_user()), profile, knotless, target).status_code == 201


def test_a_client_cant_be_in_two_chairs_at_once(api, make_stylist, make_user, book):
    one, two = make_stylist(), make_stylist()
    client = make_user()
    knotless = one.menu_items.get(name="Knotless braids")
    morning = _slots(api(), one, knotless)["days"][1]["times"][0]  # 09:00, a whole day free
    asked = book(client, one, time=morning)  # five hours
    time = _at(asked["requestedTimes"][0])
    cornrows = two.menu_items.get(name="Cornrows")
    # The other stylist is free then, but not for her: she's asked someone else.
    assert time in _offered(_slots(api(), two, cornrows, options="big"))
    hers = _slots(api(client), two, cornrows, options="big")
    assert time not in _offered(hers) and time + timedelta(hours=5) in _offered(hers)
    day = next(d for d in hers["days"] if d["date"] == time.astimezone(LONDON).date().isoformat())
    assert [(_at(b["start"]), b.get("mine")) for b in day["busy"]] == [(time, True)]
    refused = _ask(api(client), two, cornrows, time, {"size": "big"})
    assert refused.status_code == 409 and "already asked" in refused.json()["message"]


def test_one_client_can_only_have_two_requests_waiting_with_a_stylist(api, make_stylist, make_user, book):
    profile = make_stylist()
    cornrows = profile.menu_items.get(name="Cornrows")
    client = make_user()
    first = book(client, profile, cornrows, options={"size": "big"})
    book(client, profile, cornrows, options={"size": "big"})
    free = sorted(_offered(_slots(api(client), profile, cornrows, options="big")))
    third = api(client).post(
        "/api/bookings/",
        {
            "stylistId": str(profile.account_id),
            "serviceId": str(cornrows.pk),
            "options": {"size": "big"},
            "requestedTimes": [_iso(free[0])],
            "policyVersion": "2026-09",
        },
    )
    assert third.status_code == 409 and "2 requests waiting" in third.json()["message"]
    api(client).post(f"/api/bookings/{first['id']}/cancel/")
    book(client, profile, cornrows, options={"size": "big"})


def test_she_is_booked_as_far_ahead_as_she_says_a_month_at_a_time(api, make_stylist, make_user):
    profile = make_stylist()
    knotless = profile.menu_items.get(name="Knotless braids")
    today = _today()
    # Twelve weeks unless she says otherwise.
    found = _slots(api(), profile, knotless)
    assert found["lastDate"] == (today + timedelta(days=83)).isoformat()
    assert found["noticeHours"] == 24
    # Any days asked for, inside what's open, two months at most.
    late = _slots(api(), profile, knotless, **{"from": (today + timedelta(days=70)).isoformat(), "to": (today + timedelta(days=120)).isoformat()})
    dates = [d["date"] for d in late["days"]]
    assert dates and dates[0] >= (today + timedelta(days=70)).isoformat() and dates[-1] <= found["lastDate"]
    wide = _slots(api(), profile, knotless, **{"from": today.isoformat(), "to": (today + timedelta(days=80)).isoformat()})
    assert wide["days"][-1]["date"] <= (today + timedelta(days=61)).isoformat()
    # Her first time, and her first weekend one (she doesn't work Sundays).
    assert _at(found["soonest"]) == _at(found["days"][0]["times"][0])
    assert _at(found["weekend"]).astimezone(LONDON).weekday() == 5

    # Four weeks: a time beyond that isn't offered, and is refused.
    me = api(profile.account)
    assert me.patch("/api/stylists/me/", {"availability": {**profile.availability, "aheadDays": 28}}).status_code == 200
    assert me.patch("/api/stylists/me/", {"availability": {**profile.availability, "aheadDays": 30}}).status_code == 400
    assert _slots(api(), profile, knotless)["lastDate"] == (today + timedelta(days=27)).isoformat()
    beyond = datetime.combine(today + timedelta(days=40), datetime.min.time(), tzinfo=LONDON).replace(hour=10)
    while beyond.weekday() == 6:
        beyond += timedelta(days=1)
    refused = _ask(api(make_user()), profile, knotless, beyond)
    assert refused.status_code == 400 and "takes bookings up to" in refused.json()["message"]


def test_closing_a_day_stops_new_requests_but_keeps_whats_booked(api, make_stylist, make_user, book):
    profile = make_stylist()
    cornrows = profile.menu_items.get(name="Cornrows")
    booking = book(make_user(), profile, cornrows, options={"size": "big"})
    start = _at(booking["requestedTimes"][0])
    day = start.astimezone(LONDON).date()
    me = api(profile.account)
    closed = me.post("/api/stylists/me/closed-days/", {"date": day.isoformat()})
    assert closed.status_code == 200 and closed.json()["availability"]["closed"] == [day.isoformat()]

    found = _slots(api(), profile, cornrows, options="big")
    assert day.isoformat() in found["full"]
    assert day.isoformat() not in [d["date"] for d in found["days"]]
    later = start + timedelta(hours=4)
    refused = _ask(api(make_user()), profile, cornrows, later, {"size": "big"})
    assert refused.status_code == 409 and "fully booked that day" in refused.json()["message"], refused.json()
    # What's already on it goes ahead as normal.
    accepted = me.post(f"/api/bookings/{booking['id']}/accept/", {"scheduledFor": booking["requestedTimes"][0]})
    assert accepted.json()["status"] == "confirmed"

    reopened = me.post("/api/stylists/me/closed-days/", {"date": day.isoformat(), "closed": False})
    assert "closed" not in reopened.json()["availability"]
    assert day.isoformat() in [d["date"] for d in _slots(api(), profile, cornrows, options="big")["days"]]
    past = me.post("/api/stylists/me/closed-days/", {"date": (_today() - timedelta(days=1)).isoformat()})
    assert past.status_code == 400


def test_the_gap_she_keeps_between_clients(api, make_stylist, make_user, book):
    profile = make_stylist()
    cornrows = profile.menu_items.get(name="Cornrows")
    me = api(profile.account)
    assert me.patch("/api/stylists/me/", {"availability": {**profile.availability, "gapMinutes": 30}}).status_code == 200
    booking = book(make_user(), profile, cornrows, options={"size": "big"})  # two hours
    start = _at(booking["requestedTimes"][0])
    found = _slots(api(), profile, cornrows, options="big")
    same_day = next(d for d in found["days"] if d["date"] == start.astimezone(LONDON).date().isoformat())
    nexts = [_at(t) for t in same_day["times"] if _at(t) > start]
    assert nexts[0] == start + timedelta(hours=2, minutes=30)
    # The diary shows the appointment as it is, without the gap.
    assert [(_at(b["start"]), _at(b["end"])) for b in same_day["busy"]] == [(start, start + timedelta(hours=2))]


def test_waiting_for_days_she_isnt_taking_bookings_for_yet(api, make_stylist, make_user):
    from apps.bookings.held import open_new_days
    from apps.common.models import NotificationLog

    profile = make_stylist()
    me = api(profile.account)
    me.patch("/api/stylists/me/", {"availability": {**profile.availability, "aheadDays": 28}})
    client = make_user()
    start = datetime.combine(_today() + timedelta(days=40), datetime.min.time(), tzinfo=LONDON)
    body = {"stylistId": str(profile.account_id), "from": _iso(start), "to": _iso(start + timedelta(days=20))}
    waiting = api(client).post("/api/slot-interests/", body).json()
    assert waiting["opens"] is True
    # Asking twice is the same wait.
    assert api(client).post("/api/slot-interests/", body).json()["id"] == waiting["id"]
    open_new_days()
    assert not NotificationLog.objects.filter(user=client).exists()
    # She takes bookings further ahead: the days are open, and whoever waited hears.
    me.patch("/api/stylists/me/", {"availability": {**profile.availability, "aheadDays": 56}})
    told = NotificationLog.objects.get(user=client)
    assert "taking bookings for" in told.title and told.data["url"].startswith(f"/book/{profile.handle}?date=")
    assert api(client).get("/api/slot-interests/").json()[0]["openedOn"]
