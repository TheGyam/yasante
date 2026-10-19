"""Whoever posted a look can change who sees it, both ways, after posting."""

import pytest

pytestmark = pytest.mark.django_db


def feed(api, user):
    return [look["id"] for look in api(user).get("/api/looks/").json()["data"]]


def test_a_private_look_can_go_public_and_back(api, make_user, make_look):
    author, someone = make_user(), make_user()
    older = make_look(author, visibility="private")
    newer = make_look(author)
    url = f"/api/looks/{older.pk}/"
    assert str(older.pk) not in feed(api, someone)

    went = api(author).patch(url, {"visibility": "public"})
    assert went.status_code == 200 and went.json()["visibility"] == "public"
    # It joins the feed at its own date, behind the newer look, not as if just posted.
    shown = feed(api, someone)
    assert shown.index(str(newer.pk)) < shown.index(str(older.pk))
    assert api(someone).get(url).status_code == 200

    assert api(author).patch(url, {"visibility": "private"}).status_code == 200
    assert str(older.pk) not in feed(api, someone)
    assert api(someone).get(url).status_code == 404


def test_only_the_author_can_change_it(api, make_user, make_look):
    look = make_look(make_user(), visibility="private")
    response = api(make_user()).patch(f"/api/looks/{look.pk}/", {"visibility": "public"})
    assert response.status_code == 403
    look.refresh_from_db()
    assert look.visibility == "private"


def test_only_public_or_just_me(api, make_user, make_look):
    author = make_user()
    look = make_look(author)
    assert api(author).patch(f"/api/looks/{look.pk}/", {"visibility": "friends"}).status_code == 400
