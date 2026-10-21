"""
Suggestions beyond the feed (docs/FEED_PLAN.md, section 12): "More like this" under a
look, "Stylists for you" at the top of the feed, and the plain-English reason a look is
in her feed, for "Why am I seeing this".
"""

import math
import random
from collections import Counter, defaultdict

from django.db.models import Q
from django.utils import timezone

from apps.features.switches import is_on

from .affinity import affinity_for
from .models import SWITCH, LookNeighbour
from .ranking import Viewer, _allowed, _load, global_rates, mix, score, viewer_for

# What "More like this" leans on most: looks the same people saved, then the same styles,
# then more from the same person.
RELATED_PULL = {"similar": 1.0, "style": 0.5, "people": 0.3}
RELATED_QUOTAS = {"similar": 50, "style": 100, "people": 30}
SUGGESTED_STYLISTS = 10


def _personal(user):
    """Her own pull only while the ranked feed is on for her; otherwise nothing personal."""
    return viewer_for(user) if user is not None and is_on(SWITCH, user) else Viewer()


def related_looks(look, user, limit=12, now=None, rng=None):
    """Looks like this one, best for her first, with variety."""
    from apps.looks.models import Look

    now = now or timezone.now()
    allowed = _allowed(user).exclude(pk=look.pk)
    if user is not None:
        allowed = allowed.exclude(author=user)
    found, similar = defaultdict(set), {}

    neighbours = dict(
        LookNeighbour.objects.filter(look=look).values_list("neighbour_id", "score")[: RELATED_QUOTAS["similar"]]
    )
    if neighbours:
        top = max(neighbours.values())
        for pk in allowed.filter(pk__in=list(neighbours)).values_list("pk", flat=True):
            found[pk].add("similar")
            similar[pk] = neighbours[pk] / top
    slugs = list(look.styles.values_list("slug", flat=True))
    if slugs:
        same = allowed.filter(pk__in=Look.objects.filter(styles__slug__in=slugs).values("pk")).order_by("-created_at")
        for pk in same.values_list("pk", flat=True)[: RELATED_QUOTAS["style"]]:
            found[pk].add("style")
    person = Q(author_id=look.author_id) | (Q(stylist_id=look.stylist_id) if look.stylist_id else Q(pk__in=[]))
    for pk in allowed.filter(person).order_by("-created_at").values_list("pk", flat=True)[: RELATED_QUOTAS["people"]]:
        found[pk].add("people")
    if not found:
        return []

    viewer = _personal(user)
    rates = global_rates()
    candidates = _load(found, viewer.user, now)
    for c in candidates:
        closeness = sum(RELATED_PULL[s] for s in c.sources) + RELATED_PULL["similar"] * similar.get(c.pk, 0)
        # Her own pull, without counting "similar" twice: here it means like this look.
        c.score = score(c, viewer, {}, rates, now) * (1 + closeness)
    return mix(candidates, rates, rng or random.Random(), limit)


def suggested_stylists(user, limit=SUGGESTED_STYLISTS):
    """[(profile, reason)]: stylists whose work matches what she's drawn to."""
    if user is None or not is_on(SWITCH, user):
        return []
    from apps.common.blocks import blocked_account_ids
    from apps.looks.models import Look, NotForMe, Style
    from apps.looks.views import public_looks
    from apps.stylists.models import StylistProfile

    viewer = viewer_for(user)
    affinity = viewer.affinity
    hidden = set(blocked_account_ids(user)) | set(
        NotForMe.objects.filter(user=user).exclude(stylist=None).values_list("stylist_id", flat=True)
    )
    profiles = list(
        StylistProfile.objects.filter(published=True).exclude(account=user).exclude(account_id__in=hidden)
    )
    if not profiles:
        return []
    accounts = {str(p.account_id) for p in profiles}
    work = defaultdict(Counter)
    for author, stylist, slug in public_looks().filter(status="live", visibility="public").filter(
        Q(author_id__in=accounts) | Q(stylist_id__in=accounts)
    ).values_list("author_id", "stylist_id", "styles__slug"):
        who = stylist if stylist in accounts else str(author)
        if slug:
            work[who][slug] += 1
    names = dict(Style.objects.values_list("slug", "name"))

    scored = []
    for p in profiles:
        key = str(p.account_id)
        styles = work.get(key, Counter())
        total = sum(styles.values())
        match = sum(affinity.styles.get(s, 0) * n for s, n in styles.items()) / total if total else 0
        known = affinity.people.get(key, 0)
        near = 1.0 if viewer.area and p.base_area.lower() == viewer.area.lower() else 0.0
        # A smoothed rating: five reviews' worth of 4.5 stars to start from.
        rating = ((float(p.rating_average or 0) * p.rating_count) + 4.5 * 5) / (p.rating_count + 5) / 5
        quality = 0.5 + 0.2 * min(p.verification_tier, 2) / 2 + 0.3 * rating
        value = (1 + 1.5 * match + 1.2 * known + 0.5 * near) * quality * (1 + 0.1 * math.log1p(total))
        if p.featured:
            # Set up by Yasante and not taking bookings yet: shown, after those who are.
            value *= 0.5
        favourite = max(styles, key=lambda s: affinity.styles.get(s, 0) * styles[s], default=None)
        if known:
            reason = "You’ve booked or liked their work before"
        elif favourite and affinity.styles.get(favourite):
            reason = f"Does {names.get(favourite, favourite)}, a style you like"
        elif near:
            reason = "Near you"
        else:
            reason = "Well reviewed on Yasante"
        scored.append((value, p, reason))
    scored.sort(key=lambda row: -row[0])
    return [(p, reason) for _, p, reason in scored[:limit]]


def reasons(items, user, surface="feed"):
    """
    The plain-English reason for each (look, source), only for her to see. Never says a
    look is there because she searched (Yaw, 21 Oct 2026).
    """
    from apps.looks.models import Style

    affinity = affinity_for(user) if user is not None else None
    names = dict(Style.objects.values_list("slug", "name"))
    out = []
    for look, source, person in items:
        slugs = [s.slug for s in look.styles.all()]
        liked = max(slugs, key=lambda s: affinity.styles.get(s, 0), default=None) if affinity else None
        style_name = names.get(liked or (slugs[0] if slugs else ""), "")
        if surface == "related":
            text = {
                "similar": "Saved by people who saved this look",
                "style": f"More {style_name}" if style_name else "In the same style",
                "people": f"More from {person}" if person else "More from the same person",
            }.get(source, "Like this look")
        else:
            text = {
                "own": "You posted this",
                "similar": "Like looks you’ve saved and liked",
                "people": f"From {person}, whose work you’ve liked or booked" if person else "From someone whose work you’ve liked",
                "style": f"Because you like {style_name}" if style_name else "In a style you like",
                "hair": "Matches your hair",
                "near": "Near you",
                "trending": "Popular this week",
                "new_creators": "New on Yasante",
                "fresh": "Just posted",
                "evergreen": "Loved on Yasante",
                "explore": "Something new to try",
            }.get(source, "Picked for you")
        out.append(text)
    return out
