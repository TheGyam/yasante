"""
Rate limits on the doors anyone can knock on without an account. The test settings
switch off the default throttles, but a view's own `throttle_classes` still apply,
which is how sign-in and sign-up are limited.
"""

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def _hammer(path, body, times=20):
    client = APIClient()
    return [client.post(path, body, format="json").status_code for _ in range(times)]


def test_sign_in_is_limited(make_user):
    """The control: shows this file can see a limit when there is one."""
    user = make_user()
    codes = _hammer("/api/auth/login/", {"email": user.email, "password": "wrong-password"})
    assert 429 in codes, codes


def test_password_reset_emails_are_limited(make_user):
    """Each request emails a reset link: unlimited, anyone can flood an inbox and spend
    the sending budget."""
    user = make_user()
    codes = _hammer("/api/auth/forgot-password/", {"email": user.email})
    assert 429 in codes, f"20 reset emails in a row, none refused: {sorted(set(codes))}"


def test_reset_link_guesses_are_limited(make_user):
    user = make_user()
    body = {"uid": str(user.pk), "token": "wrong-token", "password": "a-Long-pass-123", "password_confirm": "a-Long-pass-123"}
    codes = _hammer("/api/auth/reset-password/", body)
    assert 429 in codes, f"20 wrong reset tokens, none refused: {sorted(set(codes))}"


def _review(make_user, make_stylist, book):
    from apps.bookings.models import Booking, Review

    booking = Booking.objects.get(pk=book(make_user(), make_stylist())["id"])
    return Review.objects.create(booking=booking, rating=2, body="Late.", status="published",
                                 author_name="Ama", service_name="Knotless braids")


def _reports(api, user, path, times=30):
    client = api(user).client
    return [client.post(path, {"reason": "illegal"}, format="json").status_code for _ in range(times)]


def test_look_reports_are_limited(api, make_user, make_look):
    """The control: reporting a look is limited per account."""
    look = make_look(make_user())
    codes = _reports(api, make_user(), f"/api/looks/{look.pk}/report/")
    assert 429 in codes, sorted(set(codes))


@pytest.mark.xfail(strict=True, reason="F43: ReviewReportView has no throttle and no duplicate check")
def test_review_reports_are_limited(api, make_user, make_stylist, book):
    from apps.bookings.models import ReviewReport

    review = _review(make_user, make_stylist, book)
    codes = _reports(api, make_user(), f"/api/reviews/{review.pk}/report/")
    stored = ReviewReport.objects.filter(review=review).count()
    assert 429 in codes or stored <= 1, f"30 reports of one review: {sorted(set(codes))}, {stored} stored"
