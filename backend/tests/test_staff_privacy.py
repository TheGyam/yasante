"""What staff can see of people's personal data, and the trail of when they looked."""

from datetime import timedelta

import pytest
from django.contrib.admin.models import LogEntry
from django.contrib.auth.models import Permission
from django.utils import timezone

from tests.test_staff import staff_client

pytestmark = pytest.mark.django_db


def fields(response):
    return {field["name"]: field for section in response.json()["sections"] for field in section["fields"]}


def test_sign_in_tokens_are_never_shown_and_sessions_can_be_ended(make_user):
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
    from rest_framework_simplejwt.tokens import RefreshToken

    client, _ = staff_client(make_user, superuser=True)
    person = make_user()
    RefreshToken.for_user(person)
    token = OutstandingToken.objects.get(user=person)
    shown = fields(client.get(f"/data/forms/token_blacklist/outstandingtoken/{token.pk}/"))
    assert "token" not in shown and "jti" in shown
    assert "eyJ" not in client.get("/data/export/token_blacklist/outstandingtoken/").content.decode()
    review = client.post("/data/actions/token_blacklist/outstandingtoken/", {"action": "end_sessions", "ids": [token.pk]}).json()
    client.post("/data/actions/token_blacklist/outstandingtoken/", {"action": "end_sessions", "ids": [token.pk], "confirm": "yes", "token": review["token"]})
    assert BlacklistedToken.objects.filter(token=token).exists()


def test_push_tokens_and_exact_coordinates_are_not_shown(make_user):
    from apps.accounts.models import DeviceToken
    from apps.profiles.models import HairProfile

    client, _ = staff_client(make_user, superuser=True)
    person = make_user()
    device = DeviceToken.objects.create(user=person, token="ExponentPushToken[secret]", platform="ios")
    assert "token" not in fields(client.get(f"/data/forms/accounts/devicetoken/{device.pk}/"))
    profile = HairProfile.objects.create(user=person, postcode="SE15 4QJ", latitude=51.47, longitude=-0.07)
    shown = fields(client.get(f"/data/forms/profiles/hairprofile/{profile.pk}/"))
    assert "latitude" not in shown and "longitude" not in shown
    assert shown["postcode"]["masked"] and shown["postcode"]["value"] == ""


def test_a_phone_number_is_hidden_until_revealed_and_revealing_is_logged(make_user):
    client, admin = staff_client(make_user, superuser=True)
    person = make_user(name="Ama")
    phone = fields(client.get(f"/data/forms/accounts/user/{person.pk}/"))["phone"]
    assert phone["masked"] and phone["hasValue"] and phone["value"] == "" and phone["canReveal"]
    assert person.phone not in client.get(f"/data/forms/accounts/user/{person.pk}/").content.decode()
    assert client.get("/data/" + phone["revealPath"]).json() == {"value": person.phone}
    entry = LogEntry.objects.filter(user=admin, object_id=str(person.pk)).latest("action_time")
    assert entry.change_message == "Viewed phone"


def test_revealing_needs_the_permission(make_user):
    client, staff = staff_client(make_user)
    staff.user_permissions.add(Permission.objects.get(codename="view_user"))
    person = make_user()
    phone = fields(client.get(f"/data/forms/accounts/user/{person.pk}/"))["phone"]
    assert phone["masked"] and not phone["canReveal"]
    assert client.get("/data/" + phone["revealPath"]).status_code == 403
    staff.user_permissions.add(Permission.objects.get(codename="reveal_personal_data"))
    assert client.get("/data/" + phone["revealPath"]).json() == {"value": person.phone}


def form_as_shown(client, person):
    """The body the workspace sends back for a record saved without touching anything."""
    form = client.get(f"/data/forms/accounts/user/{person.pk}/").json()
    body = {"_revision": form["revision"]}
    for section in form["sections"]:
        for field in section["fields"]:
            if field["kind"] == "readonly" or field.get("masked") or field["name"] == "password":
                continue
            value = field["value"]
            if field["kind"] == "checkbox":
                if value:
                    body[field["name"]] = "on"
            elif field["kind"] == "datetime":
                body[f"{field['name']}_0"], body[f"{field['name']}_1"] = value
            else:
                body[field["name"]] = "" if value is None else value
    return body


def test_saving_without_revealing_keeps_the_hidden_value(make_user):
    client, _ = staff_client(make_user, superuser=True)
    person = make_user(name="Ama")
    body = form_as_shown(client, person)
    body["name"] = "Ama Mensah"
    before = person.phone
    assert client.post(f"/data/forms/accounts/user/{person.pk}/", body).status_code == 200
    person.refresh_from_db()
    assert person.name == "Ama Mensah" and person.phone == before


def test_exports_are_logged(make_user):
    client, admin = staff_client(make_user, superuser=True)
    client.get("/data/export/accounts/user/?q=ama")
    entry = LogEntry.objects.filter(user=admin).latest("action_time")
    assert entry.change_message.startswith("Exported") and "q=ama" in entry.change_message


def test_individual_browsing_trails_are_for_superusers(make_user):
    client, staff = staff_client(make_user)
    for codename in ("view_searchlog", "view_pageview", "view_analyticsevent"):
        staff.user_permissions.add(Permission.objects.get(codename=codename))
    assert client.get("/data/records/common/searchlog/").status_code == 403
    assert client.get("/data/records/stylists/pageview/").status_code == 403
    assert client.get("/data/records/profiles/analyticsevent/").status_code == 403
    admin_client, _ = staff_client(make_user, superuser=True)
    assert admin_client.get("/data/records/common/searchlog/").status_code == 200


def test_retention_forgets_who_then_deletes(make_user, make_stylist):
    from apps.common.models import SearchLog
    from apps.common.tasks import enforce_retention
    from apps.profiles.models import AnalyticsEvent
    from apps.stylists.models import PageView

    person = make_user()
    now = timezone.now()
    old_event = AnalyticsEvent.objects.create(user=person, name="opened", at=now - timedelta(days=400))
    new_event = AnalyticsEvent.objects.create(user=person, name="opened", at=now - timedelta(days=10))
    search = SearchLog.objects.create(surface="looks", query="braids", result_count=3)
    SearchLog.objects.filter(pk=search.pk).update(created_at=now - timedelta(days=120))
    ancient = SearchLog.objects.create(surface="looks", query="twists", result_count=0)
    SearchLog.objects.filter(pk=ancient.pk).update(created_at=now - timedelta(days=400))
    view = PageView.objects.create(stylist=make_stylist(), viewer=person)
    PageView.objects.filter(pk=view.pk).update(viewed_at=now - timedelta(days=120))

    enforce_retention()

    assert not AnalyticsEvent.objects.filter(pk=old_event.pk).exists()
    assert AnalyticsEvent.objects.filter(pk=new_event.pk).exists()
    assert SearchLog.objects.filter(pk=search.pk).exists()
    assert not SearchLog.objects.filter(pk=ancient.pk).exists()
    view.refresh_from_db()
    assert view.viewer is None


def test_history_records_only_what_was_changed(make_user):
    # roles has a callable default, so Django compared it with a hidden "initial-" copy the
    # workspace never sends: every save logged "Changed Name and Roles."
    client, _ = staff_client(make_user, superuser=True)
    person = make_user(name="Ama")
    body = form_as_shown(client, person)
    body["name"] = "Ama Mensah"
    assert client.post(f"/data/forms/accounts/user/{person.pk}/", body).status_code == 200
    entry = LogEntry.objects.filter(object_id=str(person.pk)).latest("action_time")
    assert entry.get_change_message() == "Changed Name."
    body = form_as_shown(client, person)
    body["roles"] = "client,stylist"
    client.post(f"/data/forms/accounts/user/{person.pk}/", body)
    assert LogEntry.objects.filter(object_id=str(person.pk)).latest("action_time").get_change_message() == "Changed Roles."


def test_view_only_staff_see_yes_and_no(make_user):
    # Read-only booleans arrive from the admin as an icon; stripping the tag left nothing.
    client, staff = staff_client(make_user)
    staff.user_permissions.add(Permission.objects.get(codename="view_user"))
    person = make_user(name="Ama & Co")
    shown = fields(client.get(f"/data/forms/accounts/user/{person.pk}/"))
    assert shown["is_active"]["kind"] == "readonly" and shown["is_active"]["value"] == "Yes"
    assert shown["is_staff"]["value"] == "No"
    assert shown["name"]["value"] == "Ama & Co"


def test_a_stylists_address_is_there_to_reveal(make_user, make_stylist):
    client, _ = staff_client(make_user, superuser=True)
    profile = make_stylist()
    type(profile).objects.filter(pk=profile.pk).update(address="12 QA Road, Peckham, SE15 4QA")
    address = fields(client.get(f"/data/forms/stylists/stylistprofile/{profile.pk}/"))["address"]
    assert address["masked"] and address["hasValue"] and address["value"] == ""
    shown = client.get("/data/" + address["revealPath"]).json()
    assert shown["value"] == "12 QA Road, Peckham, SE15 4QA"
