"""The report queue, hiding and removing, appeals, verification tiers, policies."""

import pytest

pytestmark = pytest.mark.django_db


def _ids(response):
    return [look["id"] for look in response.json()["data"]]


def test_hiding_a_look_answers_its_reports_and_keeps_it_hers(api, make_user, make_look):
    from apps.looks.moderation import moderate

    author, reporter, other = make_user(), make_user(), make_user()
    look = make_look(author)
    api(reporter).post(f"/api/looks/{look.pk}/report/", {"reason": "nudity"})
    action = moderate(look, "hide")
    assert str(look.pk) not in _ids(api(other).get("/api/looks/"))
    assert api(other).get(f"/api/looks/{look.pk}/").status_code == 404
    # She still sees it (so she can appeal it) ...
    assert api(author).get(f"/api/looks/{look.pk}/").status_code == 200
    mine = api(author).get("/api/moderation/mine/").json()
    assert mine[0]["id"] == str(action.pk) and mine[0]["action"] == "hide"
    # ... and the reporter hears how it went.
    report = api(reporter).get("/api/reports/mine/").json()[0]
    assert report["status"] == "actioned" and report["resolution"]
    # Removed is gone for everyone, her included.
    moderate(look, "remove")
    assert api(author).get(f"/api/looks/{look.pk}/").status_code == 404


def test_a_hidden_comment_leaves_the_thread_and_the_count(api, make_user, make_look):
    from apps.looks.models import LookComment
    from apps.looks.moderation import moderate

    look = make_look(make_user())
    commenter = make_user()
    api(commenter).post(f"/api/looks/{look.pk}/comments/", {"body": "fine"})
    api(commenter).post(f"/api/looks/{look.pk}/comments/", {"body": "nasty"})
    nasty = LookComment.objects.get(body="nasty")
    moderate(nasty, "hide")
    bodies = [c["body"] for c in api().get(f"/api/looks/{look.pk}/comments/").json()["data"]]
    assert bodies == ["fine"]
    assert api().get(f"/api/looks/{look.pk}/").json()["commentCount"] == 1
    moderate(nasty, "restore")
    assert api().get(f"/api/looks/{look.pk}/").json()["commentCount"] == 2


def test_an_appeal_once_by_the_author(api, make_user, make_look):
    from apps.looks.moderation import moderate

    author = make_user()
    look = make_look(author)
    action = moderate(look, "hide")
    url = f"/api/moderation/{action.pk}/appeal/"
    assert api(make_user()).post(url, {"body": "not mine"}).status_code == 404
    assert api(author).post(url, {"body": ""}).status_code == 400
    assert api(author).post(url, {"body": "This is my own work"}).status_code == 201
    assert api(author).post(url, {"body": "again"}).status_code == 409
    assert api(author).get("/api/moderation/mine/").json()[0]["appeal"]["status"] == "open"


def test_verification_tier_comes_from_the_checks(api, make_stylist):
    from apps.stylists.models import StylistProfile, record_check

    profile = make_stylist()
    account = profile.account_id
    tier = lambda: StylistProfile.objects.get(pk=profile.pk).verification_tier
    record_check(account, "phone")
    assert tier() == 0  # a phone alone isn't a badge
    record_check(account, "proof_photo", "pending", "https://x.com/proof.jpg")
    assert tier() == 0  # waiting for review
    record_check(account, "proof_photo")
    assert tier() == 1
    record_check(account, "met_on_video")
    assert tier() == 2
    page = api().get(f"/api/stylists/by-handle/{profile.handle}/").json()["profile"]
    assert page["checks"] == ["met_on_video", "phone", "work"]
    assert "proofPhotoUri" not in page


def test_a_stylists_proof_photo_joins_the_queue(api, make_stylist):
    from apps.stylists.models import Verification

    profile = make_stylist()
    api(profile.account).patch("/api/stylists/me/", {"proofPhotoUri": "https://x.com/new-proof.jpg"})
    check = Verification.objects.get(account_id=profile.account_id, type="proof_photo")
    assert check.status == "pending" and check.evidence.endswith("new-proof.jpg")


def test_policies_serve_the_current_published_version(api):
    from datetime import timedelta

    from apps.profiles.models import PolicyDocument
    from django.utils import timezone

    now = timezone.now()
    assert api().get("/api/policies/privacy/").status_code == 404
    PolicyDocument.objects.create(type="privacy", version="2026-01", title="Privacy", body="v1", published=True, effective_at=now - timedelta(days=30))
    PolicyDocument.objects.create(type="privacy", version="2026-09", title="Privacy", body="v2", published=True, effective_at=now - timedelta(days=1))
    PolicyDocument.objects.create(type="privacy", version="2027-01", title="Privacy", body="future", published=True, effective_at=now + timedelta(days=30))
    PolicyDocument.objects.create(type="terms", version="draft", title="Terms", body="x", published=False, effective_at=now)
    assert api().get("/api/policies/privacy/").json()["version"] == "2026-09"
    assert api().get("/api/policies/privacy/", version="2026-01").json()["body"] == "v1"
    assert [p["type"] for p in api().get("/api/policies/").json()] == ["privacy"]
