"""
Suggestions beyond the feed (docs/FEED_PLAN.md, section 12): "More like this" under a
look, "Stylists for you" above the feed, and the plain-English reason a look is
in her feed, for "Why am I seeing this".
"""

import math
import random
import re
from collections import Counter, defaultdict

from django.db.models import Q
from django.utils import timezone

from apps.features.switches import is_on

from .affinity import affinity_for
from .models import SWITCH, LookNeighbour
from .ranking import Viewer, _allowed, _load, global_rates, mix, score, viewer_for

# "More like this", as Pinterest ranks related pins: how close each look is to this one
# comes first (what the same people saved, how many styles they share, the same
# stylist), then how good it is for her. Each part is 0..1, times these.
CLOSENESS = {"similar": 1.0, "styles": 0.8, "people": 0.3}
# How far closeness outweighs her taste and how well a look is doing.
CLOSENESS_PULL = 2.0
RELATED_QUOTAS = {"similar": 100, "style": 200, "people": 30}
# Past the close ones it widens, so it never just stops: up to this many from each of
# the wider bands (kindred styles, the same hair texture, the best of the rest).
WIDER_QUOTA = 150
# Words two style names can share without being kin ("Wash and go", "Feed-in braids").
NOT_KIN = {"and", "in", "go", "on", "with", "the"}
# One visit's worth, paged through like the feed.
RELATED_SIZE = 400
SUGGESTED_STYLISTS = 10
# "Stylists for you" is for finding someone new: at most this many she already knows.
KNOWN_SLOTS = 2
# Her most engaged looks, for who people with her taste go to.
CROWD_LOOKS = 50
# Up to this much either way, changed daily, so close calls take turns.
SHUFFLE = 0.15
# A booking that never happened doesn't make a stylist one she's found.
NOT_BOOKED = ("declined", "expired")


def _personal(user):
    """Her own pull only while the ranked feed is on for her; otherwise nothing personal."""
    return viewer_for(user) if user is not None and is_on(SWITCH, user) else Viewer()


def related_looks(look, user, limit=RELATED_SIZE, now=None, rng=None):
    """
    Looks like this one, closest and best for her first, with variety. What she's seen
    or opened this week sinks (as in her feed), so it isn't the same looks every visit.

    Like Pinterest's, it doesn't stop when the close ones run out: it widens, in bands,
    to kindred styles (box and knotless braids share "braids"), then looks on the same
    hair texture, then the best of the rest. Each band is ranked on its own and follows
    the one before, so it's one list and the closest always lead.
    """
    from apps.looks.models import Look, Style

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
    slugs = set(look.styles.values_list("slug", flat=True))
    if slugs:
        same = allowed.filter(pk__in=Look.objects.filter(styles__slug__in=slugs).values("pk")).order_by("-created_at")
        for pk in same.values_list("pk", flat=True)[: RELATED_QUOTAS["style"]]:
            found[pk].add("style")
    person = Q(author_id=look.author_id) | (Q(stylist_id=look.stylist_id) if look.stylist_id else Q(pk__in=[]))
    for pk in allowed.filter(person).order_by("-created_at").values_list("pk", flat=True)[: RELATED_QUOTAS["people"]]:
        found[pk].add("people")

    band = {}
    rest = allowed.exclude(pk__in=list(found))
    # Kin by name: "Knotless braids" and "Boho braids" share "braids", "Faux locs" "locs".
    named = {slug: set(re.split(r"[\s-]+", name.lower())) - NOT_KIN for slug, name in Style.objects.values_list("slug", "name")}
    words = set().union(*(named.get(slug, set()) for slug in slugs))
    kin = [slug for slug, its in named.items() if slug not in slugs and words & its]
    wider = [
        ("style", rest.filter(styles__slug__in=kin).distinct() if kin else rest.none()),
        ("hair", rest.filter(hair_texture=look.hair_texture) if look.hair_texture else rest.none()),
        ("evergreen", rest),
    ]
    for n, (source, looks) in enumerate(wider, start=1):
        for pk in looks.exclude(pk__in=list(band)).order_by("-created_at").values_list("pk", flat=True)[:WIDER_QUOTA]:
            found[pk].add(source)
            band[pk] = n
    if not found:
        return []

    viewer = _personal(user)
    rates = global_rates()
    candidates = _load(found, viewer.user, now)
    for c in candidates:
        # Shared styles out of all the styles either has: one in common of five says less.
        shared = len(slugs & set(c.styles)) / len(slugs | set(c.styles)) if slugs else 0
        closeness = (
            CLOSENESS["similar"] * similar.get(c.pk, 0)
            + CLOSENESS["styles"] * shared
            + CLOSENESS["people"] * ("people" in c.sources)
        )
        # Her own pull, without counting "similar" twice: here it means like this look.
        c.score = score(c, viewer, {}, rates, now) * (1 + CLOSENESS_PULL * closeness)
    rng = rng or random.Random()
    out = mix([c for c in candidates if c.pk not in band], rates, rng, limit)
    for n in range(1, len(wider) + 1):
        if len(out) >= limit:
            break
        out += mix([c for c in candidates if band.get(c.pk) == n], rates, rng, limit - len(out), served=out, slots_served=len(out))
    return out


def suggested_stylists(user, limit=SUGGESTED_STYLISTS, today=None):
    """
    [(profile, reason)]: stylists she hasn't found yet whose work matches her taste.
    Those she's booked are in her bookings already, so never here; those whose work she's
    only liked or visited take at most KNOWN_SLOTS places. The rest are ranked on what
    people with her taste go back to, the styles she likes, how near and how well
    reviewed they are, with a little shuffle that changes daily so the row doesn't sit
    still.
    """
    if user is None or not is_on(SWITCH, user):
        return []
    from apps.bookings.models import Booking
    from apps.common.blocks import blocked_account_ids
    from apps.looks.models import NotForMe, Style
    from apps.looks.views import public_looks
    from apps.stylists.models import StylistProfile

    viewer = viewer_for(user)
    affinity = viewer.affinity
    booked = Booking.objects.filter(client=user).exclude(status__in=NOT_BOOKED).values_list("stylist_id", flat=True)
    hidden = {str(pk) for pk in blocked_account_ids(user)} | {str(pk) for pk in booked} | {
        str(pk) for pk in NotForMe.objects.filter(user=user).exclude(stylist=None).values_list("stylist_id", flat=True)
    }
    profiles = [
        p
        for p in StylistProfile.objects.filter(published=True).exclude(account=user)
        if str(p.account_id) not in hidden
    ]
    if not profiles:
        return []
    accounts = {str(p.account_id) for p in profiles}

    def credited(author, stylist):
        """Whose work a look is: the stylist who did it, else whoever posted it."""
        return str(stylist) if stylist and str(stylist) in accounts else str(author)

    live = public_looks().filter(status="live", visibility="public")
    work = defaultdict(Counter)
    for author, stylist, slug in live.filter(Q(author_id__in=accounts) | Q(stylist_id__in=accounts)).values_list(
        "author_id", "stylist_id", "styles__slug"
    ):
        if slug:
            work[credited(author, stylist)][slug] += 1

    # People who engaged with what she did also engaged with this stylist's work.
    mine = sorted(affinity.looks, key=affinity.looks.get, reverse=True)[:CROWD_LOOKS]
    crowd = defaultdict(float)
    for look, author, stylist, closeness in LookNeighbour.objects.filter(
        look_id__in=mine, neighbour_id__in=live.values("pk")
    ).values_list("look_id", "neighbour__author_id", "neighbour__stylist_id", "score"):
        crowd[credited(author, stylist)] += affinity.looks[look] * closeness
    top = max((crowd[a] for a in accounts), default=0)
    names = dict(Style.objects.values_list("slug", "name"))
    day = (today or timezone.localdate()).isoformat()

    scored = []
    for p in profiles:
        key = str(p.account_id)
        styles = work.get(key, Counter())
        total = sum(styles.values())
        match = sum(affinity.styles.get(s, 0) * n for s, n in styles.items()) / total if total else 0
        shared = crowd.get(key, 0) / top if top else 0
        known = affinity.people.get(key, 0)
        near = 1.0 if viewer.area and p.base_area.lower() == viewer.area.lower() else 0.0
        # A smoothed rating: five reviews' worth of 4.5 stars to start from.
        rating = ((float(p.rating_average or 0) * p.rating_count) + 4.5 * 5) / (p.rating_count + 5) / 5
        quality = 0.5 + 0.2 * min(p.verification_tier, 2) / 2 + 0.3 * rating
        pull = {"crowd": 1.5 * shared, "style": 1.5 * match, "known": 0.3 * known, "near": 0.5 * near}
        value = (1 + sum(pull.values())) * quality * (1 + 0.1 * math.log1p(total))
        if p.featured:
            # Set up by Yasante and not taking bookings yet: shown, after those who are.
            value *= 0.5
        # The same for her all day, different tomorrow.
        value *= random.Random(f"{user.pk}:{day}:{key}").uniform(1 - SHUFFLE, 1 + SHUFFLE)

        # Short enough for two lines on her card.
        strongest = max(pull, key=pull.get)
        favourite = max(styles, key=lambda s: affinity.styles.get(s, 0) * styles[s], default=None)
        if not pull[strongest]:
            reason = "Well reviewed" if p.rating_count else "New on Yasante"
        elif strongest == "crowd":
            reason = "Loved by people with your taste"
        elif strongest == "style":
            reason = f"Does {names.get(favourite, favourite)}"
        elif strongest == "known":
            reason = "You’ve liked their work"
        else:
            reason = "Near you"
        scored.append((value, p, reason, bool(known)))
    scored.sort(key=lambda row: -row[0])

    out, known_left = [], KNOWN_SLOTS
    for _, p, reason, known in scored:
        if known:
            if not known_left:
                continue
            known_left -= 1
        out.append((p, reason))
        if len(out) == limit:
            break
    return out


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
                "similar": "Popular with people who liked this look",
                "style": f"More {style_name}" if style_name else "In the same style",
                "people": f"More from {person}" if person else "More from the same person",
                "hair": "On the same hair texture",
                "evergreen": "Loved on Yasante",
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
