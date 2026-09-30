"""Workspace access boundaries, real admin filters and bounded record reads."""

import pytest
from django.contrib import admin
from django.contrib.auth.models import Permission
from django.test import Client, override_settings
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.accounts.models import User

pytestmark = pytest.mark.django_db


def staff_client(make_user, superuser=False):
    user = make_user(is_staff=True, is_superuser=superuser)
    client = Client(HTTP_HOST="admin.localhost")
    client.force_login(user)
    from apps.staff.models import StaffSecondFactor
    from django.utils import timezone
    factor = StaffSecondFactor.objects.create(user=user, confirmed_at=timezone.now())
    factor.set_secret("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ")
    factor.save()
    session=client.session
    session["staff_2fa_verified"]=factor.confirmed_at.isoformat()
    session.save()
    return client, user


def test_workspace_requires_active_staff_session(make_user):
    client = Client(HTTP_HOST="admin.localhost")
    assert client.get("/data/overview/").status_code == 401
    assert client.get("/").status_code == 200
    client.force_login(make_user())
    assert client.get("/data/overview/").status_code == 403
    assert client.get("/data/records/accounts/user/").status_code == 403
    assert client.get("/").status_code == 200


def test_staff_permissions_scope_every_surface(make_user, make_stylist):
    client, user = staff_client(make_user)
    user.user_permissions.add(Permission.objects.get(content_type__app_label="stylists", codename="view_stylistprofile"))
    make_stylist()
    response = client.get("/data/overview/")
    assert response.status_code == 200
    data = response.json()
    assert [item["key"] for item in data["models"]] == ["stylists.stylistprofile"]
    assert [item["label"] for item in data["metrics"]] == ["Stylists"]
    assert data["queues"] == []
    assert data["trend"]["series"] == []
    assert data["models"][0]["addUrl"] is None
    assert client.get("/data/records/accounts/user/").status_code == 403
    assert client.get("/data/records/stylists/stylistprofile/").status_code == 200
    assert "no-store" in response["Cache-Control"]
    assert "Cookie" in response["Vary"]
    assert data["csrfToken"]
    assert client.post("/data/overview/").status_code == 405


def test_record_browser_reuses_search_filters_and_safe_display(make_user):
    client, user = staff_client(make_user, superuser=True)
    person = make_user(name="UniquePerson", email_verified=True)
    result = client.get("/data/records/accounts/user/", {"q": "UniquePerson", "email_verified__exact": "1"})
    assert result.status_code == 200
    data = result.json()
    assert data["count"] == 1
    assert data["rows"][0]["id"] == str(person.pk)
    assert "Yes" in data["rows"][0]["values"]
    assert "password" not in [column["key"] for column in data["columns"]]
    assert person.password not in result.content.decode()
    assert data["addUrl"] == "/records/accounts/user/new"
    assert all("%(" not in action["label"] for action in data["actions"])
    assert client.get("/data/records/accounts/user/", {"q": "UniquePerson", "email_verified__exact": "0"}).json()["rows"] == []
    assert client.get("/data/records/accounts/user/", {"q": "UniquePerson", "p": 2}).status_code == 400


def test_add_only_staff_can_find_creation_tools_without_read_access(make_user):
    client, user = staff_client(make_user)
    user.user_permissions.add(Permission.objects.get(content_type__app_label="looks", codename="add_style"))
    resource = client.get("/data/overview/").json()["models"][0]
    assert resource["key"] == "looks.style"
    assert resource["canView"] is False
    assert resource["addUrl"] == "/records/looks/style/new"
    assert client.get("/data/records/looks/style/").status_code == 403



def test_pagination_is_bounded_and_does_not_mutate_admin(make_user):
    client, _ = staff_client(make_user, superuser=True)
    for index in range(27):
        make_user(name=f"PagePerson {index}")
    original = admin.site.get_model_admin(User)
    original_size = original.list_per_page
    first = client.get("/data/records/accounts/user/", {"q": "PagePerson"}).json()
    second = client.get("/data/records/accounts/user/", {"q": "PagePerson", "p": 2}).json()
    assert first["count"] == 27
    assert len(first["rows"]) == 25
    assert len(second["rows"]) == 2
    assert {row["id"] for row in first["rows"]}.isdisjoint(row["id"] for row in second["rows"])
    assert original.list_per_page == original_size
    for params in [{"all": "1"}, {"_to_field": "password"}, {"p": "bad"}, {"p": 0}, {"p": 10001}, {"q": "x" * 201}, {"password__startswith": "x"}]:
        assert client.get("/data/records/accounts/user/", params).status_code == 400


@override_settings(ROOT_URLCONF="apps.staff.urls_host")
def test_registered_tools_and_private_html(make_user):
    client, _ = staff_client(make_user, superuser=True)
    data = client.get("/data/overview/").json()
    assert len(data["models"]) == sum(len(group["models"]) for group in admin.site.get_app_list(client.get("/data/overview/").wsgi_request))
    assert len(data["trend"]["dates"]) == 14
    for resource in data["models"]:
        app, model = resource["key"].split(".")
        result = client.get(f"/data/records/{app}/{model}/")
        assert result.status_code == 200, (resource["key"], result.content)
    html = client.get("/records/accounts/user")
    assert html.status_code == 200
    assert "noindex" in html.content.decode()
    assert "no-store" in html["Cache-Control"]
    assert client.get("/data/records/unknown/unknown/").status_code == 404


def test_related_rows_keep_a_fixed_query_budget(make_user):
    from apps.stylists.models import Verification

    client, staff = staff_client(make_user, superuser=True)
    account = make_user()
    for _ in range(25):
        Verification.objects.create(account=account, verified_by=staff, type="phone")
    with CaptureQueriesContext(connection) as queries:
        response = client.get("/data/records/stylists/verification/")
    assert response.status_code == 200
    assert len(response.json()["rows"]) == 25
    assert len(queries) <= 10, [query["sql"] for query in queries]
