"""Exercise the React form bridge against real Django validators and hooks."""

import pytest
from types import SimpleNamespace
from django.contrib import admin
from django.contrib.admin.models import LogEntry
from django.contrib.auth.models import Permission
from django.test import Client, override_settings

from apps.looks.models import Style
from .test_staff import staff_client

pytestmark = pytest.mark.django_db


def body_for(schema):
    body = {"_revision": schema.get("revision", "")}
    for section in schema.get("sections", []):
        for field in section["fields"]:
            if field["kind"] == "readonly":
                continue
            if field["kind"] == "checkbox":
                if field["value"]:
                    body[field["name"]] = "on"
            elif field["kind"] == "datetime":
                for index, value in enumerate(field["value"]):
                    body[f"{field['name']}_{index}"] = value
            elif field["kind"] == "array":
                body[field["name"]] = field["delimiter"].join(field["value"])
            else:
                body[field["name"]] = field["value"]
    for inline in schema.get("inlines", []):
        body.update({field["name"]: field["value"] for field in inline["management"]})
        for form in inline["forms"]:
            body.update(body_for(form))
    body["_revision"] = schema.get("revision", "")
    return body


@override_settings(ROOT_URLCONF="apps.staff.urls_host")
def test_all_registered_creation_forms_are_react_data(make_user):
    client, staff = staff_client(make_user, True)
    for group in admin.site.get_app_list(client.get("/data/overview/").wsgi_request):
      for entry in group["models"]:
        model = entry["model"]
        ma = admin.site.get_model_admin(model)
        result = client.get(f"/data/forms/{model._meta.app_label}/{model._meta.model_name}/")
        if not ma.has_add_permission(SimpleNamespace(user=staff)):
            assert result.status_code == 403
            continue
        assert result.status_code == 200, (model._meta.label, result.content)
        assert result.json()["sections"], model._meta.label
        assert "text/html" not in result["Content-Type"]


def test_create_edit_validation_history_and_conflict(make_user):
    client, _ = staff_client(make_user, True)
    path = "/data/forms/looks/style/"
    invalid = client.post(path, {"name": "", "slug": "spaces not allowed", "sort_order": "invalid"})
    assert invalid.status_code == 422
    assert any(field["errors"] for section in invalid.json()["sections"] for field in section["fields"])
    created = client.post(path, {"name": "React style", "slug": "react-style", "sort_order": 0})
    assert created.status_code == 200, created.content
    pk = created.json()["id"]
    schema = client.get(f"{path}{pk}/").json()
    body = body_for(schema)
    body["name"] = "Updated in React"
    assert client.post(f"{path}{pk}/", body).json()["saved"]
    assert Style.objects.get(pk=pk).name == "Updated in React"
    assert client.post(f"{path}{pk}/", body).status_code == 409
    history = client.get(f"/data/history/looks/style/{pk}/").json()
    assert len(history["entries"]) == 2
    assert LogEntry.objects.filter(object_id=pk).count() == 2


def test_user_hash_is_never_sent_and_read_only_staff_cannot_write(make_user):
    client, user = staff_client(make_user, True)
    person = make_user()
    path = f"/data/forms/accounts/user/{person.pk}/"
    response = client.get(path)
    assert response.status_code == 200
    assert person.password not in response.content.decode()
    user.is_superuser = False
    user.save()
    user.user_permissions.add(Permission.objects.get(content_type__app_label="accounts", codename="view_user"))
    schema = client.get(path).json()
    assert schema["editable"] is False
    assert client.post(path, {"_revision": schema["revision"], "name": "Forbidden"}).status_code == 403
    assert client.get(f"/data/delete/accounts/user/{person.pk}/").status_code == 403


def test_stylist_inline_edit_runs_existing_save_hooks(make_user, make_stylist):
    client, _ = staff_client(make_user, True)
    stylist = make_stylist()
    path = f"/data/forms/stylists/stylistprofile/{stylist.pk}/"
    result = client.get(path)
    assert result.status_code == 200, result.content
    schema = result.json()
    assert len(schema["inlines"]) == 2
    body = body_for(schema)
    body["display_name"] = "My React studio"
    menu = next(inline for inline in schema["inlines"] if inline["prefix"] == "menu_items")
    name = next(field["name"] for section in menu["forms"][0]["sections"] for field in section["fields"] if field["name"].endswith("-name"))
    body[name] = "Edited service"
    response = client.post(path, body)
    assert response.status_code == 200, response.content
    stylist.refresh_from_db()
    assert stylist.display_name == "My React studio"
    assert stylist.menu_items.filter(name="Edited service").exists()


def test_bulk_preview_is_read_only_and_deletion_is_confirmed(make_user):
    client, _ = staff_client(make_user, True)
    style = Style.objects.create(name="Delete me", slug="delete-me")
    path = "/data/actions/looks/style/"
    body = {"action": "delete_selected", "ids": [str(style.pk)]}
    preview = client.post(path, body)
    assert preview.status_code == 200, preview.content
    assert preview.json()["deletion"]["canDelete"]
    assert Style.objects.filter(pk=style.pk).exists()
    result = client.post(path, {**body, "confirm": "yes", "token": preview.json()["token"]})
    assert result.status_code == 200, result.content
    assert not Style.objects.filter(pk=style.pk).exists()


def test_workspace_login_logout_and_csrf(make_user):
    staff = make_user(is_staff=True)
    client = Client(enforce_csrf_checks=True, HTTP_HOST="admin.localhost")
    path = "/data/session/"
    token = client.get(path).json()["csrfToken"]
    assert client.post(path, {"username": staff.email, "password": "password123"}).status_code == 403
    logged_in = client.post(path, {"username": staff.email, "password": "password123", "csrfmiddlewaretoken": token})
    assert logged_in.status_code == 200, logged_in.content
    token = logged_in.json()["csrfToken"]
    logged_out = client.post(path, {"intent": "logout", "csrfmiddlewaretoken": token})
    assert logged_out.status_code == 200
    assert client.get("/data/overview/").status_code == 401


def test_all_matching_action_requires_current_review(make_user):
    client, _ = staff_client(make_user, True)
    first = Style.objects.create(name="One", slug="one")
    second = Style.objects.create(name="Two", slug="two")
    path = "/data/actions/looks/style/"
    body = {"action": "delete_selected", "all": "yes"}
    assert client.post(path, {**body, "confirm": "yes"}).status_code == 409
    preview = client.post(path, body).json()
    assert preview["count"] == 2
    Style.objects.create(name="New after preview", slug="new-after-preview")
    assert client.post(path, {**body, "confirm": "yes", "token": preview["token"]}).status_code == 409
    preview = client.post(path, body).json()
    assert client.post(path, {**body, "confirm": "yes", "token": preview["token"]}).json()["done"]
    assert not Style.objects.filter(pk__in=[first.pk, second.pk]).exists()


def test_quick_edits_validate_atomically_and_log_changes(make_user):
    from apps.content.models import Tip
    client, _ = staff_client(make_user, True)
    tip = Tip.objects.create(text="A useful tip", active=True, sort_order=0)
    path = "/data/quick-edit/content/tip/"
    schema = client.get(path).json()
    body = {"_revision": schema["revision"], **{field["name"]: field["value"] for field in schema["management"]}}
    for form in schema["forms"]:
        for field in form["fields"]:
            if field["kind"] != "checkbox" or field["value"]:
                body[field["name"]] = "on" if field["kind"] == "checkbox" else field["value"]
    target = next(form for form in schema["forms"] if form["label"] == str(tip))
    sort_field = next(field["name"] for field in target["fields"] if field["name"].endswith("-sort_order"))
    body[sort_field] = "invalid"
    assert client.post(path, body).status_code == 422
    tip.refresh_from_db()
    assert tip.sort_order == 0
    body[sort_field] = "7"
    assert client.post(path, body).json()["saved"]
    tip.refresh_from_db()
    assert tip.sort_order == 7
    assert LogEntry.objects.filter(object_id=str(tip.pk)).exists()
    assert client.post(path, body).status_code == 409


def test_password_changes_and_single_deletion_are_native(make_user):
    client, _ = staff_client(make_user, True)
    person = make_user()
    path = f"/data/password/accounts/user/{person.pk}/"
    schema = client.get(path).json()
    result = client.post(path, {"_revision": schema["revision"], "usable_password": "true", "password1": "A-new-strong-password-748!", "password2": "A-new-strong-password-748!"})
    assert result.status_code == 200, result.content
    person.refresh_from_db()
    assert person.check_password("A-new-strong-password-748!")
    style = Style.objects.create(name="Single delete", slug="single-delete")
    path = f"/data/delete/looks/style/{style.pk}/"
    preview = client.get(path).json()
    assert Style.objects.filter(pk=style.pk).exists()
    assert client.post(path, {"post": "yes", "_revision": "outdated"}).status_code == 409
    assert client.post(path, {"post": "yes", "_revision": preview["revision"]}).json()["deleted"]


def test_inline_pagination_conflict_and_related_choices(make_user, make_stylist):
    from apps.stylists.models import MenuItem
    client, _ = staff_client(make_user, True)
    stylist = make_stylist()
    MenuItem.objects.bulk_create([MenuItem(stylist=stylist, name=f"Service {index}", price=10, duration_minutes=60) for index in range(30)])
    path = f"/data/forms/stylists/stylistprofile/{stylist.pk}/"
    schema = client.get(path).json()
    menu = next(inline for inline in schema["inlines"] if inline["prefix"] == "menu_items")
    assert menu["pages"] == 2
    assert sum(bool(form["id"]) for form in menu["forms"]) == 25
    second = client.get(f"{path}?inline_menu_items=2").json()
    assert next(inline for inline in second["inlines"] if inline["prefix"] == "menu_items")["page"] == 2
    MenuItem.objects.filter(stylist=stylist).update(price=12)
    assert client.post(path, body_for(schema)).status_code == 409
    choices = client.get(f"/data/choices/stylists/stylistprofile/?object={stylist.pk}&field=account").json()
    assert choices["options"]
    assert len(choices["options"]) <= 25
    assert client.get(f"/data/choices/stylists/stylistprofile/?object={stylist.pk}&field=password").status_code == 404


def test_native_account_creation_preserves_role_choices(make_user):
    from apps.accounts.models import User
    client, _ = staff_client(make_user, True)
    path = "/data/forms/accounts/user/"
    schema = client.get(path).json()
    role = next(field for section in schema["sections"] for field in section["fields"] if field["name"] == "roles")
    assert role["kind"] == "text"
    body = body_for(schema)
    body.update(email="react-account@test.dev", name="New account", roles="client,stylist", password1="Strong-created-password-984!", password2="Strong-created-password-984!")
    response = client.post(path, body)
    assert response.status_code == 200, response.content
    person = User.objects.get(email="react-account@test.dev")
    assert person.roles == ["client", "stylist"]
    assert person.check_password("Strong-created-password-984!")


def test_actions_reuse_custom_hooks_and_reject_invalid_ids(make_user):
    from apps.stylists.models import Verification
    client, _ = staff_client(make_user, True)
    person = make_user()
    person.phone_verified = False
    person.save()
    path = "/data/actions/accounts/user/"
    body = {"action": "mark_phone_checked", "ids": [str(person.pk)]}
    preview = client.post(path, body).json()
    response = client.post(path, {**body, "confirm": "yes", "token": preview["token"]})
    assert response.json()["done"]
    person.refresh_from_db()
    assert person.phone_verified
    assert Verification.objects.filter(account=person, type="phone").exists()
    assert client.post(path, {**body, "ids": ["invalid"]}).status_code == 400


def test_native_metrics_are_permission_scoped(make_user, make_stylist):
    client, _ = staff_client(make_user, True)
    make_stylist()
    response = client.get("/data/metrics/")
    assert response.status_code == 200
    assert len(response.json()["weeks"]) == 8
    client, _ = staff_client(make_user)
    assert client.get("/data/metrics/").status_code == 403
