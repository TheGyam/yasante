"""
Push notifications to many people: who they reach, and sending them.

Two kinds, because the rules differ. An important update (an outage, a change to the
terms) goes to everyone it matches, under the "account" category nobody can switch off.
News and offers are promotion: they only reach people who switched "News and offers"
on (App Store guideline 4.5.4), and at most one goes out a day.
"""

from datetime import timedelta

from celery import shared_task
from django.contrib.auth import get_user_model
from django.core.exceptions import BadRequest
from django.db.models import Exists, OuterRef, Q
from django.utils import timezone

CATEGORY = {"update": "account", "news": "news"}
WHO = {"everyone": "Everyone", "clients": "Clients", "stylists": "Stylists", "people": "Chosen people"}
JOINED = {"any": None, "7": 7, "30": 30, "90": 90}
NEWS_GAP = timedelta(hours=20)
MAX_PEOPLE = 500


def clean(spec):
    """The audience as sent by the workspace, checked; unknown values are refused."""
    who = spec.get("who", "everyone")
    platform = spec.get("platform", "any")
    joined = str(spec.get("joined", "any"))
    area = str(spec.get("area", "")).strip()[:80]
    people = [str(person) for person in spec.get("people", [])][:MAX_PEOPLE]
    if who not in WHO or platform not in ("any", "ios", "android") or joined not in JOINED:
        raise BadRequest("That audience isn't one we recognise.")
    if who == "people" and not people:
        raise BadRequest("Choose at least one person.")
    return {"who": who, "platform": platform, "joined": joined, "area": area, "people": people}


def summary(spec):
    parts = [WHO[spec["who"]] if spec["who"] != "people" else f"{len(spec['people'])} chosen people"]
    if spec["area"]:
        parts.append(f"in {spec['area']}")
    if spec["platform"] != "any":
        parts.append("on iPhone" if spec["platform"] == "ios" else "on Android")
    if JOINED[spec["joined"]]:
        parts.append(f"who joined in the last {spec['joined']} days")
    return " ".join(parts)


def matched(spec):
    """Everyone the audience describes, whether or not a message can reach them."""
    from apps.accounts.models import DeviceToken

    people = get_user_model().objects.filter(is_active=True)
    if spec["who"] == "clients":
        people = people.filter(roles__contains=["client"])
    elif spec["who"] == "stylists":
        people = people.filter(roles__contains=["stylist"])
    elif spec["who"] == "people":
        people = people.filter(pk__in=spec["people"])
    if spec["area"]:
        people = people.filter(Q(hair_profile__area__icontains=spec["area"]) | Q(stylist_profile__base_area__icontains=spec["area"]))
    if JOINED[spec["joined"]]:
        people = people.filter(created_at__gte=timezone.now() - timedelta(days=JOINED[spec["joined"]]))
    devices = DeviceToken.objects.filter(user=OuterRef("pk"))
    if spec["platform"] != "any":
        devices = devices.filter(platform=spec["platform"])
    return people.annotate(has_device=Exists(devices)).distinct()


def reachable(spec, kind):
    """Those a message will actually reach: a phone to send to, and (for news) a yes."""
    from apps.common.models import NotificationPreference

    people = matched(spec).filter(has_device=True)
    if kind == "news":
        yes = NotificationPreference.objects.filter(user=OuterRef("pk"), opted_in__contains=["news"])
        people = people.filter(Exists(yes))
    return people


def reach(spec, kind):
    everyone = matched(spec)
    total = everyone.count()
    with_phone = everyone.filter(has_device=True).count()
    reached = reachable(spec, kind).count()
    return {"matched": total, "noDevice": total - with_phone, "notOptedIn": with_phone - reached, "reachable": reached}


def news_too_soon():
    from .models import Broadcast

    last = Broadcast.objects.filter(kind="news", recipients__gt=0).order_by("-created_at").first()
    return last and last.created_at > timezone.now() - NEWS_GAP


@shared_task(ignore_result=True)
def send_broadcast(broadcast_id):
    """
    One notification per person through notify(), so muting, delivery and the
    never-twice guarantee work exactly as for every other notification.
    """
    from apps.common.notifications import notify

    from .models import Broadcast

    broadcast = Broadcast.objects.get(pk=broadcast_id)
    data = {"url": broadcast.url} if broadcast.url else {}
    # ponytail: one push request per person; batch through Expo's 100-a-request API if audiences reach tens of thousands.
    for user_id in reachable(broadcast.audience, broadcast.kind).values_list("pk", flat=True).iterator(chunk_size=500):
        notify(user_id, CATEGORY[broadcast.kind], f"{broadcast.event_prefix}{user_id}", broadcast.title, broadcast.body, **data)
    Broadcast.objects.filter(pk=broadcast.pk).update(finished_at=timezone.now())
