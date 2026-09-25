"""Errors reach the app as one plain sentence: never a list, a code or DRF's stock wording."""

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def message(response):
    body = response.json()
    assert set(body) == {"message"} and isinstance(body["message"], str), body
    return body["message"]


def test_a_wrong_password_says_so_in_a_sentence(api, make_user):
    user = make_user()
    wrong = api().post("/api/auth/login/", {"email": user.email, "password": "not-it"})
    assert wrong.status_code == 400
    assert message(wrong) == "Incorrect email or password."


def test_a_missing_field_is_named_in_plain_words(api):
    missing = api().post("/api/auth/signup/", {"email": "a@test.dev"})
    text = message(missing)
    assert "can’t be empty" in text and "Password" in text and "required" not in text


def test_a_dead_session_asks_to_sign_in_again():
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
    assert message(client.get("/api/collections/")) == "Your session has ended. Please sign in again."
    assert message(APIClient().get("/api/collections/")) == "Please sign in to continue."


def test_something_gone_is_said_kindly(api, make_user):
    gone = api(make_user()).get("/api/looks/00000000-0000-0000-0000-000000000000/")
    assert gone.status_code == 404
    assert "Not found" not in message(gone)
