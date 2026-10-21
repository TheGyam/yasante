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
