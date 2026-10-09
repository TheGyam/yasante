"""The feed, posting and credit, likes, threaded comments, saves, reports, blocking."""

import pytest

pytestmark = pytest.mark.django_db


def ids(response):
    return [look["id"] for look in response.json()["data"]]


def test_the_feed_is_public_newest_first_and_pages_by_cursor(api, make_user, make_look):
    author = make_user()
    looks = [make_look(author) for _ in range(5)]
    first = api().get("/api/looks/", limit=2)
    assert first.status_code == 200
    assert ids(first) == [str(looks[4].pk), str(looks[3].pk)]
    cursor = first.json()["nextCursor"]
    second = api().get("/api/looks/", limit=2, cursor=cursor)
    assert ids(second) == [str(looks[2].pk), str(looks[1].pk)]
    last = api().get("/api/looks/", limit=2, cursor=second.json()["nextCursor"])
    assert ids(last) == [str(looks[0].pk)] and "nextCursor" not in last.json()


def test_a_look_carries_everything_the_card_shows(api, make_user, make_stylist, make_look):
    profile = make_stylist()
    viewer = make_user()
    look = make_look(viewer, stylist=profile, hair_texture="coily", service_name="Knotless braids", price=120)
    body = api(viewer).get(f"/api/looks/{look.pk}/").json()
    assert body["stylist"] == {"id": str(profile.account_id), "name": profile.display_name, "handle": profile.handle}
    assert body["styles"] == ["knotless"] and body["hairTexture"] == "coily"
    assert body["price"] == 120 and body["area"] == "Peckham"
    assert body["mine"] is True and body["liked"] is False and body["saveCount"] == 0
    for key in ("likeCount", "commentCount", "createdAt", "authorName", "visibility"):
        assert key in body


def test_filters_combine(api, make_user, make_stylist, make_look):
    peckham = make_stylist()
    author = make_user()
    a = make_look(author, style="knotless", stylist=peckham, hair_texture="coily")
    b = make_look(author, style="cornrows", hair_texture="coily")
    make_look(author, style="cornrows", hair_texture="wavy")
    assert set(ids(api().get("/api/looks/", hair="coily"))) == {str(a.pk), str(b.pk)}
    assert ids(api().get("/api/looks/", style="cornrows", hair="coily")) == [str(b.pk)]
    assert ids(api().get("/api/looks/", area="Peckham")) == [str(a.pk)]
    assert api().get("/api/looks/areas/").json() == ["Peckham"]
    assert [s["id"] for s in api().get("/api/styles/").json()][:2] == ["knotless", "box-braids"]


def test_likes_count_once_and_come_off(api, make_user, make_look):
    look = make_look(make_user())
    fan = make_user()
    assert api().post(f"/api/looks/{look.pk}/like/").status_code == 401
    api(fan).post(f"/api/looks/{look.pk}/like/")
    api(fan).post(f"/api/looks/{look.pk}/like/")
    body = api(fan).get(f"/api/looks/{look.pk}/").json()
    assert body["liked"] is True and body["likeCount"] == 1
    api(fan).delete(f"/api/looks/{look.pk}/like/")
    assert api(fan).get(f"/api/looks/{look.pk}/").json()["likeCount"] == 0


def test_posting_needs_a_photo_and_a_style(api, make_user, styles, photo):
    user = make_user()
    me, uri = api(user), photo(user)
    assert me.post("/api/looks/", {"photoUri": "file:///local.jpg", "styles": ["knotless"]}).status_code == 400
    no_style = me.post("/api/looks/", {"photoUri": uri, "styles": []})
    assert no_style.status_code == 400 and no_style.json()["message"] == "Tag the style"
    posted = me.post(
        "/api/looks/",
        {"photoUri": uri, "styles": ["twists", "nonsense"], "hairTexture": "coily", "caption": " Two weeks in "},
    )
    assert posted.status_code == 201
    assert posted.json()["styles"] == ["twists"] and posted.json()["caption"] == "Two weeks in"


def test_a_stylist_is_credited_only_through_a_completed_booking(api, make_user, make_stylist, styles, book, photo):
    from apps.bookings.models import Booking

    profile = make_stylist()
    client = make_user()
    booking = book(client, profile)
    body = {"photoUri": photo(client), "styles": ["knotless"], "bookingId": booking["id"]}
    not_yet = api(client).post("/api/looks/", body)
    assert not_yet.status_code == 400 and "completed booking" in not_yet.json()["message"]
    Booking.objects.filter(pk=booking["id"]).update(status="completed")
    credited = api(client).post("/api/looks/", body).json()
    assert credited["stylist"]["id"] == str(profile.account_id)
    assert credited["serviceName"] == "Knotless braids" and credited["price"] == 120
    # Someone else can't use her booking, nor her photo.
    stranger = make_user()
    assert api(stranger).post("/api/looks/", {**body, "photoUri": photo(stranger)}).status_code == 400
    assert api(stranger).post("/api/looks/", {"photoUri": body["photoUri"], "styles": ["knotless"]}).status_code == 400


def test_a_stylists_own_post_credits_her_and_tags_her_service(api, make_stylist, styles, photo):
    profile = make_stylist()
    service = profile.menu_items.get(name="Cornrows")
    posted = api(profile.account).post(
        "/api/looks/", {"photoUri": photo(profile.account), "styles": ["cornrows"], "serviceId": str(service.pk)}
    ).json()
    assert posted["stylist"]["id"] == str(profile.account_id) and posted["price"] == 45


def test_private_looks_are_hers_alone(api, make_user, make_look):
    author = make_user()
    private = make_look(author, visibility="private")
    assert str(private.pk) not in ids(api(author).get("/api/looks/"))
    assert api(make_user()).get(f"/api/looks/{private.pk}/").status_code == 404
    assert api(author).get(f"/api/looks/{private.pk}/").status_code == 200
    assert str(private.pk) in [l["id"] for l in api(author).get("/api/looks/mine/").json()]


def test_only_the_author_takes_a_look_down(api, make_user, make_look):
    author = make_user()
    look = make_look(author)
    assert api(make_user()).delete(f"/api/looks/{look.pk}/").status_code == 403
    assert api(author).delete(f"/api/looks/{look.pk}/").status_code == 204
    assert api().get(f"/api/looks/{look.pk}/").status_code == 404


def test_threads_are_one_level_deep_and_replies_page_separately(api, make_user, make_look):
    look = make_look(make_user())
    efua, zainab = make_user(name="Efua Mensah"), make_user(name="Zainab Bello")
    url = f"/api/looks/{look.pk}/comments/"
    root = api(efua).post(url, {"body": "How long?"}).json()
    answer = api(zainab).post(url, {"body": "Three hours", "replyTo": root["id"]}).json()
    back = api(efua).post(url, {"body": "Thank you!", "replyTo": answer["id"]}).json()
    assert answer["parentId"] == root["id"] and answer["replyToName"] == "Efua"
    assert back["parentId"] == root["id"] and back["replyToName"] == "Zainab"
    threads = api().get(url).json()["data"]
    assert [c["id"] for c in threads] == [root["id"]] and threads[0]["replyCount"] == 2
    replies = api().get(f"/api/comments/{root['id']}/replies/").json()["data"]
    assert [c["id"] for c in replies] == [answer["id"], back["id"]]
    assert api().get(f"/api/looks/{look.pk}/").json()["commentCount"] == 3
    # The thread goes with its first comment.
    assert api(zainab).delete(f"/api/comments/{root['id']}/").status_code == 403
    assert api(efua).delete(f"/api/comments/{root['id']}/").status_code == 204
    assert api().get(f"/api/looks/{look.pk}/").json()["commentCount"] == 0


def test_comments_need_words_and_an_account(api, make_user, make_look):
    look = make_look(make_user())
    url = f"/api/looks/{look.pk}/comments/"
    assert api().post(url, {"body": "hi"}).status_code == 401
    assert api(make_user()).post(url, {"body": "   "}).status_code == 400
    assert api(make_user()).post(url, {"body": "x" * 501}).status_code == 400


def test_comment_likes_count_once(api, make_user, make_look):
    look = make_look(make_user())
    comment = api(make_user()).post(f"/api/looks/{look.pk}/comments/", {"body": "Lovely"}).json()
    fan = make_user()
    api(fan).post(f"/api/comments/{comment['id']}/like/")
    api(fan).post(f"/api/comments/{comment['id']}/like/")
    seen = api(fan).get(f"/api/looks/{look.pk}/comments/").json()["data"][0]
    assert seen["liked"] is True and seen["likeCount"] == 1
    api(fan).delete(f"/api/comments/{comment['id']}/like/")
    assert api(fan).get(f"/api/looks/{look.pk}/comments/").json()["data"][0]["likeCount"] == 0


def test_blocking_hides_everything_both_ways(api, make_user, make_stylist, make_look):
    profile = make_stylist()
    viewer = make_user()
    look = make_look(profile.account)
    api(profile.account).post(f"/api/looks/{look.pk}/comments/", {"body": "Mine"})
    assert api(viewer).post("/api/blocks/", {"accountId": str(profile.account_id)}).status_code == 204
    assert str(look.pk) not in ids(api(viewer).get("/api/looks/"))
    assert api(viewer).get(f"/api/looks/{look.pk}/").status_code == 404
    assert api(viewer).get(f"/api/stylists/by-handle/{profile.handle}/").status_code == 404
    # And the other way round.
    their_look = make_look(viewer)
    assert str(their_look.pk) not in ids(api(profile.account).get("/api/looks/"))
    assert api(viewer).post("/api/blocks/", {"accountId": str(viewer.pk)}).status_code == 400


def test_reports_go_to_moderation(api, make_user, make_stylist, make_look):
    from apps.looks.models import Report

    look = make_look(make_user())
    reporter = api(make_user())
    assert reporter.post(f"/api/looks/{look.pk}/report/", {"reason": "made up"}).status_code == 400
    assert reporter.post(f"/api/looks/{look.pk}/report/", {"reason": "not-their-work"}).status_code == 201
    comment = api(make_user()).post(f"/api/looks/{look.pk}/comments/", {"body": "x"}).json()
    # A comment can't be stolen work.
    assert reporter.post(f"/api/comments/{comment['id']}/report/", {"reason": "not-their-work"}).status_code == 400
    assert reporter.post(f"/api/comments/{comment['id']}/report/", {"reason": "hate"}).status_code == 201
    profile = make_stylist()
    assert reporter.post(f"/api/stylists/{profile.account_id}/report/", {"reason": "scam"}).status_code == 201
    assert Report.objects.count() == 3


def test_saving_counts_each_person_once(api, make_user, make_look):
    look = make_look(make_user())
    saver = make_user()
    me = api(saver)
    a = me.post("/api/collections/", {"name": "Holiday", "isPrivate": True}).json()
    b = me.post("/api/collections/", {"name": "Wedding", "isPrivate": False}).json()
    me.post(f"/api/collections/{a['id']}/items/", {"kind": "look", "refId": str(look.pk)})
    me.post(f"/api/collections/{b['id']}/items/", {"kind": "look", "refId": str(look.pk)})
    assert api(make_user()).get(f"/api/looks/{look.pk}/").json()["saveCount"] == 1
    assert me.get(f"/api/looks/{look.pk}/").json()["saved"] is True
    assert me.get("/api/looks/").json()["data"][0]["saved"] is True


def test_search_finds_looks_by_caption_style_and_people(api, make_user, make_stylist, make_look):
    profile = make_stylist()
    author = make_user(name="Zainab Bello")
    by_caption = make_look(author, caption="Waist length boho for the summer")
    by_style = make_look(author, style="cornrows")
    by_stylist = make_look(author, stylist=profile)
    make_look(author, caption="Wash day")
    found = lambda q: set(ids(api().get("/api/looks/", q=q)))
    assert found("boho summer") == {str(by_caption.pk)}
    assert str(by_style.pk) in found("cornrows")
    assert str(by_stylist.pk) in found(profile.display_name.split()[0])
    assert len(found("zainab")) == 4
    assert found("nothing-like-this") == set()


def test_search_hides_people_you_have_blocked(api, make_user, make_look):
    author, viewer = make_user(), make_user()
    look = make_look(author, caption="Silk press")
    api(viewer).post("/api/blocks/", {"accountId": str(author.pk)})
    assert str(look.pk) not in ids(api(viewer).get("/api/looks/", q="silk"))


def _comment(look, author, body, likes=0, hours_ago=0):
    from datetime import timedelta

    from apps.looks.models import LookComment
    from django.utils import timezone

    c = LookComment.objects.create(look=look, author=author, body=body)
    LookComment.objects.filter(pk=c.pk).update(
        like_count=likes, created_at=timezone.now() - timedelta(hours=hours_ago)
    )
    return c


def _order(api_client, look, **params):
    return [c["body"] for c in api_client.get(f"/api/looks/{look.pk}/comments/", **params).json()["data"]]


def test_top_comments_rank_engagement_freshness_and_the_creator(api, make_user, make_look):
    creator, a, b = make_user(), make_user(), make_user()
    look = make_look(creator)
    _comment(look, a, "loved", likes=12, hours_ago=5)
    _comment(look, b, "meh", likes=0, hours_ago=1)
    _comment(look, a, "old favourite", likes=3, hours_ago=24 * 30)
    _comment(look, b, "new favourite", likes=3, hours_ago=2)
    order = _order(api(), look)
    assert order.index("loved") < order.index("meh")
    # Same likes, so the newer one ranks higher.
    assert order.index("new favourite") < order.index("old favourite")
    # A reply from the creator lifts a quiet comment above a lukewarm one.
    quiet = _comment(look, a, "quiet", likes=0, hours_ago=3)
    api(creator).post(f"/api/looks/{look.pk}/comments/", {"body": "thank you!", "replyTo": str(quiet.pk)})
    order = _order(api(), look)
    assert order.index("quiet") < order.index("meh")
    # Newest first is still there on request.
    assert _order(api(), look, sort="new")[0] == "meh"


def test_her_new_comment_comes_first_for_her_only(api, make_user, make_look):
    me, other = make_user(), make_user()
    look = make_look(make_user())
    _comment(look, other, "popular", likes=40, hours_ago=2)
    api(me).post(f"/api/looks/{look.pk}/comments/", {"body": "mine, just now"})
    assert _order(api(me), look)[0] == "mine, just now"
    assert _order(api(other), look)[0] == "popular"


def test_top_comments_page_without_repeats_or_gaps(api, make_user, make_look):
    look = make_look(make_user())
    for i in range(7):
        _comment(look, make_user(), f"c{i}", likes=i % 3, hours_ago=i)
    seen, cursor = [], None
    while True:
        params = {"limit": 3, **({"cursor": cursor} if cursor else {})}
        body = api().get(f"/api/looks/{look.pk}/comments/", **params).json()
        seen += [c["body"] for c in body["data"]]
        cursor = body.get("nextCursor")
        if not cursor:
            break
    assert sorted(seen) == [f"c{i}" for i in range(7)]
    assert seen == _order(api(), look, limit=20)


def test_a_live_stylist_can_post_her_back_catalogue(api, make_user, make_stylist, styles, photo):
    """30 looks an hour stops a client long before it stops a stylist filling her page."""
    user, profile = make_user(), make_stylist()
    look = {"photoUri": photo(user), "styles": ["knotless"]}
    client = api(user)
    answers = [client.post("/api/looks/", look).status_code for _ in range(31)]
    assert answers[:30] == [201] * 30 and answers[30] == 429

    stylist = api(profile.account)
    look = {**look, "photoUri": photo(profile.account)}
    assert all(stylist.post("/api/looks/", look).status_code == 201 for _ in range(40))
