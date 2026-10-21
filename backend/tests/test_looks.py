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



def test_with_her_yes_looks_on_hair_like_hers_come_first_newest_first(api, make_user, make_look, consent):
    author = make_user()
    old_coily, other, new_coily, newest_other = (
        make_look(author, hair_texture="coily"),
        make_look(author, hair_texture="straight"),
        make_look(author, hair_texture="coily"),
        make_look(author),
    )
    me = make_user(texture="coily")
    walk = lambda viewer: _walk(api(viewer) if viewer else api(), limit=1)
    newest_first = [str(l.pk) for l in (newest_other, new_coily, other, old_coily)]
    # Without her yes, and signed out: just newest first.
    assert walk(me) == newest_first and walk(None) == newest_first
    consent(me, "personalisation")
    # With it: hers first, then the rest, each newest first, nothing repeated or missed.
    assert walk(me) == [str(l.pk) for l in (new_coily, old_coily, newest_other, other)]
    # Choosing a hair type herself still wins.
    assert [l["id"] for l in api(me).get("/api/looks/", hair="straight").json()["data"]] == [str(other.pk)]


def test_stylists_and_products_seen_on_hair_like_hers_come_first_too(
    api, make_user, make_stylist, make_look, consent
):
    from apps.shelf.models import Product

    author, stylist = make_user(), make_stylist()
    cream = Product.objects.create(brand="Cantu", name="Curling cream", category="styler")
    on_her_hair = make_look(author, hair_texture="coily", stylist=stylist)
    on_her_hair.products.add(cream)
    plain = make_look(author, hair_texture="straight")
    by_her_stylist = make_look(make_user(), hair_texture="straight", stylist=stylist)
    with_her_cream = make_look(make_user(), hair_texture="wavy")
    with_her_cream.products.add(cream)
    me = make_user(texture="coily")
    consent(me, "personalisation")
    assert _walk(api(me), limit=2) == [
        str(l.pk) for l in (with_her_cream, by_her_stylist, on_her_hair, plain)
    ]


def test_not_for_me_shows_her_fewer_like_it(api, make_user, make_stylist, make_look):
    from apps.profiles.tasks import collect_user_data

    author, stylist = make_user(), make_stylist()
    one, two, three = (make_look(author, style="knotless") for _ in range(3))
    twists = make_look(author, style="twists")
    hers = make_look(make_user(), style="twists", stylist=stylist)
    me = make_user()
    feed = lambda **q: {l["id"] for l in api(me).get("/api/looks/", **q).json()["data"]}
    nope = lambda **body: api(me).post("/api/not-for-me/", body)

    assert nope(lookId=str(one.pk)).status_code == 204
    assert feed() == {str(l.pk) for l in (two, three, twists, hers)}
    # A second knotless look: knotless goes, unless she asks for it.
    nope(lookId=str(two.pk))
    assert feed() == {str(twists.pk), str(hers.pk)}
    assert feed(style="knotless") == {str(three.pk)}
    # A stylist: her looks go.
    nope(stylistId=str(stylist.account_id))
    assert feed() == {str(twists.pk)}
    assert nope().status_code == 400
    # Hers alone, and in her export.
    assert len(api(make_user()).get("/api/looks/").json()["data"]) == 5
    assert len(collect_user_data(me)["not_for_me"]) == 3


def test_styles_she_searched_for_are_mixed_through_her_feed_not_put_first(api, make_user, make_look):
    from apps.common.models import SearchLog

    author = make_user()
    knotless = [make_look(author, style="knotless") for _ in range(3)]
    others = [make_look(author, style="twists") for _ in range(9)]
    me = api(make_user())
    pages, cursor = [], None
    while True:
        body = me.get("/api/looks/", limit=4, searched="knotless", **({"cursor": cursor} if cursor else {})).json()
        pages.append([l["id"] for l in body["data"]])
        cursor = body.get("nextCursor")
        if not cursor:
            break
    seen = [look for page in pages for look in page]
    # Everything once, nothing missed.
    assert sorted(seen) == sorted(str(l.pk) for l in knotless + others)
    # One knotless look in each full page, after the usual three, newest first.
    newest = lambda looks: [str(l.pk) for l in reversed(looks)]
    assert [page[3] for page in pages[:3]] == newest(knotless)
    assert [l for page in pages for l in page[:3]] == newest(others)
    # Only for that page: never kept or logged.
    assert not SearchLog.objects.exists()


def test_her_hair_still_comes_first_in_the_usual_part_of_a_mixed_feed(api, make_user, make_look, consent):
    author = make_user()
    searched = make_look(author, style="knotless")
    straight = make_look(author, style="twists", hair_texture="straight")
    coily = make_look(author, style="twists", hair_texture="coily")
    me = make_user(texture="coily")
    consent(me, "personalisation")
    seen, cursor = [], None
    while True:
        body = api(me).get("/api/looks/", limit=4, searched="knotless", **({"cursor": cursor} if cursor else {})).json()
        seen += [l["id"] for l in body["data"]]
        cursor = body.get("nextCursor")
        if not cursor:
            break
    # Hers first among the usual looks, the searched one mixed in, each once.
    assert sorted(seen) == sorted(str(l.pk) for l in (searched, straight, coily))
    assert seen.index(str(coily.pk)) < seen.index(str(straight.pk))


def _walk(client, limit):
    """Every look in the feed, page by page."""
    seen, cursor = [], None
    for _ in range(20):
        body = client.get("/api/looks/", limit=limit, **({"cursor": cursor} if cursor else {})).json()
        seen += [l["id"] for l in body["data"]]
        cursor = body.get("nextCursor")
        if not cursor:
            return seen
    raise AssertionError("the feed never ended")

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


@pytest.mark.parametrize("count", [1, 3, 5])
def test_ordered_photos_and_cover(api, make_user, styles, photo, count):
    from apps.looks.models import Look

    # Multi-photo looks are staff-only until the switch opens them to everyone.
    user = make_user(is_staff=True)
    uris = [photo(user) for _ in range(count)][::-1]
    result = api(user).post("/api/looks/", {
        "photoUris": uris, "styles": ["knotless"], "photoAspect": 99,
        "thumbUri": "https://example.com/fake.jpg", "feedUri": "https://example.com/fake.jpg",
    })
    assert result.status_code == 201
    body = result.json()
    assert [p["uri"] for p in body["photos"]] == uris
    assert body["photoUri"] == body["photos"][0]["uri"]
    assert body["photoAspect"] == body["photos"][0]["aspect"] == 0.8
    assert body.get("thumbUri") == body["photos"][0].get("thumbUri")
    assert body.get("feedUri") == body["photos"][0].get("feedUri")
    look = Look.objects.get(pk=body["id"])
    assert list(look.photos.values_list("position", flat=True)) == list(range(count))
    for seen in [api(user).get(f"/api/looks/{look.pk}/").json(),
                 api(user).get("/api/looks/mine/").json()[0],
                 api().get("/api/looks/").json()["data"][0]]:
        assert seen["photos"] == body["photos"]


def test_legacy_post_has_one_photo(api, make_user, styles, photo):
    user = make_user()
    uri = photo(user)
    result = api(user).post("/api/looks/", {"photoUri": uri, "styles": ["knotless"]})
    assert result.status_code == 201
    assert [p["uri"] for p in result.json()["photos"]] == [uri]


@pytest.mark.parametrize("case,message", [
    ("empty", "A look needs a photo"),
    ("six", "Up to 5 photos in a look"),
    ("duplicate", "That photo is in this look twice"),
    ("alias", "That photo is in this look twice"),
    ("foreign", "That photo isn't one of yours"),
    ("invalid", "That photo isn't one of yours"),
    ("not-list", "A look needs a photo"),
])
def test_invalid_photos_create_nothing(api, make_user, styles, photo, case, message):
    from apps.looks.models import Look, LookPhoto

    # Staff, so these cases reach the checks they're meant to test, past the switch.
    user = make_user(is_staff=True)
    uri = photo(user)
    uris = {"empty": [], "six": [uri] * 6, "duplicate": [uri, uri],
            "alias": [uri, uri.replace(".jpg", "_w320.jpg")],
            "foreign": [uri, photo(make_user())], "invalid": [uri, {}], "not-list": uri}[case]
    counts = (Look.objects.count(), LookPhoto.objects.count())
    result = api(user).post("/api/looks/", {"photoUris": uris, "photoUri": uri, "styles": ["knotless"]})
    assert result.status_code == 400
    assert result.json()["message"] == message
    assert (Look.objects.count(), LookPhoto.objects.count()) == counts


def test_multi_photo_switch_gates_more_than_one_photo(api, make_user, styles, photo):
    from apps.features.models import Switch

    switch = Switch.objects.get(key="multi_photo_looks")
    switch.mode = "off"
    switch.save()

    plain, staff = make_user(), make_user(is_staff=True)

    # One photo always works, switch or no switch.
    assert api(plain).post(
        "/api/looks/", {"photoUri": photo(plain), "styles": ["knotless"]}
    ).status_code == 201

    two_photos = {"photoUris": [photo(plain), photo(plain)], "styles": ["knotless"]}
    refused = api(plain).post("/api/looks/", two_photos)
    assert refused.status_code == 400
    assert refused.json()["message"] == "Posting several photos in one look isn't open yet"

    switch.mode = "staff"
    switch.save()
    assert api(plain).post("/api/looks/", two_photos).status_code == 400
    assert api(staff).post(
        "/api/looks/", {"photoUris": [photo(staff), photo(staff)], "styles": ["knotless"]}
    ).status_code == 201


def test_cover_fallback_without_photo_rows(api, make_user, make_look):
    from apps.looks.serializers import present_looks

    look = make_look(make_user())
    assert present_looks([look], None)[0]["photos"] == [
        {"uri": look.photo_uri, "thumb_uri": None, "feed_uri": None, "aspect": 1}
    ]
    assert api().get(f"/api/looks/{look.pk}/").json()["photos"] == [{"uri": look.photo_uri, "aspect": 1}]


def test_photo_feed_queries_do_not_grow(api, make_user, make_look, django_assert_num_queries):
    from apps.looks.models import LookPhoto
    from django.db import connection
    from django.test.utils import CaptureQueriesContext

    for _ in range(12):
        look = make_look(make_user())
        LookPhoto.objects.bulk_create([
            LookPhoto(look=look, position=i, photo_uri=f"https://example.com/{i}.jpg") for i in range(3)
        ])
    client = api()
    client.get("/api/looks/", limit=1)
    with CaptureQueriesContext(connection) as queries:
        assert len(client.get("/api/looks/", limit=1).json()["data"]) == 1
    with django_assert_num_queries(len(queries)):
        body = client.get("/api/looks/", limit=12).json()["data"]
        assert len(body) == 12 and all(len(look["photos"]) == 3 for look in body)
    assert sum('FROM "looks_look_photo"' in q["sql"] for q in queries) == 1


@pytest.mark.parametrize("target", ["look", "account", "photo"])
def test_photo_files_are_deleted(api, make_user, styles, photo, target):
    from apps.common.models import Media
    from apps.common.signals import delete_media_for
    from apps.looks.models import Look
    from django.core.files.storage import default_storage

    user = make_user(is_staff=True)
    uris = [photo(user) for _ in range(3)]
    result = api(user).post("/api/looks/", {"photoUris": uris, "styles": ["knotless"]})
    look = Look.objects.get(pk=result.json()["id"])
    media = list(Media.objects.filter(owner=user))
    if target == "photo":
        media = [m for m in media if uris[1].endswith(m.full_path)]
    paths = [path for m in media for path in m.paths()]
    assert paths and all(default_storage.exists(path) for path in paths)
    owner_id = user.pk
    if target == "account":
        user.delete()
    elif target == "photo":
        look.photos.get(position=1).delete()
    else:
        look.delete()
    assert not Media.objects.filter(pk__in=[m.pk for m in media]).exists()
    assert all(not default_storage.exists(path) for path in paths)
    for m in media:
        delete_media_for(f"/media/{m.full_path}", owner_id)


def test_moderation_sees_all_photos_safely(make_user, make_look):
    from apps.looks.models import LookPhoto, Report
    from apps.staff.review import preview
    from django.test import RequestFactory

    look = make_look(make_user())
    for i, uri in enumerate(["https://example.com/a.jpg", "/api/media/private/", "javascript:alert(1)"]):
        LookPhoto.objects.create(look=look, position=i, photo_uri=uri)
    report = Report.objects.create(reporter=make_user(), content_object=look, reason="other")
    request = RequestFactory().get("/")
    request.user = make_user(is_staff=True, is_superuser=True)
    assert preview(request, "reports", report)["images"] == ["https://example.com/a.jpg", "/data/media/private/", ""]
    request.user = make_user(is_staff=True)
    assert preview(request, "reports", report)["images"] == []


@pytest.mark.parametrize("count", [0, 1, 3])
def test_seo_lists_photos_and_keeps_cover(make_user, make_look, count):
    from apps.looks.models import LookPhoto
    from .test_seo import html, jsonld, root

    look = make_look(make_user(name="Efua Mensah"), caption="My braids",
                     thumb_uri="https://example.com/thumb.jpg", feed_uri="https://example.com/feed.jpg")
    for i in reversed(range(count)):
        LookPhoto.objects.create(
            look=look, position=i, photo_uri=f"https://example.com/{i}.jpg" if i else look.photo_uri,
            thumb_uri=look.thumb_uri if i == 0 else "",
            feed_uri=f"https://example.com/feed{i}.jpg" if i == 1 else "",
        )
    body = html(f"/looks/{look.pk}")
    assert f'src="{look.feed_uri}"' in root(body)
    assert f'<meta property="og:image" content="{look.feed_uri}">' in body
    images = [item for item in jsonld(body) if item["@type"] == "ImageObject"]
    cover = {
        "@type": "ImageObject",
        "@id": f"https://yasante.com/looks/{look.pk}#image",
        "contentUrl": look.photo_uri,
        "thumbnailUrl": look.thumb_uri,
        "name": "Knotless braids",
        "description": look.caption,
        "uploadDate": look.created_at.isoformat(),
        "keywords": "Knotless braids",
        "creator": {"@type": "Person", "name": "Efua"},
        "creditText": "Yasante",
        "copyrightNotice": "Yasante",
        "acquireLicensePage": "https://yasante.com/terms",
        "license": "https://yasante.com/terms",
        "isPartOf": {"@id": "https://yasante.com/#website"},
    }
    assert images == [cover] + [
        {
            **cover,
            "@id": f"https://yasante.com/looks/{look.pk}#image-{i + 1}",
            "contentUrl": f"https://example.com/{i}.jpg",
            "thumbnailUrl": f"https://example.com/feed{i}.jpg" if i == 1 else f"https://example.com/{i}.jpg",
        }
        for i in range(1, count)
    ]


@pytest.mark.django_db(transaction=True)
def test_photo_migration_backfills_and_reverses():
    from django.db import connection
    from django.db.migrations.executor import MigrationExecutor

    from apps.accounts.models import User

    user = User.objects.create(email="migration@test.dev", name="Migration")
    before = [("looks", "0006_report_not_hair")]
    after = [("looks", "0008_backfill_look_photos")]
    executor = MigrationExecutor(connection)
    latest = executor.loader.graph.leaf_nodes()
    try:
        executor.migrate(before)
        apps = executor.loader.project_state(before).apps
        Look = apps.get_model("looks", "Look")
        Look.objects.bulk_create([
            Look(author_id=user.pk, photo_uri=f"https://example.com/{i}.jpg",
                 thumb_uri="https://example.com/thumb.jpg", feed_uri="https://example.com/feed.jpg", photo_aspect=0.8)
            for i in range(1001)
        ])
        executor = MigrationExecutor(connection)
        executor.migrate(after)
        apps = executor.loader.project_state(after).apps
        Photo = apps.get_model("looks", "LookPhoto")
        assert Photo.objects.count() == 1001
        for photo in Photo.objects.select_related("look"):
            assert photo.position == 0
            assert (photo.photo_uri, photo.thumb_uri, photo.feed_uri, photo.aspect) == (
                photo.look.photo_uri, photo.look.thumb_uri, photo.look.feed_uri, photo.look.photo_aspect)
        MigrationExecutor(connection).migrate([("looks", "0007_lookphoto")])
        assert Photo.objects.count() == 0
        assert apps.get_model("looks", "Look").objects.count() == 1001
    finally:
        MigrationExecutor(connection).migrate(latest)
