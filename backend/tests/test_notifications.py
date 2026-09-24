"""
Notifications: booking changes tell the right person once, reminders fire in their
windows, muted categories are logged but not sent, and pushes go to Expo tokens.
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.common.models import NotificationLog

pytestmark = pytest.mark.django_db


def keys(user):
    return set(NotificationLog.objects.filter(user=user).values_list("event_key", flat=True))


@pytest.fixture
def setup(make_stylist, make_user):
    return make_stylist(deposit="fixed"), make_user(texture="coily")


def test_each_booking_step_tells_the_other_person_once(api, setup, book):
    profile, client = setup
    booking = book(client, profile)
    stylist = profile.account
    assert keys(stylist) == {f"booking:{booking['id']}:requested"}
    log = NotificationLog.objects.get(user=stylist)
    assert log.data["mode"] == "stylist" and log.data["url"] == f"/requests/{booking['id']}"

    url = f"/api/bookings/{booking['id']}"
    api(stylist).post(
        f"{url}/accept/",
        {"scheduledFor": booking["requestedTimes"][0], "deposit": {"amount": 20, "method": "Monzo"}},
    )
    assert f"booking:{booking['id']}:accepted" in keys(client)
    assert "Send £20" in NotificationLog.objects.get(event_key=f"booking:{booking['id']}:accepted").body

    # Saving again without a change sends nothing new.
    from apps.bookings.models import Booking

    before = NotificationLog.objects.count()
    Booking.objects.get(pk=booking["id"]).save()
    assert NotificationLog.objects.count() == before


def test_a_lapsed_request_tells_the_client_and_the_waitlist(api, setup, book, make_user):
    from apps.bookings.held import sweep
    from apps.bookings.models import Booking, SlotInterest

    profile, client = setup
    booking = book(client, profile)
    b = Booking.objects.get(pk=booking["id"])
    waiting = make_user(texture="coily")
    day = b.requested_times[0].date()
    SlotInterest.objects.create(
        client=waiting,
        stylist=profile.account,
        stylist_name="Ama",
        stylist_handle=profile.handle,
        from_date=day - timedelta(days=1),
        to_date=day + timedelta(days=1),
    )
    Booking.objects.filter(pk=b.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
    sweep()
    assert f"booking:{b.pk}:expired" in keys(client)
    slot_log = NotificationLog.objects.get(user=waiting)
    assert slot_log.category == "waitlist" and slot_log.data["url"].startswith(f"/book/{profile.handle}")


def test_reminders_land_in_their_windows(setup, book, api):
    from apps.bookings.models import Booking
    from apps.bookings.tasks import send_reminders

    profile, client = setup
    booking = book(client, profile)
    b = Booking.objects.get(pk=booking["id"])
    start = b.requested_times[0]
    Booking.objects.filter(pk=b.pk).update(status="confirmed", scheduled_for=start)

    send_reminders(now=start - timedelta(hours=60))
    assert f"booking:{b.pk}:prep" in keys(client)
    send_reminders(now=start - timedelta(hours=20))
    attendance = NotificationLog.objects.get(event_key=f"booking:{b.pk}:attendance")
    assert attendance.data["_category"] == "attendance" and attendance.data["bookingId"] == str(b.pk)
    send_reminders(now=start - timedelta(hours=20))  # a second run sends nothing twice
    assert NotificationLog.objects.filter(event_key__endswith=":attendance").count() == 1
    send_reminders(now=start - timedelta(hours=6))
    assert f"booking:{b.pk}:unconfirmed" in keys(profile.account)


def test_muted_categories_are_logged_not_sent_and_account_cannot_be_muted(api, make_user):
    from apps.common.notifications import notify

    user = make_user()
    me = api(user)
    got = me.client.put(
        "/api/notifications/preferences/", {"muted": ["reminders", "account", "nope"]}, format="json"
    ).json()
    on = {c["id"]: c["on"] for c in got["categories"]}
    assert on["reminders"] is False and on["account"] is True
    assert notify(user.pk, "reminders", "k1", "t", "b").status == "muted"
    assert notify(user.pk, "account", "k2", "t", "b").status == "queued"
    assert notify(user.pk, "account", "k2", "t", "b") is None  # idempotent


def test_push_goes_to_expo_tokens_and_forgets_dead_ones(make_user, settings, monkeypatch):
    from apps.accounts.models import DeviceToken
    from apps.common import notifications

    user = make_user()
    DeviceToken.objects.create(user=user, token="ExponentPushToken[a]", platform="android")
    DeviceToken.objects.create(user=user, token="ExponentPushToken[b]", platform="ios")
    log = notifications.notify(user.pk, "account", "k", "Hi", "There", url="/x", action_category="attendance")
    settings.PUSH_DELIVERY = "expo"
    sent = []

    def fake_post(messages):
        sent.extend(messages)
        return [{"status": "ok"}, {"status": "error", "details": {"error": "DeviceNotRegistered"}}]

    monkeypatch.setattr(notifications, "_post_to_expo", fake_post)
    notifications.send_push(str(log.pk))
    assert {m["to"] for m in sent} == {"ExponentPushToken[a]", "ExponentPushToken[b]"}
    assert sent[0]["categoryId"] == "attendance" and "_category" not in sent[0]["data"]
    assert list(DeviceToken.objects.values_list("token", flat=True)) == ["ExponentPushToken[a]"]
    log.refresh_from_db()
    assert log.status == "sent"


def test_registering_the_same_token_again_moves_it(api, make_user):
    a, b = make_user(), make_user()
    body = {"token": "ExponentPushToken[z]", "platform": "android"}
    assert api(a).post("/api/devices/", body).status_code == 201
    assert api(b).post("/api/devices/", body).status_code == 201
    from apps.accounts.models import DeviceToken

    assert DeviceToken.objects.get().user == b
