"""The user, her hair profile, consent, analytics, export and deletion."""

import pytest

pytestmark = pytest.mark.django_db


def test_get_and_update_a_user(api, make_user):
    user = make_user(texture="coily")
    me = api(user).get(f"/api/users/{user.pk}/").json()
    assert me["name"] == user.name
    assert me["hairProfile"]["texture"] == "coily"
    changed = api(user).patch(f"/api/users/{user.pk}/", {"name": "New Name"})
    assert changed.status_code == 200 and changed.json()["name"] == "New Name"
    other = make_user()
    assert api(other).patch(f"/api/users/{user.pk}/", {"name": "x"}).status_code == 403


def test_hair_profile_keeps_two_lengths_and_a_snapshot_each_change(api, make_user):
    from apps.profiles.models import HairProfileSnapshot

    user = make_user()
    url = f"/api/users/{user.pk}/hair-profile/"
    first = api(user).patch(url, {"texture": "kinky", "length": "mid-back", "shrunkLength": "shoulder"})
    assert first.status_code == 200
    assert first.json()["length"] == "mid-back" and first.json()["shrunkLength"] == "shoulder"
    api(user).patch(url, {"chemicals": []})
    assert HairProfileSnapshot.objects.filter(user=user).count() == 2
    bad = api(user).patch(url, {"texture": "spiky"})
    assert bad.status_code == 400


def test_empty_fields_are_left_out_not_sent_blank(api, make_user):
    user = make_user()
    body = api(user).get(f"/api/users/{user.pk}/").json()
    assert "avatarUri" not in body


def test_consents_are_kept_as_a_history(api, make_user):
    from apps.profiles.models import ConsentRecord

    user = make_user()
    body = {
        "consents": [
            {"purpose": "analytics", "granted": True, "policyVersion": "v1", "recordedAt": "2026-09-01T10:00:00Z", "source": "ios"},
            {"purpose": "analytics", "granted": False, "policyVersion": "v1", "recordedAt": "2026-09-02T10:00:00Z"},
        ]
    }
    assert api(user).post("/api/consents/", body).status_code == 201
    assert ConsentRecord.objects.filter(user=user).count() == 2


def test_events_are_dropped_once_analytics_consent_is_withdrawn(api, make_user):
    from apps.profiles.models import AnalyticsEvent, ConsentRecord

    user = make_user()
    event = {"events": [{"name": "view_look", "at": "2026-09-22T10:00:00Z", "localAt": "2026-09-22T11:00:00+01:00"}]}
    assert api().post("/api/events/", {**event, "anonymousId": "anon_1"}).status_code == 201
    assert api(user).post("/api/events/", event).status_code == 201
    assert AnalyticsEvent.objects.count() == 2
    ConsentRecord.objects.create(user=user, purpose="analytics", granted=False, policy_version="v1", recorded_at="2026-09-22T12:00:00Z")
    assert api(user).post("/api/events/", event).status_code == 202
    assert AnalyticsEvent.objects.count() == 2


def test_export_and_delete_are_hers_alone(api, make_user, make_stylist, book):
    from apps.accounts.models import User
    from apps.bookings.models import Booking

    user = make_user()
    other = make_user()
    assert api(other).post(f"/api/users/{user.pk}/export/").status_code == 403
    assert "requestedAt" in api(user).post(f"/api/users/{user.pk}/export/").json()

    profile = make_stylist()
    booking = book(user, profile)
    assert api(other).delete(f"/api/users/{user.pk}/").status_code == 403
    assert api(user).delete(f"/api/users/{user.pk}/").status_code == 204
    assert not User.objects.filter(pk=user.pk).exists()
    # Bookings stay for the stylist's records, with the name taken off.
    kept = Booking.objects.get(pk=booking["id"])
    assert kept.client_name == "Deleted account"


def test_an_account_is_only_readable_by_its_owner(api, make_user):
    me, other = make_user(), make_user()
    assert api(me).get(f"/api/users/{me.pk}/").json()["email"] == me.email
    # Someone else's email and phone stay private, and a stranger's id looks like no id.
    assert api(me).get(f"/api/users/{other.pk}/").status_code == 404
    assert api().get(f"/api/users/{me.pk}/").status_code == 401


def test_usernames_are_what_posts_show_and_share_a_namespace_with_handles(api, make_user, make_stylist, make_look):
    from apps.accounts.models import User

    me = make_user(name="Efua Mensah")
    look = make_look(me)
    # Before a username: first name only, never her full name.
    assert api().get(f"/api/looks/{look.pk}/").json()["authorName"] == "Efua"

    url = f"/api/users/{me.pk}/"
    assert api(me).patch(url, {"username": "@Efua.Braids"}).json()["username"] == "efua.braids"
    assert api().get(f"/api/looks/{look.pk}/").json()["authorName"] == "efua.braids"

    stylist = make_stylist()
    # A stylist's handle can't be taken as a username, nor a reserved word, nor bad shape.
    for bad in (stylist.handle, "bookings", "a", ".dot", "two..dots"):
        assert api(me).patch(url, {"username": bad}).status_code == 400, bad
    check = api(me).get("/api/users/username-check/", username=stylist.handle).json()
    assert check["available"] is False and check["reason"]
    # ...and a username can't become someone's stylist handle.
    other = make_user()
    User.objects.filter(pk=other.pk).update(username="takenname")
    assert api(stylist.account).get("/api/stylists/handle-available/", handle="takenname").json()["available"] is False

    # A stylist still posts as her brand.
    stylist_look = make_look(stylist.account, stylist=stylist)
    assert api().get(f"/api/looks/{stylist_look.pk}/").json()["authorName"] == stylist.display_name


def test_a_postcode_puts_them_on_the_map_privately(api, make_user, monkeypatch):
    from apps.common import geo
    from apps.profiles.models import HairProfile, HairProfileSnapshot

    monkeypatch.setattr(geo, "locate", lambda text: (51.47, -0.07) if text == "SE15 4QJ" else None)
    user = make_user()
    body = api(user).patch(f"/api/users/{user.pk}/hair-profile/", {"postcode": "SE15 4QJ", "area": "Peckham"}).json()
    assert body["postcode"] == "SE15 4QJ" and "latitude" not in body
    hair = HairProfile.objects.get(user=user)
    assert (hair.latitude, hair.longitude) == (51.47, -0.07)
    assert HairProfileSnapshot.objects.filter(user=user).exists()  # history still kept, without the location


def test_tips_come_from_the_server(api):
    tips = api().get("/api/tips/").json()
    assert len(tips) >= 20 and all(t["text"] for t in tips)


def test_her_data_comes_as_a_file_with_everything_of_hers(api, make_user, make_stylist, make_look, book, mailoutbox):
    import json

    from apps.planner.models import Collection
    from apps.profiles.tasks import collect_user_data

    user = make_user(name="Efua Mensah")
    make_look(user, caption="Two weeks in")
    Collection.objects.create(user=user, name="Next time")
    profile = make_stylist()
    book(user, profile)
    api(user).post(f"/api/users/{user.pk}/export/")

    mail = mailoutbox[-1]
    assert mail.to == [user.email] and "Efua" in mail.body
    name, content, kind = mail.attachments[0]
    assert name == "yasante-data.json" and kind == "application/json"
    data = json.loads(content)
    assert data["account"]["email"] == user.email and "password" not in data["account"]
    assert [look["caption"] for look in data["looks"]] == ["Two weeks in"]
    assert [c["name"] for c in data["collections"]] == ["Next time"]
    assert len(data["bookings_as_client"]) == 1
    # The stylist's copy of her bookings leaves out where the client lives.
    stylist_data = collect_user_data(profile.account)
    assert stylist_data["bookings_as_stylist"] and "address" not in stylist_data["bookings_as_stylist"][0]
    assert stylist_data["stylist_menu"]
