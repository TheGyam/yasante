"""The ranked feed: what it records, how it ranks, and the rules it keeps."""

from datetime import timedelta

import pytest
from django.utils import timezone

pytestmark = pytest.mark.django_db


def ranked_feed(mode="everyone"):
    from apps.features.models import Switch

    Switch.objects.update_or_create(key="ranked_feed", defaults={"mode": mode})


def seen(look, kind="impression", session="session-1", **extra):
    return {"session": session, "surface": "home", "lookId": str(look.pk), "kind": kind, **extra}


def test_nothing_is_recorded_while_the_ranked_feed_is_off(api, make_user, make_look):
    from apps.feed.models import FeedEvent

    me, look = make_user(), make_look(make_user())
    assert api(me).post("/api/feed/events/", {"events": [seen(look)]}).status_code == 202
    assert not FeedEvent.objects.exists()
    assert "session" not in api(me).get("/api/looks/").json()


def test_what_she_sees_and_opens_is_recorded_once_per_scroll(api, make_user, make_look):
    from apps.feed.models import FeedEvent

    ranked_feed()
    me, look = make_user(), make_look(make_user())
    events = [
        seen(look, position=3, source="trending"),
        seen(look, position=3),
        seen(look, kind="open", position=3),
        seen(look, kind="dwell", ms=8200),
        {**seen(look), "lookId": "00000000-0000-0000-0000-000000000000"},
    ]
    assert api(me).post("/api/feed/events/", {"events": events}).status_code == 201
    stored = {e.kind: e for e in FeedEvent.objects.filter(user=me)}
    assert FeedEvent.objects.count() == 3
    assert stored["impression"].position == 3 and stored["impression"].source == "trending"
    assert stored["dwell"].dwell_ms == 8200 and stored["open"].dwell_ms is None
    # Seen again in a new scroll counts again.
    api(me).post("/api/feed/events/", {"events": [seen(look, session="session-2")]})
    assert FeedEvent.objects.filter(kind="impression").count() == 2


def test_a_feed_session_starts_on_the_first_page_only_while_on(api, make_user, make_look):
    for _ in range(3):
        make_look(make_user())
    ranked_feed()
    first = api(make_user()).get("/api/looks/", limit=2).json()
    assert len(first["session"]) >= 8
    assert "session" not in api(make_user()).get("/api/looks/", limit=2, cursor=first["nextCursor"]).json()


def test_signed_out_events_are_counted_without_anyone_attached(api, make_user, make_look):
    from apps.feed.models import FeedEvent

    look = make_look(make_user())
    ranked_feed("staff")
    api().post("/api/feed/events/", {"events": [seen(look)]})
    assert not FeedEvent.objects.exists()
    ranked_feed()
    api().post("/api/feed/events/", {"events": [seen(look)]})
    assert FeedEvent.objects.get().user is None


def test_bad_events_are_refused(api, make_user, make_look):
    ranked_feed()
    me, look = make_user(), make_look(make_user())
    for bad in ({"session": "short"}, {"kind": "liked"}, {"surface": "ads"}, {"ms": -1}):
        assert api(me).post("/api/feed/events/", {"events": [{**seen(look), **bad}]}).status_code == 400
    assert api(me).post("/api/feed/events/", {"events": [seen(look)] * 101}).status_code == 400


def test_feed_events_go_after_90_days_with_the_account_and_into_her_download(api, make_user, make_look):
    from apps.common.tasks import enforce_retention
    from apps.feed.models import FeedEvent
    from apps.profiles.tasks import collect_user_data

    ranked_feed()
    me, look = make_user(), make_look(make_user())
    api(me).post("/api/feed/events/", {"events": [seen(look), seen(look, kind="open")]})
    assert len(collect_user_data(me)["feed_activity"]) == 2
    FeedEvent.objects.filter(kind="open").update(created_at=timezone.now() - timedelta(days=91))
    enforce_retention()
    assert list(FeedEvent.objects.values_list("kind", flat=True)) == ["impression"]
    assert api(me).delete(f"/api/users/{me.pk}/").status_code == 204
    assert not FeedEvent.objects.exists()


def save(user, look, when=None):
    from apps.looks.models import Look
    from apps.planner.models import Collection, CollectionItem

    board, _ = Collection.objects.get_or_create(user=user, name="Next")
    item = CollectionItem.objects.create(collection=board, kind="look", ref_id=str(look.pk))
    if when:
        CollectionItem.objects.filter(pk=item.pk).update(created_at=when)
    Look.objects.filter(pk=look.pk).update(save_count=look.save_count + 1)
    look.refresh_from_db()


def like(api, user, look, when=None):
    from apps.looks.models import LookLike

    assert api(user).post(f"/api/looks/{look.pk}/like/").status_code in (200, 201, 204)
    if when:
        LookLike.objects.filter(user=user, look=look).update(created_at=when)


def test_look_stats_count_what_happened_to_each_look(api, make_user, make_look, make_stylist, book):
    from apps.bookings.models import Booking
    from apps.feed.models import LookStats
    from apps.feed.stats import refresh_look_stats

    ranked_feed()
    profile = make_stylist()
    look, quiet = make_look(make_user(), stylist=profile), make_look(make_user())
    fans = [make_user() for _ in range(3)]
    for fan in fans:
        like(api, fan, look)
    save(fans[0], look)
    api(fans[1]).post(f"/api/looks/{look.pk}/comments/", {"body": "Neat parts"})
    api(fans[2]).post("/api/not-for-me/", {"lookId": str(look.pk)})
    api(fans[2]).post(f"/api/looks/{look.pk}/report/", {"reason": "scam"})
    api(fans[0]).post("/api/feed/events/", {"events": [seen(look), seen(look, kind="open"), seen(look, kind="dwell", ms=4000)]})
    Booking.objects.filter(pk=book(fans[1], profile)["id"]).update(from_look=look)

    assert refresh_look_stats() == 2
    stats = LookStats.objects.get(look=look)
    assert (stats.likes, stats.saves, stats.comments, stats.bookings) == (3, 1, 1, 1)
    assert (stats.impressions, stats.opens, stats.dwell_ms) == (1, 1, 4000)
    assert (stats.not_for_me, stats.open_reports, stats.recent_impressions) == (1, 1, 1)
    # Three likes, a save, a comment and a booking, all in the last three days.
    assert stats.recent_engagements == 6
    assert LookStats.objects.get(look=quiet).likes == 0
    # Run again: the same rows, refreshed.
    assert refresh_look_stats() == 2 and LookStats.objects.count() == 2


def test_neighbours_are_looks_the_same_people_engage_with(api, make_user, make_look):
    from apps.feed.models import LookNeighbour
    from apps.feed.stats import refresh_neighbours
    from apps.looks.models import LookLike

    a, b, c, hidden = (make_look(make_user()) for _ in range(4))
    for _ in range(3):
        fan = make_user()
        like(api, fan, a)
        save(fan, b)
    other = make_user()
    like(api, other, a)
    like(api, other, c)
    # Liked before it was taken down.
    LookLike.objects.create(user=other, look=hidden)
    hidden.status = "removed"
    hidden.save()

    refresh_neighbours()
    close = list(LookNeighbour.objects.filter(look=a).values_list("neighbour_id", flat=True))
    # Shared by three people beats shared by one; a removed look is never anyone's neighbour.
    assert close == [b.pk, c.pk]
    assert LookNeighbour.objects.filter(look=b, neighbour=a).exists()


def test_affinity_weighs_saves_over_likes_and_fades_with_time(api, make_user, make_look):
    from apps.feed.affinity import affinity_for

    me = make_user()
    old = timezone.now() - timedelta(days=42)
    save(me, make_look(make_user(), style="twists"))
    like(api, me, make_look(make_user(), style="knotless"))
    like(api, me, make_look(make_user(), style="cornrows"), when=old)
    styles = affinity_for(me).styles
    assert styles["twists"] == 1
    assert 0.5 < styles["knotless"] < 1
    # Six weeks ago is three half-lives: an eighth as much.
    assert styles["cornrows"] == pytest.approx(styles["knotless"] / 8, rel=0.01)
    assert not affinity_for(None)


def test_affinity_knows_people_from_what_she_did_but_never_hair_or_price(
    api, make_user, make_look, make_stylist, book
):
    from apps.feed.affinity import affinity_for
    from apps.looks.models import Look

    me, profile, poster = make_user(), make_stylist(), make_user()
    for _ in range(3):
        coily = make_look(poster, hair_texture="coily")
        Look.objects.filter(pk=coily.pk).update(price=40)
        like(api, me, coily)
    book(me, profile)
    found = affinity_for(me)
    assert set(found.people) == {str(poster.pk), str(profile.account_id)}
    # Liking looks on coily hair says nothing about her hair, and nothing about money.
    assert set(found.styles) == {"knotless"}
    assert set(vars(found)) == {"styles", "people", "looks"}


def numbers(look, **values):
    from apps.feed.models import LookStats

    LookStats.objects.update_or_create(look=look, defaults=values)


def ranked(user=None, **options):
    import random

    from apps.feed.ranking import rank_feed

    return rank_feed(user, rng=random.Random(7), **options)


def order(user=None, **options):
    return [r.pk for r in ranked(user, **options)]


def test_looks_people_save_come_before_looks_they_scroll_past(make_user, make_look):
    loved, ignored, unknown = (make_look(make_user()) for _ in range(3))
    numbers(loved, impressions=100, saves=30, likes=40)
    numbers(ignored, impressions=100)
    # Nothing known yet: the average, which beats a look nobody wanted.
    assert order() == [loved.pk, unknown.pk, ignored.pk]


def test_her_own_pull_toward_a_style_lifts_it(api, make_user, make_look):
    me = make_user()
    for _ in range(2):
        save(me, make_look(make_user(), style="twists"))
    twists, knotless = make_look(make_user(), style="twists"), make_look(make_user(), style="knotless")
    found = {r.pk: r for r in ranked(me)}
    assert found[twists.pk].score > found[knotless.pk].score
    assert found[twists.pk].source in ("style", "similar")


def test_hair_matching_needs_her_consent_and_is_never_learned(api, make_user, make_look, consent):
    me = make_user(texture="coily")
    coily, straight = make_look(make_user(), hair_texture="coily"), make_look(make_user(), hair_texture="straight")
    # Liking looks on coily hair, without her consent, teaches the feed nothing about hair.
    for _ in range(3):
        like(api, me, make_look(make_user(), style="twists", hair_texture="coily"))
    without = {r.pk: r for r in ranked(me)}
    assert without[coily.pk].score == pytest.approx(without[straight.pk].score, rel=0.01)
    assert all(r.source != "hair" for r in without.values())
    consent(me, "personalisation")
    from django.core.cache import cache

    cache.clear()
    found = {r.pk: r for r in ranked(me)}
    assert found[coily.pk].score > found[straight.pk].score
    assert found[coily.pk].source == "hair"


def test_the_feed_never_runs_one_person_together(make_user, make_look):
    busy = make_user()
    for style in ("knotless", "box-braids", "cornrows", "twists"):
        numbers(make_look(busy, style=style), impressions=300, saves=90)
    for style in ("silk-press", "knotless", "box-braids"):
        numbers(make_look(make_user(), style=style), impressions=300, saves=10)
    from apps.looks.models import Look

    authors = dict(Look.objects.values_list("pk", "author_id"))
    first = [authors[pk] for pk in order()[:4]]
    assert len(set(first)) == 4


def test_every_eighth_look_gives_a_new_one_a_chance(make_user, make_look):
    styles = ["knotless", "box-braids", "cornrows", "twists", "silk-press"]
    for i in range(8):
        numbers(make_look(make_user(), style=styles[i % 5]), impressions=500, saves=100 - i)
    # Most looks are ordinary: a new one is expected to be ordinary too, until shown.
    for i in range(10):
        numbers(make_look(make_user(), style=styles[i % 5]), impressions=500, saves=5)
    newcomer = make_look(make_user())
    found = ranked()
    assert found[7].pk == newcomer.pk and found[7].source == "explore"


def test_reported_copied_blocked_and_unwanted_looks_stay_out_of_the_way(api, make_user, make_look):
    from apps.common.models import Media
    from apps.looks.models import Look

    me = make_user()
    reported, fine = make_look(make_user()), make_look(make_user())
    numbers(reported, impressions=100, saves=50, open_reports=2)
    numbers(fine, impressions=100, saves=5)
    copied = make_look(make_user())
    Media.objects.create(owner=copied.author, kind="look", full_path="uploads/x/copy.jpg", moderation_status="flagged")
    Look.objects.filter(pk=copied.pk).update(photo_uri="https://example.com/media/uploads/x/copy.jpg")
    rude, unwanted = make_look(make_user()), make_look(make_user())
    assert api(me).post("/api/blocks/", {"accountId": str(rude.author_id)}).status_code in (200, 201, 204)
    api(me).post("/api/not-for-me/", {"lookId": str(unwanted.pk)})

    found = order(me)
    assert found == [fine.pk, reported.pk]


def test_looks_she_has_seen_this_week_make_way_for_new_ones(api, make_user, make_look):
    ranked_feed()
    me = make_user()
    seen_twice, unseen = make_look(make_user(), style="twists"), make_look(make_user(), style="cornrows")
    for session in ("session-1", "session-2"):
        api(me).post("/api/feed/events/", {"events": [seen(seen_twice, session=session)]})
    assert order(me) == [unseen.pk, seen_twice.pk]


def test_her_fresh_look_comes_first_and_older_ones_stay_on_her_profile(make_user, make_look):
    from apps.looks.models import Look

    me = make_user()
    old = make_look(me)
    Look.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=3))
    other = make_look(make_user())
    numbers(other, impressions=100, saves=60)
    mine = make_look(me)
    found = ranked(me)
    assert [r.pk for r in found] == [mine.pk, other.pk] and found[0].source == "own"


def test_styles_from_her_searches_are_lifted_without_being_kept(make_user, make_look):
    twists, knotless = make_look(make_user(), style="twists"), make_look(make_user(), style="knotless")
    found = {r.pk: r for r in ranked(searched=["twists"])}
    assert found[twists.pk].score > found[knotless.pk].score and found[twists.pk].source == "searched"


def test_ranking_queries_do_not_grow_with_the_number_of_looks(api, make_user, make_look, consent):
    from django.db import connection
    from django.test.utils import CaptureQueriesContext

    me = make_user(texture="coily")
    consent(me, "personalisation")
    save(me, make_look(make_user(), style="twists"))
    counts = []
    for n in (3, 15):
        for _ in range(n):
            numbers(make_look(make_user(), style="twists"), impressions=50, saves=5)
        ranked(me)  # warm the caches
        from django.core.cache import cache

        cache.delete("feed:rates")
        cache.delete(f"feed:affinity:{me.pk}")
        with CaptureQueriesContext(connection) as queries:
            ranked(me)
        counts.append(len(queries))
    assert counts[0] == counts[1] and counts[0] <= 40
