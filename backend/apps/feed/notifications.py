"""
Notifications that bring people back (docs/FEED_PLAN.md, section 13), each in a
category she can switch off, and never the same one twice.
"""

from collections import Counter
from datetime import timedelta

from django.db.models import F
from django.utils import timezone

from apps.common.notifications import notify
from apps.features.switches import is_on

from .affinity import affinity_for
from .models import SWITCH
from .stats import _saved_looks

# A weekly pick needs this many new looks to be worth a notification.
PICKED_AT_LEAST = 3


def _count(n, word):
    return f"{n} {word}{'' if n == 1 else 's'}"


def look_activity_digest(now=None):
    """Once a day: how each person's looks did. Counts only, never who."""
    from apps.looks.models import Look, LookLike

    now = now or timezone.now()
    since = now - timedelta(days=1)
    likes = Counter(
        LookLike.objects.filter(created_at__gte=since).exclude(user=F("look__author")).values_list("look__author_id", flat=True)
    )
    saved = list(_saved_looks(created_at__gte=since))
    authors = dict(Look.objects.filter(pk__in={look for _, look in saved}).values_list("pk", "author_id"))
    saves = Counter(authors[look] for person, look in saved if look in authors and authors[look] != person)
    sent = 0
    for author in set(likes) | set(saves):
        parts = [_count(saves[author], "save") if saves[author] else "", _count(likes[author], "like") if likes[author] else ""]
        text = " and ".join(p for p in parts if p)
        if notify(author, "activity", f"activity:{author}:{now.date()}", "Your looks today", f"Your looks got {text} today.", url="/looks/mine"):
            sent += 1
    return sent


def picked_for_you(now=None):
    """Once a week, for people who asked: new looks in the styles they love most."""
    from apps.accounts.models import User
    from apps.looks.models import Look, Style
    from apps.looks.views import everyday_looks, public_looks

    now = now or timezone.now()
    names = dict(Style.objects.values_list("slug", "name"))
    week = now.isocalendar()
    sent = 0
    for user in User.objects.filter(notification_preference__opted_in__contains=["for_you"]):
        if not is_on(SWITCH, user):
            continue
        styles = affinity_for(user).styles
        top = sorted(styles, key=styles.get, reverse=True)[:3]
        if not top:
            continue
        new = (
            everyday_looks(user, queryset=public_looks())
            .exclude(author=user)
            .filter(created_at__gte=now - timedelta(days=7), pk__in=Look.objects.filter(styles__slug__in=top).values("pk"))
            .count()
        )
        if new < PICKED_AT_LEAST:
            continue
        first = names.get(top[0], top[0])
        where = f"{first}, a style you love" if len(top) == 1 else f"{first} and {_count(len(top) - 1, 'more style')} you love"
        if notify(user.pk, "for_you", f"for_you:{user.pk}:{week[0]}-{week[1]}", "Picked for you", f"{new} new looks this week in {where}.", url="/"):
            sent += 1
    return sent
