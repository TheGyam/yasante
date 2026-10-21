"""
The ranked feed, built the way the big apps build theirs (docs/FEED_PLAN.md):

1. Gather a few hundred candidate looks from several sources, each with a quota.
2. Score each by how likely she is to save, book, comment on, like or open it (the
   look's smoothed rates), lifted by her own pull toward it, faded with age, nudged for
   quality, and pushed down when she's seen it, it's been reported, or she's said Not
   for me to its style.
3. Mix the order: no runs of one person or one style, few repeats, and every 8th slot
   for a look still finding its audience, so new posts get a fair start.

Her hair type and area are used only with the hair consent. A look's hair type is never
learned from what she does, and price is never read.
"""

import math
import random
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import timedelta

from django.core.cache import cache
from django.db.models import F, FloatField, Min, Q, Sum
from django.db.models.functions import Cast, Coalesce
from django.utils import timezone

from . import weights as W
from .affinity import Affinity, affinity_for
from .models import FeedEvent, LookNeighbour, LookStats


@dataclass
class Viewer:
    user: object = None
    affinity: Affinity = field(default_factory=Affinity)
    # Only with her consent to use her hair details; empty otherwise.
    texture: str = ""
    area: str = ""
    # From her phone, for this request only (never kept).
    searched: tuple = ()


@dataclass
class Candidate:
    pk: object
    author: str
    stylist: str
    styles: tuple
    created_at: object
    sources: set = field(default_factory=set)
    score: float = 0.0
    impressions: int = 0
    saves: int = 0
    likes: int = 0
    open_reports: int = 0
    seen: int = 0
    explore: bool = False
    # What scoring reads, from _load.
    stats: object = None
    caption: str = ""
    photos: int = 0
    texture: str = ""
    area: str = ""
    tier: int = 0
    bookable: bool = False
    opened: bool = False
    not_for_me_once: bool = False
    recently_removed: bool = False

    @property
    def source(self):
        if self.explore:
            return "explore"
        return next((s for s in W.SOURCE_ORDER if s in self.sources), "fresh")


@dataclass
class Ranked:
    pk: object
    source: str
    score: float


def viewer_for(user, searched=()):
    """Who's looking: her affinities, and her hair and area only with her consent."""
    if user is None or not getattr(user, "is_authenticated", False):
        return Viewer(searched=tuple(searched))
    from apps.profiles.models import HairProfile, has_consent

    texture = area = ""
    if has_consent(user, "personalisation"):
        texture, area = HairProfile.objects.filter(user=user).values_list("texture", "area").first() or ("", "")
    return Viewer(user=user, affinity=affinity_for(user), texture=texture or "", area=area or "", searched=tuple(searched))


def global_rates():
    """How often an average look shown is saved, liked and so on: the starting point."""
    rates = cache.get("feed:rates")
    if rates is not None:
        return rates
    totals = LookStats.objects.aggregate(
        impressions=Sum("impressions"), save=Sum("saves"), book=Sum("bookings"),
        comment=Sum("comments"), like=Sum("likes"), open=Sum("opens"),
    )
    shown = totals["impressions"] or 0
    if shown < W.OWN_RATES_AFTER:
        rates = dict(W.DEFAULT_RATES)
    else:
        rates = {action: min((totals[action] or 0) / shown, 1.0) or W.DEFAULT_RATES[action] for action in W.VALUE}
    cache.set("feed:rates", rates, 600)
    return rates


def _flagged_photos():
    """Looks whose photo is waiting on a near-copy check: left out until a person decides."""
    from apps.common.models import Media

    paths = Media.objects.filter(moderation_status="flagged").order_by("-created_at").values_list("full_path", flat=True)[:500]
    query = Q()
    for path in paths:
        query |= Q(photo_uri__endswith=path)
    return query


def _allowed(user):
    from apps.looks.views import everyday_looks, public_looks

    looks = everyday_looks(user, queryset=public_looks())
    flagged = _flagged_photos()
    return looks.exclude(flagged) if flagged else looks


def _gather(viewer, now):
    """{look id: {sources}}, and how strongly each 'similar' look matches her (0..1)."""
    from apps.looks.models import Look
    from apps.looks.views import for_her_hair

    user = viewer.user
    allowed = _allowed(user)
    # Her own looks come only through "own", and only fresh ones.
    others = allowed.exclude(author=user) if user else allowed
    found = defaultdict(set)

    def take(name, queryset):
        for pk in queryset.values_list("pk", flat=True)[: W.QUOTAS[name]]:
            found[pk].add(name)

    def tagged(slugs):
        return Look.objects.filter(styles__slug__in=slugs).values("pk")

    prior = W.PRIOR_STRENGTH * global_rates()["save"]
    take("fresh", others.filter(created_at__gte=now - timedelta(days=W.FRESH_WINDOW_DAYS)).order_by("-created_at"))
    take("trending", others.filter(stats__recent_engagements__gt=0).order_by("-stats__recent_engagements", "-created_at"))
    take(
        "evergreen",
        others.filter(stats__saves__gt=0)
        .annotate(rate=(Cast(F("stats__saves"), FloatField()) + prior) / (Cast(F("stats__impressions"), FloatField()) + W.PRIOR_STRENGTH))
        .order_by("-rate", "-created_at"),
    )
    newcomers = (
        Look.objects.values("author").annotate(first=Min("created_at"))
        .filter(first__gte=now - timedelta(days=W.NEW_CREATOR_DAYS)).values("author")
    )
    take("new_creators", others.filter(author__in=newcomers).order_by("-created_at"))

    affinity = viewer.affinity
    if affinity.styles:
        top = sorted(affinity.styles, key=affinity.styles.get, reverse=True)[: W.TOP_STYLES]
        take("style", others.filter(pk__in=tagged(top)).order_by("-created_at"))
    if affinity.people:
        people = sorted(affinity.people, key=affinity.people.get, reverse=True)[: W.TOP_PEOPLE]
        take("people", others.filter(Q(author_id__in=people) | Q(stylist_id__in=people)).order_by("-created_at"))
    similar = {}
    if affinity.looks:
        engaged = sorted(affinity.looks, key=affinity.looks.get, reverse=True)[: W.RECENT_ENGAGED]
        close = defaultdict(float)
        for look, neighbour, score in LookNeighbour.objects.filter(look_id__in=engaged).values_list(
            "look_id", "neighbour_id", "score"
        ):
            close[neighbour] += score * affinity.looks[look]
        allowed_ids = set(others.filter(pk__in=list(close)).values_list("pk", flat=True))
        ranked = sorted((pk for pk in close if pk in allowed_ids), key=close.get, reverse=True)[: W.QUOTAS["similar"]]
        top = max((close[pk] for pk in ranked), default=0)
        for pk in ranked:
            found[pk].add("similar")
            similar[pk] = close[pk] / top
    if viewer.texture:
        take("hair", others.filter(for_her_hair(viewer.texture)).order_by("-created_at"))
    if viewer.area:
        take("near", others.filter(area__iexact=viewer.area).order_by("-created_at"))
    if viewer.searched:
        take("searched", others.filter(pk__in=tagged(list(viewer.searched))).order_by("-created_at"))
    if user:
        take("own", allowed.filter(author=user, created_at__gte=now - timedelta(hours=W.OWN_PINNED_HOURS)).order_by("-created_at"))
    return found, similar


def _load(found, user, now):
    """The candidates, with everything scoring reads, in a handful of queries."""
    from apps.looks.models import Look, LookPhoto, ModerationAction, NotForMe
    from apps.stylists.models import StylistProfile

    ids = list(found)
    rows = Look.objects.filter(pk__in=ids).values_list("pk", "author_id", "stylist_id", "created_at", "caption", "hair_texture", "area")
    tags = defaultdict(list)
    for look, slug in Look.styles.through.objects.filter(look_id__in=ids).values_list("look_id", "style__slug"):
        tags[look].append(slug)
    photos = Counter(LookPhoto.objects.filter(look_id__in=ids).values_list("look_id", flat=True))
    stats = {s.look_id: s for s in LookStats.objects.filter(look_id__in=ids)}
    stylist_ids = {row[2] for row in rows if row[2]}
    stylists = {
        str(account): (tier, published and not featured)
        for account, tier, published, featured in StylistProfile.objects.filter(
            account_id__in=[s for s in stylist_ids if _is_uuid(s)]
        ).values_list("account_id", "verification_tier", "published", "featured")
    }
    seen, opened, once = Counter(), set(), set()
    if user:
        since = now - timedelta(days=W.SEEN_WINDOW_DAYS)
        for look, kind in FeedEvent.objects.filter(user=user, created_at__gte=since, kind__in=["impression", "open"]).values_list("look_id", "kind"):
            if kind == "impression":
                seen[look] += 1
            else:
                opened.add(look)
        per_style = Counter(
            slug for _, slug in set(NotForMe.objects.filter(user=user).exclude(look=None).values_list("look_id", "look__styles__slug")) if slug
        )
        once = {slug for slug, n in per_style.items() if n == 1}
    removed = set(
        ModerationAction.objects.filter(action="remove", created_at__gte=now - timedelta(days=W.REMOVAL_WINDOW_DAYS))
        .exclude(author=None).values_list("author_id", flat=True)
    )

    out = []
    for pk, author, stylist, created, caption, texture, area in rows:
        s = stats.get(pk)
        tier, bookable = stylists.get(stylist or "", (0, False))
        out.append(
            Candidate(
                pk=pk, author=str(author), stylist=stylist or "", styles=tuple(tags[pk]), created_at=created,
                sources=found[pk], impressions=s.impressions if s else 0, saves=s.saves if s else 0,
                likes=s.likes if s else 0, open_reports=s.open_reports if s else 0, seen=seen[pk],
                stats=s, caption=caption, photos=photos[pk], texture=texture, area=area, tier=tier,
                bookable=bookable, opened=pk in opened, not_for_me_once=bool(once & set(tags[pk])),
                recently_removed=author in removed,
            )
        )
    return out


def _is_uuid(value):
    import uuid

    try:
        uuid.UUID(str(value))
        return True
    except ValueError:
        return False


def _rate(count, impressions, rate):
    return min((count + W.PRIOR_STRENGTH * rate) / (impressions + W.PRIOR_STRENGTH), 1.0)


def score(c, viewer, similar, rates, now):
    """How much this look is worth showing her now. See docs/FEED_PLAN.md, section 5."""
    s = c.stats
    counts = {
        "save": s.saves if s else 0, "book": s.bookings if s else 0, "comment": s.comments if s else 0,
        "like": s.likes if s else 0, "open": s.opens if s else 0,
    }
    value = sum(W.VALUE[a] * _rate(counts[a], c.impressions, rates[a]) for a in W.VALUE)

    affinity = viewer.affinity
    pulls = {
        "style": max((affinity.styles.get(slug, 0) for slug in c.styles), default=0),
        "people": max(affinity.people.get(c.author, 0), affinity.people.get(c.stylist, 0)),
        "similar": similar.get(c.pk, 0),
        # Her hair and area only reach here with her consent (viewer_for).
        "hair": 1.0 if "hair" in c.sources or (viewer.texture and c.texture == viewer.texture) else 0.0,
        "near": 1.0 if viewer.area and c.area.lower() == viewer.area.lower() else 0.0,
        "searched": 1.0 if set(c.styles) & set(viewer.searched) else 0.0,
    }
    lift = 1 + sum(W.LIFT[k] * v for k, v in pulls.items())

    age_days = max((now - c.created_at).total_seconds() / 86400, 0)
    fresh = W.FRESH_FLOOR + (1 - W.FRESH_FLOOR) * math.exp(-age_days / W.FRESH_DAYS)

    quality = W.QUALITY_BASE + sum(
        W.QUALITY[k]
        for k, on in (
            ("caption", bool(c.caption.strip())), ("photos", c.photos > 1), ("stylist", bool(c.stylist)),
            ("bookable", c.bookable), ("verified", c.tier > 0),
        )
        if on
    )

    penalty = W.SEEN ** c.seen
    if c.opened:
        penalty *= W.OPENED
    if c.open_reports >= W.REPORTS_TO_DEMOTE:
        penalty *= W.REPORTED
    if c.not_for_me_once:
        penalty *= W.NOT_FOR_ME_ONCE
    if c.recently_removed:
        penalty *= W.RECENT_REMOVAL
    return value * lift * fresh * quality * penalty


def _fits(c, out):
    """Variety: no person twice in 4, no style thrice in 5, one repeat in 10."""
    for prev in out[-(W.AUTHOR_GAP - 1):]:
        if ({c.author, c.stylist} - {""}) & ({prev.author, prev.stylist} - {""}):
            return False
    window = Counter(slug for prev in out[-(W.STYLE_WINDOW - 1):] for slug in prev.styles)
    if any(window[slug] >= W.STYLE_REPEATS for slug in c.styles):
        return False
    if c.seen and any(prev.seen for prev in out[-(W.SEEN_PER - 1):]):
        return False
    return True


def _thompson(c, rates, rng):
    """A draw from what this look's save rate might really be: unproven looks get chances."""
    hits = c.saves + c.likes / 2
    alpha = 1 + W.PRIOR_STRENGTH * rates["save"] + hits
    beta = 1 + W.PRIOR_STRENGTH * (1 - rates["save"]) + max(c.impressions - hits, 0)
    return rng.betavariate(alpha, beta)


def mix(candidates, rates, rng, limit=W.SESSION_SIZE):
    """
    Best first, with variety and exploration. Her own fresh looks lead; looks with open
    reports wait at the end, whatever their score, until a person has decided.
    """
    own = sorted((c for c in candidates if "own" in c.sources), key=lambda c: c.created_at, reverse=True)
    rest = sorted((c for c in candidates if "own" not in c.sources), key=lambda c: c.score, reverse=True)
    held = [c for c in rest if c.open_reports >= W.REPORTS_TO_DEMOTE]
    pool = [c for c in rest if c.open_reports < W.REPORTS_TO_DEMOTE]
    out = list(own)
    while pool and len(out) < limit:
        slot = len(out) + 1 - len(own)
        pick = None
        if slot % W.EXPLORE_EVERY == 0:
            unproven = [
                c for c in pool
                if c.impressions < W.EXPLORE_UNDER_IMPRESSIONS and not c.open_reports and not c.seen
            ]
            if unproven:
                pick = max(unproven, key=lambda c: _thompson(c, rates, rng))
                pick.explore = True
        if pick is None:
            # The best that keeps the variety rules; if none can, the best there is.
            pick = next((c for c in pool if _fits(c, out)), pool[0])
        pool.remove(pick)
        out.append(pick)
    return (out + held)[:limit]


def rank_feed(user, searched=(), now=None, rng=None, limit=W.SESSION_SIZE):
    """Her everyday feed, ranked: [Ranked(pk, source, score)], best first."""
    now = now or timezone.now()
    rng = rng or random.Random()
    viewer = viewer_for(user, searched)
    found, similar = _gather(viewer, now)
    if not found:
        return []
    rates = global_rates()
    candidates = _load(found, viewer.user, now)
    for c in candidates:
        c.score = score(c, viewer, similar, rates, now)
    return [Ranked(c.pk, c.source, c.score) for c in mix(candidates, rates, rng, limit)]
