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
    assert history["recipients"] == 3 and history["sent"] == 3


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
