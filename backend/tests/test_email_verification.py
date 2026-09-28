"""Email codes: sent after sign-up, checked, a changed address proved again."""

import re

import pytest
from django.core import mail
from django.utils import timezone

pytestmark = pytest.mark.django_db


def code_in(message):
    return re.match(r"(\d{6})", message.subject).group(1)


def test_a_new_account_confirms_its_email_with_a_code(api, make_user):
    user = make_user(email_verified=False)
    me = api(user)
    assert me.get(f"/api/users/{user.pk}/").json()["emailVerified"] is False

    sent = me.post("/api/auth/email/start/", {})
    assert sent.status_code == 200 and len(mail.outbox) == 1
    assert mail.outbox[0].to == [user.email]
    code = code_in(mail.outbox[0])

    # Opening the screen again keeps that code; asking for a new one at once is refused.
    assert me.post("/api/auth/email/start/", {}).status_code == 200 and len(mail.outbox) == 1
    assert me.post("/api/auth/email/start/", {"resend": True}).status_code == 429

    wrong = me.post("/api/auth/email/verify/", {"code": "000000" if code != "000000" else "111111"})
    assert wrong.status_code == 400 and "tries left" in wrong.json()["message"]

    right = me.post("/api/auth/email/verify/", {"code": code})
    assert right.status_code == 200 and right.json()["emailVerified"] is True


def test_a_typo_in_the_address_can_be_corrected(api, make_user):
    taken = make_user()
    user = make_user(email_verified=False)
    me = api(user)
    assert me.post("/api/auth/email/start/", {"email": taken.email}).status_code == 400
    fixed = me.post("/api/auth/email/start/", {"email": "Right@Test.dev"})
    assert fixed.status_code == 200 and mail.outbox[-1].to == ["right@test.dev"]
    user.refresh_from_db()
    assert user.email == "right@test.dev" and not user.email_verified


def test_changing_email_in_the_profile_needs_proving_again(api, make_user):
    user = make_user(email_verified=True)
    other = make_user()
    me = api(user)
    assert me.patch(f"/api/users/{user.pk}/", {"email": other.email}).status_code == 400
    changed = me.patch(f"/api/users/{user.pk}/", {"email": "new@test.dev"})
    assert changed.status_code == 200
    user.refresh_from_db()
    assert user.email == "new@test.dev" and user.email_verified is False


def test_a_mail_failure_says_so_and_lets_her_try_again(api, make_user, monkeypatch):
    from apps.accounts import views

    monkeypatch.setattr(views, "send_email_code", lambda *a: False)
    me = api(make_user(email_verified=False))
    failed = me.post("/api/auth/email/start/", {})
    assert failed.status_code == 503 and "try again" in failed.json()["message"]
    monkeypatch.undo()
    assert me.post("/api/auth/email/start/", {}).status_code == 200


def test_a_reset_email_carries_a_link_the_app_and_the_site_can_use(api, make_user):
    from urllib.parse import parse_qs, urlparse

    user = make_user()
    api().post("/api/auth/forgot-password/", {"email": user.email})
    message = mail.outbox[-1]
    link = re.search(r"https://yasante\.com/auth/reset-password\?\S+", message.body).group(0)
    query = parse_qs(urlparse(link).query)
    body = {"uid": query["uid"][0], "token": query["token"][0], "password": "Brand-new-Passw0rd"}
    assert api().post("/api/auth/reset-password/", body).status_code == 200
    # Only once: the same link can't change it again.
    assert api().post("/api/auth/reset-password/", body).status_code == 400
    # The link works on any device: the site has the form wherever the app doesn't open it.
    assert "on your phone" not in message.body
    page = api().client.get(link.replace("https://yasante.com", ""))
    assert page.status_code == 200 and "Choose a new password" in page.content.decode()
    assert '<meta name="robots" content="noindex">' in page.content.decode()
    assert api().client.get("/auth/forgot-password").status_code == 200


def test_opening_the_screen_again_keeps_the_code_already_sent(api, make_user):
    """Reopening the app mid sign-up doesn't email another code; asking for one does."""
    from datetime import timedelta

    from apps.accounts.models import EmailChallenge

    user = make_user(email_verified=False)
    client = api(user).client
    assert client.post("/api/auth/email/start/", {}, format="json").status_code == 200
    assert len(mail.outbox) == 1
    # Well past the resend wait: an ordinary reopen still keeps the first code.
    EmailChallenge.objects.update(created_at=timezone.now() - timedelta(minutes=5))
    again = client.post("/api/auth/email/start/", {}, format="json")
    assert again.status_code == 200 and again.json()["resendInSeconds"] == 0
    assert len(mail.outbox) == 1
    # Tapping Resend (a minute on, past the per-minute limit) sends a new one.
    from django.core.cache import cache

    cache.clear()
    assert client.post("/api/auth/email/start/", {"resend": True}, format="json").status_code == 200
    assert len(mail.outbox) == 2
