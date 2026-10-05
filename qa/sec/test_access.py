"""
Who can touch whose things: every /api/ route that takes an ID, tried as someone who
should not reach it.

Efua (a client) and Ama (her stylist) own everything here. Naomi (another client),
Tobi (another stylist) and a signed-out visitor try every route against their things.
Each attempt must be refused, and nothing anyone owns may change; a delete that
answers 204 but removes nothing is fine.

`test_every_route_is_classified` fails when upstream adds a route with an ID that this
file doesn't place, so a new endpoint can't slip past unchecked.
"""

import json
from datetime import timedelta

import pytest
from django.urls import get_resolver
from django.urls.resolvers import URLResolver
from django.utils import timezone
from rest_framework.test import APIClient

REFUSED = {401, 403, 404, 405}

# Routes that take an ID and belong to one person. (route pattern, method, body)
OWNED = [
    ("api/users/<uuid:pk>/", "get", None),
    ("api/users/<uuid:pk>/", "patch", {"name": "Owned"}),
    ("api/users/<uuid:pk>/", "delete", None),
    ("api/users/<uuid:pk>/hair-profile/", "patch", {"texture": "1a"}),
    ("api/users/<uuid:pk>/export/", "post", {}),
    ("api/stylists/me/menu/<uuid:pk>/", "patch", {"name": "Owned", "price": 1}),
    ("api/stylists/me/menu/<uuid:pk>/", "delete", None),
    ("api/stylists/me/portfolio/<uuid:pk>/", "delete", None),
    ("api/bookings/<uuid:pk>/", "get", None),
    ("api/bookings/<uuid:pk>/accept/", "post", {}),
    ("api/bookings/<uuid:pk>/decline/", "post", {"reason": "Owned"}),
    ("api/bookings/<uuid:pk>/deposit-received/", "post", {}),
    ("api/bookings/<uuid:pk>/cancel/", "post", {"reason": "Owned"}),
    ("api/bookings/<uuid:pk>/close/", "post", {"outcome": "attended"}),
    ("api/bookings/<uuid:pk>/propose/", "post", {"times": []}),
    ("api/bookings/<uuid:pk>/proposal/", "post", {"accept": True}),
    ("api/bookings/<uuid:pk>/attending/", "post", {"attending": True}),
    ("api/bookings/<uuid:pk>/move/", "post", {"times": []}),
    ("api/bookings/<uuid:pk>/move/answer/", "post", {"accept": True}),
    ("api/bookings/<uuid:pk>/started-on-time/", "post", {"onTime": True}),
    ("api/bookings/<uuid:pk>/contest/", "post", {}),
    ("api/bookings/<uuid:pk>/review/", "post", {"rating": 1, "body": "Owned"}),
    ("api/bookings/<uuid:pk>/check-in/", "post", {}),
    ("api/slot-interests/<uuid:pk>/", "delete", None),
    ("api/looks/<uuid:pk>/", "get", None),  # Efua's private look
    ("api/looks/<uuid:pk>/", "delete", None),
    ("api/looks/<uuid:look_id>/comments/", "get", None),  # on the private look
    ("api/looks/<uuid:look_id>/comments/", "post", {"body": "Owned"}),
    ("api/comments/<uuid:pk>/", "delete", None),
    ("api/blocks/<uuid:pk>/", "delete", None),
    ("api/collections/<uuid:pk>/", "get", None),
    ("api/collections/<uuid:pk>/", "patch", {"name": "Owned"}),
    ("api/collections/<uuid:pk>/", "delete", None),
    ("api/collections/<uuid:pk>/items/", "get", None),
    ("api/collections/<uuid:pk>/items/", "post", {"kind": "look", "refId": None}),
    ("api/collections/<uuid:pk>/items/<uuid:item_id>/", "delete", None),
    ("api/care-plans/<uuid:pk>/", "get", None),
    ("api/care-plans/<uuid:pk>/", "patch", {"name": "Owned"}),
    ("api/care-plans/<uuid:pk>/", "delete", None),
    ("api/care-plans/<uuid:pk>/sessions/", "post", {}),
    ("api/shelf/<uuid:pk>/", "patch", {"rating": 1}),
    ("api/shelf/<uuid:pk>/", "delete", None),
    ("api/moderation/<uuid:pk>/appeal/", "post", {"body": "Owned"}),
    ("api/media/<uuid:pk>/", "get", None),
    ("api/devices/<uuid:pk>/", "delete", None),
]

# Anyone signed in may do these to someone else's thing (report it, like it, read the
# comments on a public look). Signed out, they must be refused.
ANY_SIGNED_IN = {
    "api/stylists/<uuid:pk>/report/",
    "api/reviews/<uuid:pk>/report/",
    "api/looks/<uuid:pk>/like/",
    "api/looks/<uuid:pk>/report/",
    "api/comments/<uuid:pk>/replies/",
    "api/comments/<uuid:pk>/like/",
    "api/comments/<uuid:pk>/report/",
}

# Public on purpose: the ID is a public handle or slug, or a secret the owner shares
# (invite code, calendar token).
PUBLIC = {
    "api/invites/<str:code>/",
    "api/invites/<str:code>/redeem/",
    "api/stylists/by-handle/<str:handle>/",
    "api/stylists/by-handle/<str:handle>/slots/",
    "api/bookings/calendar/<str:token>.ics",
    "api/products/barcode/<str:code>/",
    "api/policies/<str:type>/",
    "api/content/content/<uuid:pk>/",
    "api/content/content/<uuid:pk>/products/",
}


def _routes():
    def walk(patterns, prefix=""):
        for p in patterns:
            if isinstance(p, URLResolver):
                yield from walk(p.url_patterns, prefix + str(p.pattern))
            else:
                yield prefix + str(p.pattern)

    return {r for r in walk(get_resolver().url_patterns) if r.startswith("api/") and "<" in r}


def test_every_route_is_classified():
    placed = {route for route, _, _ in OWNED} | ANY_SIGNED_IN | PUBLIC
    assert sorted(_routes() - placed) == [], "new /api/ routes with an ID: add them to test_access.py"
    assert sorted(placed - _routes()) == [], "routes listed here no longer exist"


@pytest.fixture
def world(make_user, make_stylist, make_look, book, settings):
    from django.contrib.contenttypes.models import ContentType

    from apps.accounts.models import DeviceToken
    from apps.bookings.models import Booking, SlotInterest
    from apps.common.models import Media
    from apps.looks.models import Block, LookComment, ModerationAction
    from apps.planner.models import CarePlan, Collection, CollectionItem
    from apps.profiles.models import HairProfile
    from apps.shelf.models import Product, ShelfItem
    from apps.stylists.models import PortfolioPhoto

    settings.PRIVATE_MEDIA_ACCEL = True  # nginx would send the file; there is none here
    efua = make_user(name="Efua Owner")
    HairProfile.objects.create(user=efua, texture="4c", length="shoulder")
    ama = make_stylist()
    naomi = make_user(name="Naomi Other")
    tobi = make_stylist()

    bk = Booking.objects.get(pk=book(efua, ama)["id"])
    booking_fields = dict(scheduled_for=timezone.now() + timedelta(days=3), status="confirmed")
    Booking.objects.filter(pk=bk.pk).update(**booking_fields)
    public_look = make_look(efua, stylist=ama)
    private_look = make_look(efua, visibility="private")
    comment = LookComment.objects.create(look=public_look, author=efua, body="Mine")
    type(public_look).objects.filter(pk=public_look.pk).update(comment_count=1)  # as the API would
    collection = Collection.objects.create(user=efua, name="Mine", is_private=True)
    item = CollectionItem.objects.create(collection=collection, kind="look", ref_id=str(public_look.pk))
    product = Product.objects.create(brand="B", name="P", category="oil")
    action = ModerationAction.objects.create(
        action="hide", reason="test", content_type=ContentType.objects.get_for_model(public_look),
        object_id=str(public_look.pk), author=efua,
    )
    return {
        "efua": efua,
        "ama": ama.account,
        "attackers": {"naomi (other client)": naomi, "tobi (other stylist)": tobi.account, "signed out": None},
        "ids": {
            "api/users/": efua.pk,
            "api/stylists/me/menu/": ama.menu_items.first().pk,
            "api/stylists/me/portfolio/": PortfolioPhoto.objects.create(stylist=ama, uri="https://e.x/p.jpg").pk,
            "api/bookings/": bk.pk,
            "api/slot-interests/": SlotInterest.objects.create(
                client=efua, stylist=ama.account, stylist_name="Ama", from_date=timezone.now().date(),
                to_date=timezone.now().date() + timedelta(days=7),
            ).pk,
            "api/looks/<uuid:pk>/:get": private_look.pk,
            "api/looks/<uuid:pk>/": public_look.pk,
            "api/looks/<uuid:look_id>/": private_look.pk,
            "api/comments/": comment.pk,
            "api/blocks/": Block.objects.create(blocker=efua, blocked=make_user()).pk,
            "api/collections/": collection.pk,
            "item_id": item.pk,
            "api/care-plans/": CarePlan.objects.create(user=efua, name="Wash day").pk,
            "api/shelf/": ShelfItem.objects.create(user=efua, product=product).pk,
            "api/moderation/": action.pk,
            "api/media/": Media.objects.create(owner=efua, visibility="private", full_path="private/x.jpg").pk,
            "api/devices/": DeviceToken.objects.create(user=efua, token="ExponentPushToken[sec]", platform="android").pk,
        },
        "public_look": public_look,
    }


def _url(route, method, ids):
    key = f"{route}:{method}"
    for prefix, pk in ids.items():
        if key.startswith(prefix) or (":" not in prefix and route.startswith(prefix)):
            url = route.replace("<uuid:pk>", str(pk)).replace("<uuid:look_id>", str(pk))
            return "/" + url.replace("<uuid:item_id>", str(ids["item_id"]))
    raise KeyError(route)


def _snapshot():
    """Every row of every table that holds someone's things, as JSON."""
    from django.apps import apps

    skip = {"session", "logentry", "notificationlog", "searchlog", "clienterror", "outstandingtoken"}
    rows = {}
    for model in apps.get_models():
        if model._meta.app_label in {"contenttypes", "auth", "admin", "sessions"}:
            continue
        if model._meta.model_name in skip:
            continue
        rows[model._meta.label] = list(model.objects.order_by("pk").values())
    return json.loads(json.dumps(rows, default=str))


def _diff(before, after):
    out = []
    for label in before:
        if before[label] != after[label]:
            b = {r["id"]: r for r in before[label] if "id" in r}
            a = {r["id"]: r for r in after[label] if "id" in r}
            gone, new = b.keys() - a.keys(), a.keys() - b.keys()
            changed = [k for k in b.keys() & a.keys() if b[k] != a[k]]
            out.append(f"{label}: removed {len(gone)}, added {len(new)}, changed {len(changed)}")
    return out


def test_nobody_reaches_anyone_elses_things(world):
    failures = []
    for who, user in world["attackers"].items():
        client = APIClient()
        if user is not None:
            client.force_authenticate(user)
        for route, method, body in OWNED:
            url = _url(route, method, world["ids"])
            before = _snapshot()
            try:
                r = getattr(client, method)(url, body, format="json") if body is not None else getattr(client, method)(url)
            except Exception as e:  # a crash is a finding too, and must not hide the rest
                failures.append(f"{who}: {method.upper()} {url} -> crashed: {e!r:.160}")
                continue
            changes = _diff(before, _snapshot())
            # 2xx on a delete is fine when nothing was deleted; anything else must be refused.
            ok = r.status_code in REFUSED or (method == "delete" and r.status_code == 204)
            if changes or not ok:
                failures.append(f"{who}: {method.upper()} {url} -> {r.status_code} {changes or ''} {r.content[:160]!r}")
    assert failures == [], "\n" + "\n".join(failures)


def test_owners_still_reach_their_things(world):
    """Guards the test itself: each row is a real method on a real ID, so a refusal above
    means something. Owners get neither 404 nor 405; each call is rolled back."""
    from django.db import transaction

    wrong = []
    for route, method, body in OWNED:
        url = _url(route, method, world["ids"])
        # A fresh copy each time: deleting the account clears the pk on the instance used.
        user = world["ama" if "/stylists/me/" in route else "efua"]
        owner = APIClient()
        owner.force_authenticate(type(user).objects.get(pk=user.pk))
        with transaction.atomic():
            r = getattr(owner, method)(url, body, format="json") if body is not None else getattr(owner, method)(url)
            transaction.set_rollback(True)
        if r.status_code in {404, 405}:
            wrong.append(f"{method.upper()} {url} -> {r.status_code}")
    assert wrong == [], "\n" + "\n".join(wrong)


def test_signed_out_visitors_cannot_report_like_or_reply(world):
    ids = {"<uuid:pk>": world["public_look"].pk}
    for route in ANY_SIGNED_IN:
        url = "/" + route.replace("<uuid:pk>", str(ids["<uuid:pk>"]))
        r = APIClient().post(url, {"reason": "other"}, format="json")
        assert r.status_code in {401, 403, 404, 405}, f"{url} -> {r.status_code}"


def test_private_look_never_reaches_the_public_site(world, client):
    private = world["ids"]["api/looks/<uuid:pk>/:get"]
    assert client.get(f"/looks/{private}").status_code == 404
    assert str(private) not in client.get("/sitemap.xml").content.decode()
