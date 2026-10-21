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
