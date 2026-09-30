import time
import hashlib
import re
import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from django.contrib.admin.models import LogEntry
from django.contrib.auth.hashers import Argon2PasswordHasher
from django.contrib.contenttypes.models import ContentType
from django.core.cache import cache
from django.core.management import call_command
from django.core import mail
from django.test import Client, RequestFactory, override_settings
from django.utils import timezone

from apps.looks.models import Look, Report, Style
from apps.staff.models import StaffSecondFactor
from apps.staff.network import client_ip
from apps.staff.totp import code, self_test
from .test_staff import staff_client

pytestmark = pytest.mark.django_db


@override_settings(SECURE_SSL_REDIRECT=True)
def test_staff_https_redirect_has_private_headers():
    response = Client().get("/", HTTP_HOST="admin.localhost")
    assert response.status_code == 301
    assert response["X-Robots-Tag"] == "noindex, nofollow"
    assert response["Cache-Control"] == "no-store, private"
    assert response["Referrer-Policy"] == "same-origin"
    assert "frame-ancestors 'none'" in response["Content-Security-Policy"]


@pytest.fixture(autouse=True)
def clear_throttles():
    cache.clear()
    yield
    cache.clear()


def test_totp_rfc_vectors():
    self_test()


def test_development_toolbar_does_not_touch_staff_responses(settings):
    settings.MIDDLEWARE = ["debug_toolbar.middleware.DebugToolbarMiddleware", *settings.MIDDLEWARE]
    response=Client(HTTP_HOST="admin.localhost").get("/data/session/")
    assert response.status_code == 200 and response["Content-Type"] == "application/json"


def pending_client(make_user):
    user = make_user(is_staff=True, is_superuser=True)
    client = Client(HTTP_HOST="admin.localhost")
    assert client.post("/data/session/", {"username":user.email,"password":"password123"}).json()["phase"] == "enroll"
    return client, user


def test_enrollment_gating_recovery_replay_and_audit(make_user):
    client, user = pending_client(make_user)
    paths = ["overview/", "records/accounts/user/", "forms/looks/style/", "metrics/", "password/"]
    for path in paths:
        assert client.get("/data/" + path).status_code == 403
    enrollment = client.get("/data/two-factor/").json()
    factor = StaffSecondFactor.objects.get(user=user)
    secret = enrollment["secret"].replace(" ", "")
    assert factor.secret != secret and factor.get_secret() == secret
    assert "issuer=Yasante" in enrollment["uri"]
    result = client.post("/data/two-factor/", {"code":code(secret,int(time.time())//30)}).json()
    assert len(result["recoveryCodes"]) == 10
    assert client.get("/data/overview/").status_code == 200
    assert client.session.get_expiry_age() == 28800
    client.post("/data/session/", {"intent":"logout"})
    client.post("/data/session/", {"username":user.email,"password":"password123"})
    assert client.get("/data/session/").json()["phase"] == "verify"
    assert client.post("/data/two-factor/", {"code":code(secret,int(time.time())//30)}).status_code == 403
    recovery = result["recoveryCodes"][0]
    assert client.post("/data/two-factor/", {"code":recovery}).status_code == 200
    factor.refresh_from_db()
    assert len(factor.recovery_codes) == 9 and recovery not in str(factor.recovery_codes)
    client.post("/data/session/", {"username":user.email,"password":"password123"})
    assert client.post("/data/two-factor/", {"code":recovery}).status_code == 403
    assert LogEntry.objects.filter(content_type=None,change_message__contains="sign-out").exists()


def test_reset_revokes_existing_verification(make_user):
    client, actor = staff_client(make_user, True)
    target_client, target = staff_client(make_user)
    assert target_client.get("/data/overview/").status_code == 200
    assert client.post(f"/data/two-factor/reset/{target.pk}/").status_code == 200
    assert target_client.get("/data/overview/").status_code == 403
    assert target_client.get("/data/two-factor/").status_code == 403
    call_command("reset_staff_2fa", actor.email)
    assert client.get("/data/overview/").status_code == 403


def test_self_password_change_retains_verified_session_and_is_audited(make_user):
    client,user=staff_client(make_user,True)
    password="A-new-strong-password-984!"
    result=client.post("/data/password/",{"old_password":"password123","new_password1":password,"new_password2":password})
    assert result.status_code == 200 and result.json()["saved"]
    assert client.get("/data/overview/").status_code == 200
    assert LogEntry.objects.filter(user=user,content_type=None,change_message__contains="Staff password changed").exists()


@override_settings(ALLOWED_HOSTS=["admin.localhost","yasante.com","www.yasante.com","api.yasante.com"])
def test_host_routing_and_security_headers():
    client=Client()
    for host in ["yasante.com","www.yasante.com","api.yasante.com"]:
        for path in ["/manage", "/manage/data/session/", "/admin/", "/admin/metrics/"]:
            assert client.get(path,HTTP_HOST=host).status_code == 404
    for path in ["/", "/records/accounts/user/123", "/data/session/", "/django-admin/login/"]:
        response=client.get(path,HTTP_HOST="admin.localhost")
        assert response.status_code == (302 if path == "/django-admin/login/" else 200)
        assert response["X-Robots-Tag"] == "noindex, nofollow"
        assert response["Cache-Control"] == "no-store, private"
        assert response["Referrer-Policy"] == "same-origin"
        assert "frame-ancestors 'none'" in response["Content-Security-Policy"]
    assert client.get("/robots.txt",HTTP_HOST="admin.localhost").content == b"User-agent: *\nDisallow: /"
    assert client.cookies["csrftoken"]["domain"] == ""


def test_signin_ip_limit_applies_to_authenticated_requests(make_user):
    client,_=staff_client(make_user,True)
    for _ in range(5):
        assert client.post("/data/session/",{"username":"unknown@example.com","password":"bad"}).status_code == 403
    assert client.post("/data/session/",{"username":"different@example.com","password":"bad"}).status_code == 429


def test_signin_email_limit_across_ips():
    client=Client(HTTP_HOST="admin.localhost")
    for index in range(10):
        assert client.post("/data/session/",{"username":"unknown@example.com","password":"bad"},REMOTE_ADDR=f"192.0.2.{index}").status_code == 403
    assert client.post("/data/session/",{"username":"UNKNOWN@example.com","password":"bad"},REMOTE_ADDR="192.0.2.30").status_code == 429


def test_django_admin_requires_verified_factor(make_user):
    client, _ = pending_client(make_user)
    assert client.get("/django-admin/").status_code == 302
    assert client.get("/django-admin/login/")["Location"] == "/"
    assert client.post("/django-admin/login/", {}).get("Location") == "/"
    secret = client.get("/data/two-factor/").json()["secret"].replace(" ", "")
    assert client.post("/data/two-factor/", {"code": code(secret, int(time.time()) // 30)}).status_code == 200
    assert client.get("/django-admin/").status_code == 200


@pytest.mark.parametrize("remote,forwarded,expected", [
    ("127.0.0.1", "spoofed, 192.0.2.1", "192.0.2.1"),
    ("::1", "192.0.2.2", "192.0.2.2"),
    ("192.0.2.3", "spoofed", "192.0.2.3"),
    ("127.0.0.1", "", "127.0.0.1"),
])
def test_client_ip_trusts_only_loopback(remote, forwarded, expected):
    request = RequestFactory().get("/", REMOTE_ADDR=remote, HTTP_X_FORWARDED_FOR=forwarded)
    assert client_ip(request) == expected


def test_forwarded_clients_have_separate_signin_limits():
    client = Client(HTTP_HOST="admin.localhost", REMOTE_ADDR="127.0.0.1")
    for ip in ["192.0.2.1", "192.0.2.2"]:
        for _ in range(5):
            assert client.post("/data/session/", {"username": f"{ip}@example.com", "password": "bad"},
                               HTTP_X_FORWARDED_FOR=f"spoofed, {ip}").status_code == 403
        assert client.post("/data/session/", {"username": "another@example.com", "password": "bad"},
                           HTTP_X_FORWARDED_FOR=ip).status_code == 429


def test_valid_totp_does_not_hash_recovery_codes(make_user):
    client, user = staff_client(make_user, True)
    session = client.session
    session.pop("staff_2fa_verified")
    session["staff_2fa_pending"] = True
    session.save()
    factor = StaffSecondFactor.objects.get(user=user)
    factor.recovery_codes = ["argon2$legacy"] * 10
    factor.save()
    with patch("apps.staff.views.session.check_password") as check:
        assert client.post("/data/two-factor/", {"code": code(factor.get_secret(), int(time.time()) // 30)}).status_code == 200
        check.assert_not_called()


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_second_factor_change_emails(make_user, django_capture_on_commit_callbacks):
    client, user = pending_client(make_user)
    secret = client.get("/data/two-factor/").json()["secret"].replace(" ", "")
    ip = "192.0.2.40"
    meta = {"REMOTE_ADDR": "127.0.0.1", "HTTP_X_FORWARDED_FOR": f"spoofed, {ip}"}
    with django_capture_on_commit_callbacks(execute=True):
        response = client.post("/data/two-factor/", {"code": code(secret, int(time.time()) // 30)}, **meta)
    recovery = response.json()["recoveryCodes"][0]
    assert re.fullmatch(r"[a-f0-9]{4}(?:-[a-f0-9]{4}){3}", recovery)
    factor = StaffSecondFactor.objects.get(user=user)
    assert hashlib.sha256(recovery.replace("-", "").encode()).hexdigest() in factor.recovery_codes
    client.post("/data/session/", {"username": user.email, "password": "password123"}, **meta)
    with django_capture_on_commit_callbacks(execute=True):
        assert client.post("/data/two-factor/", {"code": recovery.replace("-", "")}, **meta).status_code == 200
    target = make_user(is_staff=True)
    with django_capture_on_commit_callbacks(execute=True):
        assert client.post(f"/data/two-factor/reset/{target.pk}/", **meta).status_code == 200
    assert [message.to for message in mail.outbox] == [[user.email], [user.email], [target.email]]
    for message, event in zip(mail.outbox, ["2FA enrolled", "a recovery code was used", "2FA was reset by a superuser"]):
        assert event in message.body
        assert ip in message.body and "spoofed" not in message.body
        assert timezone.now().date().isoformat() in message.body
        assert "contact the admin" in message.body
        assert recovery not in message.body and secret not in message.body
    assert LogEntry.objects.filter(change_message__contains=ip).exists()


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher", "django.contrib.auth.hashers.Argon2PasswordHasher"])
def test_legacy_argon2_recovery_code_is_accepted_once(make_user):
    client, user = pending_client(make_user)
    hasher = Argon2PasswordHasher()
    factor = StaffSecondFactor(user=user, confirmed_at=timezone.now(), recovery_codes=[hasher.encode("1234567890", hasher.salt())])
    factor.set_secret("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ")
    factor.save()
    assert client.post("/data/two-factor/", {"code": "1234567890"}).status_code == 200
    factor.refresh_from_db()
    assert factor.recovery_codes == []
    client.post("/data/session/", {"username": user.email, "password": "password123"})
    assert client.post("/data/two-factor/", {"code": "1234567890"}).status_code == 403


def test_nginx_proxy_header_edit_is_idempotent(tmp_path, monkeypatch):
    conf = tmp_path / "yasante.conf"
    conf.write_text("server { server_name yasante.com; location / { proxy_pass http://unix:/run/gunicorn.sock; proxy_set_header X-Real-IP $remote_addr; } }")
    script = (Path(__file__).parents[1] / "deploy/admin-host.sh").read_text()
    code = script.split("<<'PY'\n", 1)[1].split("\nPY\n", 1)[0]
    monkeypatch.setattr(sys, "argv", ["-", str(conf), "admin.yasante.com"])
    exec(compile(code, "admin-host.sh", "exec"), {})
    first = conf.read_text()
    exec(compile(code, "admin-host.sh", "exec"), {})
    assert conf.read_text() == first
    assert first.count("X-Forwarded-For $proxy_add_x_forwarded_for;") == 1
    assert first.count("X-Real-IP $remote_addr;") == 1
    assert first.count("admin.yasante.com") == 1


def test_code_attempt_limit(make_user):
    client,_=pending_client(make_user)
    assert client.post("/data/two-factor/",{"code":"é"}).status_code == 403
    for _ in range(4):
        assert client.post("/data/two-factor/",{"code":"invalid"}).status_code == 403
    assert client.post("/data/two-factor/",{"code":"invalid"}).status_code == 429


def test_report_queue_defaults_to_open(make_user):
    client,user=staff_client(make_user,True)
    look=Look.objects.create(author=user,caption="Reported")
    ct=ContentType.objects.get_for_model(look)
    open_report=Report.objects.create(reporter=user,content_type=ct,object_id=look.pk,reason="other",status="open")
    Report.objects.create(reporter=user,content_type=ct,object_id=look.pk,reason="other",status="dismissed")
    response=client.get("/data/records/looks/report/")
    assert [row["id"] for row in response.json()["rows"]] == [str(open_report.pk)]
    assert client.get("/data/records/looks/report/?queue_status=all").json()["count"] == 2
    assert client.get("/data/records/looks/report/?queue_status=dismissed").json()["count"] == 1


def test_bulk_cap_refuses_before_materializing(make_user):
    client,_=staff_client(make_user,True)
    Style.objects.bulk_create([Style(name=str(i),slug=f"bulk-{i}") for i in range(5001)])
    with patch("apps.staff.views.actions.queryset_revision",side_effect=AssertionError("Must not hash over cap")):
        for confirm in ["", "yes"]:
            response=client.post("/data/actions/looks/style/",{"action":"delete_selected","all":"yes","confirm":confirm})
            assert response.status_code == 400
            assert "5,000" in response.json()["message"]
    assert Style.objects.count() == 5001


def test_bad_parameters_and_real_failures_are_distinct(make_user):
    client,_=staff_client(make_user,True)
    assert client.get("/data/records/accounts/user/?p=invalid").status_code == 400
    with patch("apps.staff.views.records.model_admin",side_effect=ValueError("Real bug")), patch("apps.staff.access.logger.exception") as logged:
        response=client.get("/data/records/accounts/user/")
        assert response.status_code == 500 and response.json()["message"] == "Something went wrong. It has been logged."
        logged.assert_called_once()
    with patch("apps.staff.views.session.verified",side_effect=ValueError("Verification bug")), patch("apps.staff.access.logger.exception") as logged:
        assert client.get("/data/overview/").status_code == 500
        logged.assert_called_once()
