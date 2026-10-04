"""Push notifications from the workspace: who they reach, and the rules that protect people."""

import json

import pytest
from django.contrib.auth.models import Permission

from apps.accounts.models import DeviceToken
from apps.common.models import NotificationLog, NotificationPreference
from apps.staff.models import Broadcast
from tests.test_staff import staff_client

pytestmark = pytest.mark.django_db


def payload(**changes):
    message = {"kind": "update", "title": "We’re back", "body": "Bookings work again.", "url": "", "audience": {"who": "everyone"}}
    message.update(changes)
    return {"payload": json.dumps(message)}


def phone(user, platform="ios"):
    DeviceToken.objects.create(user=user, token=f"ExponentPushToken[{user.pk}]", platform=platform)
    return user


def test_updates_reach_everyone_with_a_phone_and_news_only_those_who_said_yes(make_user):
    client, _ = staff_client(make_user, superuser=True)
    keen = phone(make_user())
    NotificationPreference.objects.create(user=keen, opted_in=["news"])
    phone(make_user())
    make_user()  # no phone
    update = client.post("/data/broadcasts/audience/", payload()).json()
    news = client.post("/data/broadcasts/audience/", payload(kind="news")).json()
    assert update["reachable"] >= 2 and update["noDevice"] >= 1
    assert news["reachable"] == 1 and news["notOptedIn"] >= 1


def test_audiences_narrow_by_role_platform_and_people(make_user):
    client, _ = staff_client(make_user, superuser=True)
    stylist = phone(make_user(roles=("client", "stylist")), "android")
    phone(make_user())
    assert client.post("/data/broadcasts/audience/", payload(audience={"who": "stylists"})).json()["reachable"] == 1
    assert client.post("/data/broadcasts/audience/", payload(audience={"who": "everyone", "platform": "android"})).json()["reachable"] == 1
    chosen = client.post("/data/broadcasts/audience/", payload(audience={"who": "people", "people": [str(stylist.pk)]})).json()
    assert chosen["reachable"] == 1


def test_sending_delivers_once_to_each_person_and_is_recorded(make_user, django_capture_on_commit_callbacks):
    client, admin = staff_client(make_user, superuser=True)
    people = [phone(make_user()) for _ in range(3)]
    count = client.post("/data/broadcasts/audience/", payload(audience={"who": "people", "people": [str(p.pk) for p in people]})).json()["reachable"]
    with django_capture_on_commit_callbacks(execute=True):
        response = client.post("/data/broadcasts/send/", {**payload(audience={"who": "people", "people": [str(p.pk) for p in people]}), "expected": str(count)})
    assert response.json()["recipients"] == 3
    broadcast = Broadcast.objects.get()
    assert broadcast.sent_by == admin and broadcast.finished_at is not None
    logs = NotificationLog.objects.filter(event_key__startswith=broadcast.event_prefix)
    assert logs.count() == 3 and set(logs.values_list("category", flat=True)) == {"account"}
    history = client.get("/data/broadcasts/").json()["items"][0]
    # Tests don't send for real: they're recorded as logged only, and said to be.
    assert history["recipients"] == 3 and history["logged"] == 3 and history["delivered"] == 0


def test_a_changed_audience_must_be_confirmed_again(make_user):
    client, _ = staff_client(make_user, superuser=True)
    phone(make_user())
    response = client.post("/data/broadcasts/send/", {**payload(), "expected": "999"})
    assert response.status_code == 409 and "reachable" in response.json()


def test_news_goes_out_at_most_once_a_day(make_user):
    client, _ = staff_client(make_user, superuser=True)
    keen = phone(make_user())
    NotificationPreference.objects.create(user=keen, opted_in=["news"])
    first = client.post("/data/broadcasts/send/", {**payload(kind="news"), "expected": "1"})
    assert first.status_code == 200
    again = client.post("/data/broadcasts/send/", {**payload(kind="news"), "expected": "1"})
    assert again.status_code == 409


def test_links_must_stay_inside_the_app(make_user):
    client, _ = staff_client(make_user, superuser=True)
    assert client.post("/data/broadcasts/audience/", payload(url="https://evil.example")).status_code == 400
    assert client.post("/data/broadcasts/audience/", payload(url="//evil.example")).status_code == 400
    assert client.post("/data/broadcasts/audience/", payload(url="/looks")).status_code == 200


def test_sending_needs_the_permission(make_user):
    client, staff = staff_client(make_user)
    assert client.post("/data/broadcasts/audience/", payload()).status_code == 403
    staff.user_permissions.add(Permission.objects.get(codename="add_broadcast"))
    assert client.post("/data/broadcasts/audience/", payload()).status_code == 200


def test_news_is_off_until_switched_on_in_the_app(make_user, api):
    person = make_user()
    client = api(person).client
    categories = {c["id"]: c["on"] for c in client.get("/api/notifications/preferences/").json()["categories"]}
    assert categories["news"] is False and categories["reminders"] is True
    turned_on = client.put("/api/notifications/preferences/", {"categories": [{"id": "news", "on": True}]}, format="json").json()
    assert {c["id"]: c["on"] for c in turned_on["categories"]}["news"] is True
    assert NotificationPreference.objects.get(user=person).opted_in == ["news"]


def test_health_says_when_the_server_isnt_sending_and_explains_failures(make_user):
    client, admin = staff_client(make_user, superuser=True)
    phone(admin)
    NotificationLog.objects.create(user=admin, category="account", event_key="x1", title="t", body="b", status="failed", error="InvalidCredentials: Unable to retrieve the FCM server key")
    health = client.get("/data/broadcasts/health/").json()
    assert health["sending"] is False and health["yours"] == 1 and health["phones"] == {"ios": 1}
    assert "FCM V1" in health["problems"][0]["problem"]


def test_receipts_turn_accepted_into_delivered_or_failed(make_user, monkeypatch, settings):
    from datetime import timedelta

    from django.utils import timezone

    from apps.common import notifications

    person = phone(make_user())
    other = phone(make_user(), "android")
    ok = NotificationLog.objects.create(user=person, category="account", event_key="r1", title="t", body="b", status="sent", tickets=[["t-ok", f"ExponentPushToken[{person.pk}]"]])
    bad = NotificationLog.objects.create(user=other, category="account", event_key="r2", title="t", body="b", status="sent", tickets=[["t-gone", f"ExponentPushToken[{other.pk}]"]])
    NotificationLog.objects.filter(pk__in=[ok.pk, bad.pk]).update(sent_at=timezone.now() - timedelta(minutes=20))

    class Answer:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return json.dumps({"data": {
                "t-ok": {"status": "ok"},
                "t-gone": {"status": "error", "message": "not registered", "details": {"error": "DeviceNotRegistered"}},
            }}).encode()

    monkeypatch.setattr(notifications.urllib.request, "urlopen", lambda *a, **k: Answer())
    notifications.check_push_receipts()
    ok.refresh_from_db()
    bad.refresh_from_db()
    assert ok.status == "delivered"
    assert bad.status == "failed" and bad.error.startswith("DeviceNotRegistered")
    assert not DeviceToken.objects.filter(user=other).exists()


def test_the_worker_knows_every_job_the_workspace_hands_it():
    """Celery only loads tasks.py; a job defined elsewhere is dropped as unknown."""
    from config.celery import app

    app.loader.import_default_modules()
    for name in (
        "apps.staff.broadcasts.send_broadcast",
        "apps.staff.tasks.resume_broadcasts",
        "apps.common.notifications.send_push",
        "apps.common.notifications.check_push_receipts",
    ):
        assert name in app.tasks, name
    # Every job on the schedule must be one the worker can run.
    for entry in app.conf.beat_schedule.values():
        assert entry["task"] in app.tasks, entry["task"]


def test_a_send_that_never_ran_is_resumed_once_per_person(make_user, django_capture_on_commit_callbacks):
    from datetime import timedelta

    from django.utils import timezone

    from apps.staff.tasks import resume_broadcasts

    people = [phone(make_user()) for _ in range(2)]
    broadcast = Broadcast.objects.create(
        kind="update", title="t", body="b", audience={"who": "people", "people": [str(p.pk) for p in people], "platform": "any", "joined": "any", "area": ""},
        audience_summary="2 chosen people", recipients=2,
    )
    Broadcast.objects.filter(pk=broadcast.pk).update(created_at=timezone.now() - timedelta(minutes=10))
    resume_broadcasts()
    resume_broadcasts()  # running twice must not send twice
    assert NotificationLog.objects.filter(event_key__startswith=broadcast.event_prefix).count() == 2
    broadcast.refresh_from_db()
    assert broadcast.finished_at is not None


def test_check_now_reads_answers_straight_away_and_records_when(make_user, monkeypatch):
    from apps.common import notifications

    client, admin = staff_client(make_user, superuser=True)
    phone(admin)
    log = NotificationLog.objects.create(user=admin, category="account", event_key="now1", title="t", body="b", status="sent", tickets=[["t-now", f"ExponentPushToken[{admin.pk}]"]])
    from django.utils import timezone

    NotificationLog.objects.filter(pk=log.pk).update(sent_at=timezone.now())

    class Answer:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return json.dumps({"data": {"t-now": {"status": "ok"}}}).encode()

    monkeypatch.setattr(notifications.urllib.request, "urlopen", lambda *a, **k: Answer())
    assert client.get("/data/broadcasts/health/").json()["receiptsCheckedAt"] is None
    assert client.post("/data/broadcasts/receipts/").json()["checked"] == 1
    log.refresh_from_db()
    assert log.status == "delivered"
    assert client.get("/data/broadcasts/health/").json()["receiptsCheckedAt"]
