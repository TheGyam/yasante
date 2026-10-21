"""
Feed sessions: one scroll of the ranked feed, from opening it (or pulling to refresh) to
leaving it. The ranked list is kept in the cache for half an hour, so paging never
repeats or skips a look, and each next page re-ranks what's left from what she did on
the pages before (TikTok-style): styles and people she opened, liked or saved rise,
styles she scrolled past fall.
"""

import random
import secrets
from collections import Counter
from datetime import datetime

from django.core.cache import cache
from django.utils import timezone

from . import weights as W
from .models import FeedEvent
from .ranking import Candidate, global_rates, mix, rank_feed

PREFIX = "rk."
SESSION_SECONDS = 30 * 60
# Signed out, everyone shares one ranking for a few minutes.
SHARED_SECONDS = 5 * 60
SHARED_KEY = "feed:shared"
# How strongly this session's actions move what's left.
SESSION_PULL = 0.6
SESSION_SKIP = 0.3
SESSION_FLOOR = 0.3


def features_shown(sessions):
    """{(session, look id): features} for what these sessions ranked, while still cached."""
    found = {}
    for session in sessions:
        state = cache.get(_key(session))
        for d in (state or {}).get("items", []):
            found[(session, d["pk"])] = d.get("features") or {}
    return found


def is_ranked_cursor(cursor):
    return not cursor or cursor.startswith(PREFIX)


def _key(session):
    return f"feed:session:{session}"


def _parse(cursor):
    """(session, offset) from a ranked cursor; (None, 0) for a first page."""
    if not cursor:
        return None, 0
    try:
        session, offset = cursor[len(PREFIX):].rsplit(".", 1)
        return session, max(int(offset), 0)
    except ValueError:
        return None, 0


def _pack(c):
    return {
        "pk": str(c.pk), "source": c.source, "base": c.score, "score": c.score, "author": c.author,
        "stylist": c.stylist, "styles": list(c.styles), "seen": c.seen, "impressions": c.impressions,
        "reports": c.open_reports, "saves": c.saves, "likes": c.likes, "own": "own" in c.sources,
        "features": c.features,
    }


def _unpack(d):
    return Candidate(
        pk=d["pk"], author=d["author"], stylist=d["stylist"], styles=tuple(d["styles"]), created_at=None,
        sources={"own"} if d["own"] else {d["source"]}, score=d["score"], impressions=d["impressions"],
        saves=d["saves"], likes=d["likes"], open_reports=d["reports"], seen=d["seen"],
        explore=d["source"] == "explore",
    )


def _ranked(user, searched, now):
    if user is None and not searched:
        shared = cache.get(SHARED_KEY)
        if shared is None:
            shared = [_pack(c) for c in rank_feed(None, now=now)]
            cache.set(SHARED_KEY, shared, SHARED_SECONDS)
        return [dict(d) for d in shared]
    return [_pack(c) for c in rank_feed(user, searched, now=now)]


def _adapt(state, user, session, offset):
    """Re-rank what's left from what she did on the pages already served."""
    from apps.looks.models import LookLike
    from apps.planner.models import CollectionItem

    items = state["items"]
    started = datetime.fromisoformat(state["started"])
    events = list(FeedEvent.objects.filter(user=user, session=session).values_list("look_id", "kind"))
    engaged = {str(look) for look, kind in events if kind == "open"}
    engaged |= {str(pk) for pk in LookLike.objects.filter(user=user, created_at__gte=started).values_list("look_id", flat=True)}
    engaged |= set(
        CollectionItem.objects.filter(kind="look", collection__user=user, created_at__gte=started).values_list("ref_id", flat=True)
    )
    seen = {str(look) for look, kind in events if kind == "impression"}
    by_pk = {d["pk"]: d for d in items}
    liked_styles, liked_people, passed = Counter(), Counter(), Counter()
    for pk in engaged & set(by_pk):
        liked_styles.update(by_pk[pk]["styles"])
        liked_people.update(p for p in (by_pk[pk]["author"], by_pk[pk]["stylist"]) if p)
    skipped = (seen - engaged) & set(by_pk)
    for pk in skipped:
        passed.update(by_pk[pk]["styles"])
    if not (liked_styles or passed):
        return items

    def share(counter, keys):
        total = max(sum(counter.values()), 1)
        return max((counter[k] / total for k in keys), default=0)

    rest = items[offset:]
    for d in rest:
        factor = (
            1
            + SESSION_PULL * share(liked_styles, d["styles"])
            + SESSION_PULL * share(liked_people, [d["author"], d["stylist"]])
            - SESSION_SKIP * share(passed, d["styles"])
        )
        # Always from the score she started with, so a long scroll doesn't run away.
        d["score"] = d["base"] * max(factor, SESSION_FLOOR)
    served = [_unpack(d) for d in items[:offset]]
    slots = sum(1 for d in items[:offset] if not d["own"])
    # Her own fresh looks keep their place at the top; the rest is mixed again.
    own = [d for d in rest if d["own"]]
    others = [_unpack(d) for d in rest if not d["own"]]
    remixed = mix(others, global_rates(), random.Random(), len(others), served=served, slots_served=slots)
    return items[:offset] + own + [by_pk[str(c.pk)] for c in remixed]


def ranked_page(user, searched, cursor, limit, now=None, scope="feed", rank=None):
    """
    ([(look id, source)], next cursor or None, session) for one page of her ranked feed,
    or of another ranked list (`scope` names it, `rank()` ranks it: "More like this").
    """
    now = now or timezone.now()
    owner = str(user.pk) if user else None
    session, offset = _parse(cursor)
    state = cache.get(_key(session)) if session else None
    if state is not None and (state["owner"] != owner or state.get("scope", "feed") != scope):
        # Someone else's scroll, or another list's: theirs stays theirs.
        state, session, offset = None, None, 0
    if state is None:
        already = set()
        if session:
            # Expired mid-scroll: carry on without what this scroll already showed.
            already = {str(pk) for pk in FeedEvent.objects.filter(session=session).values_list("look_id", flat=True)}
        else:
            session = secrets.token_urlsafe(12)
        ranked = [_pack(c) for c in rank()] if rank else _ranked(user, searched, now)
        items = [d for d in ranked if d["pk"] not in already]
        state, offset = {"owner": owner, "scope": scope, "items": items, "started": now.isoformat()}, 0
    elif offset and user:
        state["items"] = _adapt(state, user, session, offset)

    page = state["items"][offset : offset + limit]
    cache.set(_key(session), state, SESSION_SECONDS)
    after = offset + len(page)
    more = after < len(state["items"])
    return [(d["pk"], d["source"]) for d in page], f"{PREFIX}{session}.{after}" if more else None, session
