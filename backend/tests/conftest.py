"""
Shared fixtures. Each test gets a fresh database and talks to the API the way the
app does: JSON in camelCase, a bearer token per account.
"""

import itertools
from datetime import timedelta

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from .schema_check import check_response

_seq = itertools.count(1)


@pytest.fixture(autouse=True)
def _no_open_beauty_facts(monkeypatch):
    # Tests never reach the internet: Open Beauty Facts knows nothing unless a test says so.
    monkeypatch.setattr("apps.shelf.openbeauty._get", lambda *args, **kwargs: None)


@pytest.fixture(autouse=True)
def _clean_cache():
    # Rate-limit counters and idempotency keys live in the cache.
    cache.clear()
    yield
    cache.clear()


class Api:
    """A client acting as one account (or none)."""

    def __init__(self, user=None):
        self.client = APIClient()
        self.user = user
        if user is not None:
            self.client.force_authenticate(user)

    def _call(self, method, url, body=None, **kw):
        response = getattr(self.client, method)(url, body, format="json", **kw)
        check_response(method, url, response)
        return response

    def get(self, url, **params):
        response = self.client.get(url, params)
        check_response("get", url, response)
        return response

    def post(self, url, body=None):
        return self._call("post", url, body)

    def patch(self, url, body=None):
        return self._call("patch", url, body)

    def delete(self, url):
        return self.client.delete(url)


@pytest.fixture
def api():
    return Api


@pytest.fixture
def make_user(db):
    from apps.accounts.models import User
    from apps.profiles.models import HairProfile

    def make(name=None, verified=True, roles=("client",), texture=None, **extra):
        n = next(_seq)
        user = User.objects.create_user(
            email=f"user{n}@test.dev",
            name=name or f"Person {n}",
            password="password123",
            phone=f"+44770090{n:04d}" if verified else "",
            phone_verified=verified,
            roles=list(roles),
            **extra,
        )
        if texture:
            HairProfile.objects.create(user=user, texture=texture, length="shoulder")
        return user

    return make


WEEK_9_TO_6 = {
    "week": [None] + [{"start": "09:00", "end": "18:00"}] * 6,
    "blocked": [],
}


@pytest.fixture
def make_stylist(make_user):
    from apps.stylists.models import MenuItem, StylistProfile

    def make(published=True, availability=WEEK_9_TO_6, deposit="none", **extra):
        user = make_user(roles=("client", "stylist"))
        n = next(_seq)
        profile = StylistProfile.objects.create(
            account=user,
            display_name=f"Braids by {n}",
            handle=f"braids{n}",
            service_models=["home"],
            base_area="Peckham",
            address="12 Bellenden Road, Peckham",
            notice_hours=48,
            deposit_type=deposit,
            deposit_amount=20 if deposit != "none" else None,
            availability=availability or {},
            published=published,
            **extra,
        )
        MenuItem.objects.create(
            stylist=profile,
            name="Knotless braids",
            price=120,
            from_price=True,
            duration_minutes=300,
        )
        MenuItem.objects.create(
            stylist=profile,
            name="Cornrows",
            price=45,
            from_price=True,
            duration_minutes=120,
            options=[
                {"id": "big", "group": "size", "label": "Big", "add": 0},
                {"id": "small", "group": "size", "label": "Small", "add": 30, "addMinutes": 60},
            ],
        )
        return profile

    return make


@pytest.fixture
def styles(db):
    from apps.looks.models import Style

    names = [
        ("knotless", "Knotless braids"),
        ("box-braids", "Box braids"),
        ("cornrows", "Cornrows"),
        ("twists", "Twists"),
        ("silk-press", "Silk press"),
    ]
    return {slug: Style.objects.create(slug=slug, name=name, sort_order=i) for i, (slug, name) in enumerate(names)}


@pytest.fixture
def make_look(styles):
    import itertools
    from datetime import timedelta

    from apps.looks.models import Look
    from django.utils import timezone

    # Each look a second after the last: created in the same instant, feed order
    # would fall back to random ids and tests that expect newest-first would flake.
    start, ticks = timezone.now() - timedelta(days=1), itertools.count()

    def make(author, style="knotless", visibility="public", stylist=None, **extra):
        look = Look.objects.create(
            author=author,
            photo_uri="https://example.com/photo.jpg",
            visibility=visibility,
            stylist_id=str(stylist.account_id) if stylist else "",
            stylist_name=stylist.display_name if stylist else "",
            area=stylist.base_area if stylist else "",
            **extra,
        )
        Look.objects.filter(pk=look.pk).update(created_at=start + timedelta(seconds=next(ticks)))
        look.refresh_from_db()
        look.styles.add(styles[style])
        return look

    return make


def free_slot(api_as, profile, service, days_ahead=2, options=None):
    """The first free start time the server offers for a service, with its options
    (a longer option can need a slot the plain service wouldn't)."""
    params = {"service": str(service.pk)}
    if options:
        params["options"] = ",".join(options.values())
    slots = api_as.get(f"/api/stylists/by-handle/{profile.handle}/slots/", **params).json()
    for day in slots["days"]:
        if day["times"]:
            return day["times"][0]
    raise AssertionError("no free slot")


@pytest.fixture
def slot():
    return free_slot


@pytest.fixture
def book(api, slot):
    """A client's request with a stylist, through the real endpoint."""

    def make(client_user, profile, service=None, options=None, time=None):
        service = service or profile.menu_items.get(name="Knotless braids")
        as_client = api(client_user)
        body = {
            "stylistId": str(profile.account_id),
            "serviceId": str(service.pk),
            "options": options or {},
            "bringingOwnHair": False,
            "requestedTimes": [time or slot(as_client, profile, service, options=options)],
            "policyVersion": "2026-09",
        }
        response = as_client.post("/api/bookings/", body)
        assert response.status_code == 201, response.json()
        return response.json()

    return make


def days(n):
    return timezone.now() + timedelta(days=n)
