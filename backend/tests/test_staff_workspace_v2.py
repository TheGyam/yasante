"""Search, related records, export, review mode, error issues and insights."""

import pytest
from django.contrib import admin
from django.core import mail
from django.test import Client

from apps.common.error_reporting import fingerprint, record_error, scrub
from apps.common.models import ClientError, ErrorIssue
from apps.staff.names import NAMES, field_label
from tests.test_staff import staff_client

pytestmark = pytest.mark.django_db


def test_every_registered_model_has_a_friendly_name():
    missing = [m._meta.label_lower for m in admin.site._registry if m._meta.label_lower not in NAMES]
    assert missing == []


def test_field_labels_read_like_english():
    assert field_label("apple id") == "Apple ID"
    assert field_label("time_zone") == "Time zone"
    assert field_label("avatar url") == "Avatar URL"


def test_search_groups_are_capped_and_follow_permissions(make_user):
    client, _ = staff_client(make_user, superuser=True)
    for n in range(7):
        make_user(name=f"Nana Sesay {n}")
    groups = client.get("/data/search/?q=nana").json()["groups"]
    people = next(group for group in groups if group["name"] == "People")
    assert len(people["items"]) == 5
    limited, _ = staff_client(make_user)
    assert limited.get("/data/search/?q=nana").json()["groups"] == []


def test_related_lists_only_relations_with_records(make_user, make_stylist):
    client, _ = staff_client(make_user, superuser=True)
    profile = make_stylist()
    items = client.get(f"/data/related/accounts/user/{profile.account_id}/").json()["items"]
    assert items and all(item["count"] > 0 for item in items)
    stylists = next(item for item in items if item["name"] == "Stylists")
    assert client.get("/data" + stylists["url"].replace("?", "/?")).json()["count"] == 1


def test_export_is_permission_checked_and_formula_safe(make_user):
    client, _ = staff_client(make_user, superuser=True)
    make_user(name="=HYPERLINK(1)")
    response = client.get("/data/export/accounts/user/")
    assert response.status_code == 200
    body = response.content.decode()
    assert body.splitlines()[0].startswith("Email,")
    assert "'=HYPERLINK(1)" in body
    limited, _ = staff_client(make_user)
    assert limited.get("/data/export/accounts/user/").status_code == 403


def test_review_decision_and_undo(make_user):
    from apps.shelf.models import Product

    client, user = staff_client(make_user, superuser=True)
    product = Product.objects.create(brand="Brand", name="Curl cream", category=Product._meta.get_field("category").choices[0][0], status="pending", added_by=user)
    queue = client.get("/data/review/products/").json()
    assert [item["id"] for item in queue["items"]] == [str(product.pk)]
    assert {action["key"] for action in queue["actions"]} == {"approve", "reject"}
    decided = client.post(f"/data/review/products/{product.pk}/decide/", {"action": "approve"}, HTTP_X_CSRFTOKEN="x").json()
    product.refresh_from_db()
    assert product.status == "live" and decided["undo"]
    assert client.post("/data/undo/", {"token": decided["undo"]}).json() == {"done": True}
    product.refresh_from_db()
    assert product.status == "pending"
    # Already decided elsewhere: the queue says so instead of acting twice.
    Product.objects.filter(pk=product.pk).update(status="live")
    assert client.post(f"/data/review/products/{product.pk}/decide/", {"action": "approve"}).status_code == 409


def test_undo_token_is_personal(make_user):
    from apps.shelf.models import Product

    client, user = staff_client(make_user, superuser=True)
    other, _ = staff_client(make_user, superuser=True)
    product = Product.objects.create(brand="B", name="Oil", category=Product._meta.get_field("category").choices[0][0], status="pending", added_by=user)
    token = client.post(f"/data/review/products/{product.pk}/decide/", {"action": "reject"}).json()["undo"]
    assert other.post("/data/undo/", {"token": token}).status_code == 403


def test_errors_group_scrub_and_regress():
    assert scrub("Bearer abc.def for ama@test.dev at https://x.test/p?token=1") == "Bearer [redacted] for [email] at https://x.test/p"
    assert fingerprint("web", "Item 42 missing", "") == fingerprint("web", "Item 7 missing", "")
    for _ in range(3):
        record_error(kind="crash", platform="web", message="Boom at row 12", stack="")
    issue = ErrorIssue.objects.get()
    assert issue.count == 3 and ClientError.objects.count() == 3
    issue.status = "resolved"
    issue.save()
    record_error(kind="crash", platform="web", message="Boom at row 99", stack="")
    issue.refresh_from_db()
    assert (issue.status, issue.regressed, issue.count) == ("open", True, 4)


def test_new_issue_alerts_are_capped(make_user, django_capture_on_commit_callbacks):
    make_user(is_staff=True, is_superuser=True)
    for n in range(10):
        with django_capture_on_commit_callbacks(execute=True):
            record_error(kind="crash", platform="web", message=f"Distinct failure {'x' * n}", stack="")
    assert len(mail.outbox) == 6


def test_server_errors_are_recorded_and_reporting_never_raises(monkeypatch):
    import logging
    import sys

    from apps.common import error_reporting

    handler = error_reporting.ErrorHandler()  # attached to django.request in CommonConfig.ready

    def failure(message):
        try:
            raise ValueError(message)
        except ValueError:
            return logging.makeLogRecord({"name": "django.request", "levelno": 40, "msg": "Internal Server Error", "exc_info": sys.exc_info()})

    handler.handle(failure("server broke"))
    assert ClientError.objects.get().platform == "server"
    monkeypatch.setattr(error_reporting, "record_error", lambda **kw: 1 / 0)
    handler.handle(failure("again"))  # must not raise


def test_error_issue_screen_and_actions(make_user):
    client, _ = staff_client(make_user, superuser=True)
    record_error(kind="crash", platform="ios", message="Crash", stack="", app_version="1.0.3")
    issue = client.get("/data/errors/").json()["items"][0]
    assert issue["count"] == 1 and len(issue["sparkline"]) == 14
    assert client.get(f"/data/errors/{issue['id']}/").json()["occurrences"][0]["version"] == "1.0.3"
    assert client.post(f"/data/errors/{issue['id']}/action/", {"status": "resolved", "version": "1.0.4"}).json() == {"done": True}
    assert ErrorIssue.objects.get().status == "resolved"


@pytest.mark.parametrize("name", ["money", "funnel", "growth", "booking-times", "areas", "empty-searches", "retention", "top-stylists", "community", "app-health", "area-suggestions", "hair-trends", "feed"])
def test_every_insight_answers(make_user, make_stylist, name):
    client, _ = staff_client(make_user, superuser=True)
    make_stylist()
    data = client.get(f"/data/insights/{name}/?compare=1").json()
    assert data["name"] == name and isinstance(data["rows"], list)


def test_money_is_for_superusers_only(make_user):
    from django.contrib.auth.models import Permission

    client, user = staff_client(make_user)
    user.user_permissions.add(Permission.objects.get(codename="view_booking"))
    assert client.get("/data/insights/money/").status_code == 403
    assert client.get("/data/insights/hair-trends/").status_code == 403
    assert client.get("/data/insights/funnel/").status_code == 200


def test_insight_range_is_bounded(make_user):
    client, _ = staff_client(make_user, superuser=True)
    assert client.get("/data/insights/funnel/?from=2024-01-01&to=2026-01-01").status_code == 400


def test_client_errors_endpoint_feeds_issues():
    response = Client().post("/api/client-errors/", {"kind": "crash", "message": "web broke", "platform": "web"}, content_type="application/json")
    assert response.status_code in (201, 204)
    assert ErrorIssue.objects.get().platform == "web"


def test_a_person_without_a_username_can_be_edited(make_user):
    client, _ = staff_client(make_user, superuser=True)
    person = make_user(name="Ama")
    form = client.get(f"/data/forms/accounts/user/{person.pk}/").json()
    body = {"_revision": form["revision"]}
    for section in form["sections"]:
        for field in section["fields"]:
            if field["kind"] in ("readonly",) or field["name"] == "password":
                continue
            value = field["value"]
            if field["kind"] == "checkbox":
                if value:
                    body[field["name"]] = "on"
            elif field["kind"] == "datetime":
                body[f"{field['name']}_0"], body[f"{field['name']}_1"] = value
            elif isinstance(value, list):
                body[field["name"]] = value
            else:
                body[field["name"]] = "" if value is None else value
    body["name"] = "Ama Mensah"
    response = client.post(f"/data/forms/accounts/user/{person.pk}/", body)
    assert response.status_code == 200, response.content[:400]
    person.refresh_from_db()
    assert person.name == "Ama Mensah" and person.username is None


def test_staff_app_reports_errors_on_its_own_host(make_user):
    client, _ = staff_client(make_user, superuser=True)
    response = client.post("/data/client-errors/", {"kind": "crash", "message": "staff broke", "platform": "staff"}, content_type="application/json")
    assert response.status_code in (201, 204)
    assert ErrorIssue.objects.get().platform == "staff"


def test_recovery_codes_can_be_counted_and_replaced_with_a_current_code(make_user):
    import time

    from apps.staff.models import StaffSecondFactor
    from apps.staff.totp import code

    client, user = staff_client(make_user, superuser=True)
    factor = StaffSecondFactor.objects.get(user=user)
    assert client.get("/data/two-factor/codes/").json()["remaining"] == 0
    assert client.post("/data/two-factor/codes/", {"code": "000000"}).status_code == 403
    fresh = client.post("/data/two-factor/codes/", {"code": code(factor.get_secret(), int(time.time()) // 30)}).json()["recoveryCodes"]
    assert len(fresh) == 10 and len(set(fresh)) == 10
    assert client.get("/data/two-factor/codes/").json()["remaining"] == 10


def test_report_queue_decides_with_its_nullable_join(make_user, make_look):
    # The reports admin joins the nullable handled_by; locking that join is refused by
    # Postgres, which turned every Hide/Remove/Dismiss into a 500.
    from django.contrib.contenttypes.models import ContentType
    from apps.looks.models import Report

    client, _ = staff_client(make_user, superuser=True)
    reporter, author = make_user(), make_user()
    look = make_look(author)
    report = Report.objects.create(reporter=reporter, content_type=ContentType.objects.get_for_model(look),
                                   object_id=look.pk, reason="other", status="open")
    decided = client.post(f"/data/review/reports/{report.pk}/decide/", {"action": "hide_target", "confirmed": "yes"})
    assert decided.status_code == 200, decided.content
    look.refresh_from_db()
    report.refresh_from_db()
    assert look.status == "hidden" and report.status == "actioned"


def test_illegal_or_dangerous_reports_come_first_in_the_queue(api, make_user, make_look):
    from apps.looks.models import Report

    client, _ = staff_client(make_user, superuser=True)
    reporter = make_user()
    hateful, dangerous = make_look(make_user()), make_look(make_user())
    assert api(reporter).post(f"/api/looks/{hateful.pk}/report/", {"reason": "hate"}).status_code == 201
    assert api(reporter).post(f"/api/looks/{dangerous.pk}/report/", {"reason": "illegal"}).status_code == 201
    first = Report.objects.get(reason="illegal")
    assert client.get("/data/review/reports/").json()["items"][0]["id"] == str(first.pk)


def test_a_review_report_shows_in_its_queue_and_on_today(make_user, make_stylist, book):
    # ReviewReport.reason had no choices, so previewing one raised AttributeError and the
    # overview behind every workspace page answered 500.
    from apps.bookings.models import Booking, Review, ReviewReport

    client, _ = staff_client(make_user, superuser=True)
    profile, customer = make_stylist(), make_user()
    booking = Booking.objects.get(pk=book(customer, profile)["id"])
    review = Review.objects.create(booking=booking, rating=2, body="Late.", status="published",
                                   author_name="Ama", service_name="Knotless braids")
    report = ReviewReport.objects.create(review=review, reporter=make_user(), reason="hate", note="Rude")
    assert client.get("/data/overview/").status_code == 200
    queue = client.get("/data/review/review-reports/").json()
    assert [(item["id"], item["title"]) for item in queue["items"]] == [(str(report.pk), "Hateful or abusive")]
    decided = client.post(f"/data/review/review-reports/{report.pk}/decide/", {"action": "remove_review", "confirmed": "yes"})
    assert decided.status_code == 200, decided.content
    review.refresh_from_db()
    assert review.status == "removed"
