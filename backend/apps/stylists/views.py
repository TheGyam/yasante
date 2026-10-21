"""
Stylist views: her page, menu, portfolio, free times, numbers and summary.
"""

import logging
import uuid
from datetime import date, datetime, time, timedelta

from apps.accounts.serializers import UserResponseSerializer, UserSerializer
from apps.bookings.models import Booking, Review
from apps.common import zones
from apps.common.identifiers import POLICY, UNAVAILABLE, identifier_problem, normalise
from apps.common.blocks import blocked_account_ids, is_blocked
from apps.common.models import log_search
from apps.common.uploads import media_url, own_media
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle

from . import featured
from .featured import open_if_ready, not_booking_message
from .models import (
    FeaturedPage,
    PageWaitlist,
    held_checks,
    record_check,
    MenuItem,
    PageView,
    PaymentMethod,
    PortfolioPhoto,
    StylistProfile,
)
from .numbers import numbers_for, timing_label_for
from .pricing import clean_options
from .serializers import (
    ClaimPreviewSerializer,
    FinishPriceSerializer,
    FinishSerializer,
    PageWaitlistSerializer,
    ClosedDayRequestSerializer,
    TimeBlockSkipRequestSerializer,
    TimeBlockRequestSerializer,
    TimeBlockSerializer,
    FreeSlotsSerializer,
    HandleCheckResponseSerializer,
    MenuImportRequestSerializer,
    MenuItemDraftSerializer,
    MenuItemSerializer,
    NumbersSerializer,
    PortfolioAddRequestSerializer,
    PortfolioPatchRequestSerializer,
    PortfolioPhotoSerializer,
    StylistPageResponseSerializer,
    StylistProfileDraftSerializer,
    StylistProfileSerializer,
    StylistSearchResultSerializer,
    StylistSummarySerializer,
)
from .slots import DEFAULT_HOURS, free_times, job_minutes, last_day, today_for
from .style_match import style_for_service

logger = logging.getLogger(__name__)

NO_PROFILE = {"message": "No stylist profile yet"}


def _my_profile(request):
    return StylistProfile.objects.filter(account=request.user).first()


def _is_uuid(value):
    try:
        uuid.UUID(str(value))
        return True
    except (TypeError, ValueError):
        return False


def _payment_methods(raw):
    """Only complete ones, and few enough to pick from at a glance. None = invalid."""
    if not isinstance(raw, list):
        return None
    kept = [
        {
            "label": str(m.get("label") or "").strip()[:40],
            "details": str(m.get("details") or "").strip()[:200],
        }
        for m in raw
        if isinstance(m, dict)
    ]
    kept = [m for m in kept if m["label"] and m["details"]]
    return kept


def _dates(value):
    if not isinstance(value, list):
        return None
    try:
        return sorted({date.fromisoformat(str(d)).isoformat() for d in value})
    except ValueError:
        return None


def _valid_availability(value):
    if not isinstance(value, dict):
        return False
    week = value.get("week")
    if not isinstance(week, list) or len(week) != 7:
        return False
    for day in week:
        if day is None:
            continue
        if not isinstance(day, dict) or not day.get("start") or not day.get("end"):
            return False
    lead = value.get("lead_hours")
    # One of the usual choices, or her own number of hours.
    if lead is not None and not (type(lead) is int and 1 <= lead <= settings.BOOKING_NOTICE_MAX_HOURS):
        return False
    if value.get("ahead_days") not in (None, *settings.BOOKING_AHEAD_CHOICES):
        return False
    if value.get("gap_minutes") not in (None, *settings.BOOKING_GAP_CHOICES):
        return False
    return all(_dates(value.get(key, [])) is not None for key in ("blocked", "closed"))


def _merged_availability(profile, value):
    """
    What she sent, over what's saved: a screen that doesn't know a setting (an older
    app) leaves it as it was. Days gone by drop off her lists.
    """
    merged = {**(profile.availability or {}), **value}
    today = today_for(profile).isoformat()
    for key in ("blocked", "closed"):
        merged[key] = [d for d in _dates(merged.get(key, [])) or [] if d >= today]
    return merged


def _taken(handle, user):
    """Someone else's username or handle (one namespace), or a name still held."""
    from apps.accounts.usernames import name_in_use

    return name_in_use(handle, user if user.is_authenticated else None)


@extend_schema_view(get=extend_schema(responses=HandleCheckResponseSerializer))
class HandleCheckView(APIView):
    """GET /api/stylists/handle-available/?handle="""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        handle = normalise(request.query_params.get("handle", ""))
        if not handle:
            return Response({"message": "Enter a handle to check."}, status=400)

        current = None
        if request.user.is_authenticated:
            current = StylistProfile.objects.filter(account=request.user).values_list("handle", flat=True).first()
        if identifier_problem(handle, max_length=POLICY["handle_max"], current=current):
            return Response({"handle": handle, "available": False, "suggestions": []})

        # Her own handle isn't "taken": editing her page checks the one she already has.
        def taken(h):
            return identifier_problem(h, max_length=POLICY["handle_max"], current=current) or (
                h != current and _taken(h, request.user)
            )

        if not taken(handle):
            return Response({"handle": handle, "available": True})
        suggestions = [
            s for s in (f"{handle}hair", f"{handle}.london", f"{handle}studio") if not taken(s)
        ]
        return Response({"handle": handle, "available": False, "suggestions": suggestions})


def _checks_on_setup(user, profile):
    """A phone staff have checked counts now; the proof photo waits for review."""
    if user.phone_verified:
        record_check(user.pk, "phone", evidence=user.phone or "")
    if profile.proof_photo_uri:
        record_check(user.pk, "proof_photo", "pending", profile.proof_photo_uri)


def _number(value, default):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _origin(params, viewer):
    """(latitude, longitude) to measure from: ?postcode=, or ?near=me and their hair profile."""
    from apps.common.geo import locate

    if params.get("postcode"):
        return locate(params["postcode"])
    if params.get("near") == "me" and viewer is not None:
        hair = getattr(viewer, "hair_profile", None)
        if hair is None:
            return None
        if hair.latitude is not None:
            return (hair.latitude, hair.longitude)
        return locate(hair.postcode) or locate(hair.area)
    return None


def _place(profile):
    """Put a stylist on the map: their address's postcode, or else their area."""
    from apps.common.geo import locate, postcode_in

    point = locate(postcode_in(profile.address)) or locate(profile.base_area)
    profile.latitude, profile.longitude = point or (None, None)
    StylistProfile.objects.filter(pk=profile.pk).update(latitude=profile.latitude, longitude=profile.longitude)


# How far clients will usually go for a style, in miles; they can widen it.
NEAR_MILES = 10


def _for_style(profiles, slug, name, viewer):
    """
    For a list of who does one style: each stylist's service for it and what it starts
    at, their rating and checks, and a photo of their work in it. Fetched for all of
    them at once.
    """
    from apps.looks.models import Look
    from apps.looks.views import public_looks

    ids = [p.pk for p in profiles]
    services = {}
    for item in MenuItem.objects.filter(stylist_id__in=ids).filter(
        Q(styles__contains=[slug]) | Q(name__icontains=name)
    ).order_by("price"):
        services.setdefault(item.stylist_id, item)
    photos = {}
    for look in public_looks().filter(
        stylist_id__in=[str(p.account_id) for p in profiles], styles__slug=slug, status="live",
        visibility="public",
    ).order_by("-like_count", "-created_at").only("stylist_id", "thumb_uri", "photo_uri", "id"):
        photos.setdefault(look.stylist_id, look)
    # No look posted in it: their portfolio — a photo tagged with this service first,
    # then their latest work of any kind.
    work = {}
    for photo in PortfolioPhoto.objects.filter(stylist_id__in=ids).order_by("-created_at").only(
        "stylist_id", "service_id", "thumb_uri", "uri"
    ):
        service = services.get(photo.stylist_id)
        tagged = service is not None and photo.service_id == service.pk
        if tagged and not work.get(photo.stylist_id, (None, False))[1]:
            work[photo.stylist_id] = (photo, True)
        work.setdefault(photo.stylist_id, (photo, False))
    out = {}
    for p in profiles:
        service, look = services.get(p.pk), photos.get(str(p.account_id))
        fallback, of_it = work.get(p.pk, (None, False))
        out[p.pk] = {
            "service_id": str(service.pk) if service else None,
            "from_price": float(service.price) if service else None,
            "rating": float(p.rating_average) if p.rating_average is not None else None,
            "rating_count": p.rating_count,
            "verification_tier": p.verification_tier,
            "photo_uri": (
                (look.thumb_uri or look.photo_uri)
                if look
                else (fallback.thumb_uri or fallback.uri) if fallback else None
            ),
            "look_id": str(look.pk) if look else None,
            # Whether the photo shows this style, or is just their work.
            "photo_of_style": bool(look) or of_it,
        }
    return out


@extend_schema_view(get=extend_schema(responses=StylistSearchResultSerializer(many=True)), post=extend_schema(request=StylistProfileDraftSerializer, responses={201: StylistProfileSerializer}))
class StylistCreateView(APIView):
    """
    GET /api/stylists/?q= — search live pages by name, handle or area.
    POST /api/stylists/ — her page, as a draft only she can see.
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        params = request.query_params
        words = (params.get("q") or "").split()[:6]
        style = params.get("style", "")
        service_model = params.get("service_model", "")
        area = params.get("area", "")
        try:
            min_tier = int(params.get("tier") or 0)
        except ValueError:
            min_tier = 0
        if not (words or style or service_model or area or min_tier):
            return Response([])
        qs = StylistProfile.objects.filter(published=True)
        if style:
            # Her work tagged with it, or a service on her menu named after it.
            from apps.looks.models import Look, Style
            from apps.looks.views import public_looks

            name = Style.objects.filter(slug=style).values_list("name", flat=True).first() or style
            tagged = public_looks().filter(styles__slug=style, status="live").values_list(
                "stylist_id", flat=True
            )
            qs = qs.filter(
                Q(account_id__in=[t for t in tagged if t])
                | Q(menu_items__name__icontains=name)
                | Q(menu_items__styles__contains=[style])
            ).distinct()
        if service_model in ("salon", "home", "mobile"):
            qs = qs.filter(service_models__contains=[service_model])
        if area:
            qs = qs.filter(base_area__iexact=area)
        if min_tier:
            qs = qs.filter(verification_tier__gte=min_tier)
        for word in words:
            qs = qs.filter(
                Q(display_name__icontains=word)
                | Q(handle__icontains=word)
                | Q(base_area__icontains=word)
            )
        viewer = request.user if request.user.is_authenticated else None
        blocked = blocked_account_ids(viewer) if viewer else set()
        if blocked:
            qs = qs.exclude(account_id__in=blocked)
        if viewer is not None and style:
            # Asking who does a style: not themselves.
            qs = qs.exclude(account=viewer)
        # Near someone: where they asked about, or where their hair profile says.
        origin = _origin(params, viewer)
        qs = list(qs.order_by("featured", "-verification_tier", "-rating_count", "display_name")[: 200 if origin else 20])
        away = {}
        if origin:
            from apps.common.geo import miles

            # Pages from before the map: placed now, a few at a time (each is cached).
            for p in [p for p in qs if p.latitude is None][:10]:
                _place(p)
            within = params.get("within", "")
            radius = None if within == "any" else _number(within, NEAR_MILES)
            kept = []
            for p in qs:
                if p.latitude is None:
                    continue
                gap = miles(origin, (p.latitude, p.longitude))
                # A stylist who travels reaches them if they're inside the stylist's radius.
                reach = max(radius or 0, p.travel_radius_miles or 0) if "mobile" in (p.service_models or []) else radius
                if radius is None or gap <= reach:
                    away[p.pk] = gap
                    kept.append(p)
            qs = kept
        extra = _for_style(qs, style, name, viewer) if style else {}
        for pk, gap in away.items():
            extra.setdefault(pk, {})["miles"] = round(gap, 1)
        if style or origin:
            # Their work in this style first, then the nearest, then checked and well rated.
            qs.sort(key=lambda p: (
                p.featured,
                not extra.get(p.pk, {}).get("photo_of_style"),
                round(away.get(p.pk, 0)),
                -p.verification_tier,
                -(p.rating_count or 0),
            ))
        qs = qs[:20]
        log_search(
            request,
            "stylists",
            params.get("q", ""),
            {"style": style, "service_model": service_model, "area": area, "tier": min_tier},
            len(qs),
        )
        return Response(
            [
                {
                    "account_id": str(p.account_id),
                    "handle": p.handle,
                    "display_name": p.display_name,
                    "avatar_uri": p.avatar_uri,
                    "base_area": p.base_area,
                    "currency": p.currency,
                    **extra.get(p.pk, {}),
                }
                for p in qs
            ]
        )

    def post(self, request):
        if StylistProfile.objects.filter(account=request.user).exists():
            return Response({"message": "You already have a stylist page"}, status=400)
        serializer = StylistProfileDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if _taken(data["handle"], request.user):
            return Response({"message": UNAVAILABLE}, status=409)
        proof = data.get("proof_photo_uri", "")
        if proof and own_media(request.user, proof, public=False) is None:
            return Response({"message": "Upload the photo first"}, status=400)
        policies = data.get("policies") or {}
        methods = _payment_methods(request.data.get("payment_methods") or []) or []
        availability = request.data.get("availability")
        if availability is not None and not _valid_availability(availability):
            return Response({"message": "Those working hours don’t look right"}, status=400)

        try:
            with transaction.atomic():
                profile = StylistProfile.objects.create(
                    account=request.user,
                    display_name=data["display_name"],
                    handle=data["handle"],
                    bio=data.get("bio", ""),
                    service_models=data["service_models"],
                    base_area=data["base_area"],
                    address=data.get("address", ""),
                    time_zone=data.get("time_zone", ""),
                    travel_radius_miles=data.get("travel_radius_miles"),
                    instagram_handle=data.get("instagram_handle", ""),
                    country=data.get("country", "GB"),
                    tiktok_handle=data.get("tiktok_handle", ""),
                    notice_hours=policies.get("notice_hours", 24),
                    deposit_type=policies.get("deposit_type", "none"),
                    deposit_amount=policies.get("deposit_amount"),
                    reschedule_free_once=policies.get("reschedule_free_once", True),
                    proof_photo_uri=data.get("proof_photo_uri", ""),
                    availability=availability or {},
                    published=False,
                    verification_tier=0,
                )
                for m in methods[:5]:
                    PaymentMethod.objects.create(stylist=profile, **m)
                _checks_on_setup(request.user, profile)
                if "stylist" not in (request.user.roles or []):
                    request.user.roles = list(request.user.roles or []) + ["stylist"]
                    request.user.save(update_fields=["roles"])
        except IntegrityError:
            return Response({"message": "That handle has just been taken"}, status=409)

        _place(profile)
        return Response(StylistProfileSerializer(profile).data, status=201)


@extend_schema_view(get=extend_schema(responses=StylistProfileSerializer), patch=extend_schema(request=StylistProfileDraftSerializer(partial=True), responses=StylistProfileSerializer))
class StylistMeView(APIView):
    """GET / PATCH /api/stylists/me/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = _my_profile(request)
        if profile is None:
            return Response(NO_PROFILE, status=404)
        return Response(StylistProfileSerializer(profile).data)

    def patch(self, request):
        profile = _my_profile(request)
        if profile is None:
            return Response(NO_PROFILE, status=404)
        data = request.data
        update_fields = []

        # A new photo is her own upload (see own_media); the proof photo is a private one.
        # The one already on her page comes back with every save, and stays.
        for field, public in (("avatar_uri", True), ("proof_photo_uri", False)):
            value = str(data.get(field) or "").strip()
            if value and value != getattr(profile, field) and own_media(request.user, value, public=public) is None:
                return Response({"message": "Upload the photo first"}, status=400)
        if "country" in data:
            from apps.common.countries import is_country

            if not is_country(str(data["country"] or "").upper()):
                return Response({"message": "Pick the country you work in"}, status=400)
            data = {**data, "country": str(data["country"]).upper()}
        for field in (
            "display_name",
            "bio",
            "avatar_uri",
            "base_area",
            "address",
            "instagram_handle",
            "tiktok_handle",
            "proof_photo_uri",
            "country",
        ):
            if field in data:
                setattr(profile, field, str(data[field] or "").strip())
                update_fields.append(field)
        if "time_zone" in data:
            from apps.common.zones import is_zone

            if is_zone(data["time_zone"]):
                profile.time_zone = data["time_zone"]
                update_fields.append("time_zone")
        if "proof_photo_uri" in data and profile.proof_photo_uri:
            # A new proof photo goes back into the queue.
            record_check(profile.account_id, "proof_photo", "pending", profile.proof_photo_uri)
        if "service_models" in data:
            models = [m for m in (data["service_models"] or []) if m in ("salon", "home", "mobile")]
            profile.service_models = models
            update_fields.append("service_models")
        if "travel_radius_miles" in data:
            profile.travel_radius_miles = data["travel_radius_miles"]
            update_fields.append("travel_radius_miles")
        if "availability" in data:
            if not _valid_availability(data["availability"]):
                return Response({"message": "Those working hours don’t look right"}, status=400)
            profile.availability = _merged_availability(profile, data["availability"])
            update_fields.append("availability")

        if "handle" in data:
            new_handle = normalise(data["handle"])
            if new_handle != profile.handle:
                problem = identifier_problem(new_handle, max_length=POLICY["handle_max"])
                if problem:
                    return Response({"message": problem}, status=400)
                if _taken(new_handle, request.user):
                    return Response({"message": UNAVAILABLE}, status=409)
                profile.handle = new_handle
                update_fields.append("handle")

        if isinstance(data.get("policies"), dict):
            policies = data["policies"]
            if "deposit_type" in policies and policies["deposit_type"] not in (
                "none",
                "fixed",
                "percent",
            ):
                return Response({"message": "Pick a deposit type"}, status=400)
            for key in ("notice_hours", "deposit_type", "deposit_amount", "reschedule_free_once"):
                if key in policies:
                    setattr(profile, key, policies[key])
                    update_fields.append(key)

        with transaction.atomic():
            if "payment_methods" in data:
                methods = _payment_methods(data["payment_methods"])
                if methods is None:
                    return Response({"message": "Send a list of payment methods"}, status=400)
                if len(methods) > 5:
                    return Response({"message": "Keep it to five ways to be paid"}, status=400)
                profile.payment_methods.all().delete()
                for m in methods:
                    PaymentMethod.objects.create(stylist=profile, **m)
            if update_fields:
                profile.save(update_fields=update_fields + ["updated_at"])
            open_if_ready(profile)
        if {"base_area", "address"} & set(update_fields):
            _place(profile)
        if "availability" in update_fields:
            # Booking further ahead opens days someone may be waiting for.
            from apps.bookings.held import open_new_days

            open_new_days([profile])

        profile.refresh_from_db()
        return Response(StylistProfileSerializer(profile).data)


@extend_schema_view(post=extend_schema(request=None, responses=StylistProfileSerializer))
class StylistPublishView(APIView):
    """POST /api/stylists/me/publish/ — puts her page live."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = _my_profile(request)
        if profile is None:
            return Response(NO_PROFILE, status=404)
        profile.published = True
        with transaction.atomic():
            profile.save(update_fields=["published", "updated_at"])
            open_if_ready(profile)
        return Response(StylistProfileSerializer(profile).data)




@extend_schema_view(get=extend_schema(responses=StylistPageResponseSerializer))
class StylistByHandleView(APIView):
    """GET /api/stylists/by-handle/:handle/ — her public page."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, handle):
        profile = (
            StylistProfile.objects.select_related("account")
            .filter(handle=handle.lower(), published=True)
            .first()
        )
        viewer = request.user if request.user.is_authenticated else None
        if profile is None or (viewer and is_blocked(viewer, profile.account)):
            return Response({"message": "No page at that address"}, status=404)

        if not viewer or viewer.pk != profile.account_id:
            PageView.objects.create(stylist=profile, viewer=viewer)
        return Response(stylist_page(profile, viewer))


def stylist_page(profile, viewer=None):
    """
    Her public page as the API sends it. The website inlines the same thing into her
    page's HTML (apps/web/views.py), so it opens on her page rather than a spinner.
    """
    reviews = [
        {
            "id": str(r.pk),
            "booking_id": str(r.booking_id),
            "rating": r.rating,
            "body": r.body,
            "status": r.status,
            "author_name": r.author_name,
            "service_name": r.service_name,
            "created_at": r.created_at,
        }
        for r in Review.objects.filter(
            booking__stylist_profile=profile, status="published"
        ).order_by("-created_at")[:10]
    ]

    from .models import FeaturedPage

    data = StylistProfileSerializer(profile).data
    data["claimable"] = FeaturedPage.objects.filter(profile=profile, claimed_at=None).exists()
    # Exactly what was checked, so a badge never means more than it says.
    data["checks"] = sorted(
        "work" if c == "proof_photo" else c for c in held_checks(profile.account_id)
    )
    # The proof photo is for the verification queue, and her payment details go
    # only to a client she's accepted — neither is on her page.
    data.pop("proof_photo_uri", None)
    data.pop("payment_methods", None)
    data.pop("address", None)

    return {
        "profile": data,
        **({"waitlist_joined": profile.waitlist.filter(client=viewer).exists()} if viewer else {}),
        "menu": MenuItemSerializer(profile.menu_items.all(), many=True).data,
        "photos": PortfolioPhotoSerializer(profile.portfolio_photos.all(), many=True).data,
        "confirmed_styles": profile.confirmed_styles_count,
        "reviews": reviews,
        "rating": (
            {"average": float(profile.rating_average), "count": profile.rating_count}
            if profile.rating_count
            else None
        ),
        "response_hours": profile.response_hours,
        "timing_label": timing_label_for(profile),
    }


# ── Menu ──────────────────────────────────────────────


def _menu_draft(body, partial=False, current=None):
    """What the server keeps from a posted service, or an error message."""
    merged = dict(current or {})
    merged.update(body or {})
    name = str(merged.get("name") or "").strip()
    try:
        price = float(merged.get("price"))
    except (TypeError, ValueError):
        price = 0
    if not name or price <= 0:
        return None, "A service needs a name and a price"
    duration = merged.get("duration_minutes")
    try:
        duration = int(duration) if duration else None
    except (TypeError, ValueError):
        duration = None
    options = clean_options(merged.get("options") or [])
    for opt in options:
        if not opt["id"]:
            opt["id"] = str(uuid.uuid4())
    return {
        "name": name[:150],
        "price": price,
        "from_price": bool(merged.get("from_price")),
        "duration_minutes": duration,
        "note": str(merged.get("note") or "").strip()[:500],
        "options": options,
        "hair_included": bool(merged.get("hair_included")),
    }, None


@extend_schema_view(get=extend_schema(responses=MenuItemSerializer(many=True)), post=extend_schema(request=MenuItemDraftSerializer, responses={201: MenuItemSerializer}))
class MenuListCreateView(APIView):
    """GET / POST /api/stylists/me/menu/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = _my_profile(request)
        if profile is None:
            return Response([])
        return Response(MenuItemSerializer(profile.menu_items.all(), many=True).data)

    def post(self, request):
        profile = _my_profile(request)
        if profile is None:
            return Response(NO_PROFILE, status=404)
        draft, error = _menu_draft(request.data)
        if error:
            return Response({"message": error}, status=400)
        with transaction.atomic():
            item = MenuItem.objects.create(stylist=profile, **draft)
            open_if_ready(profile)
        return Response(MenuItemSerializer(item).data, status=201)


@extend_schema_view(patch=extend_schema(request=MenuItemDraftSerializer(partial=True), responses=MenuItemSerializer), delete=extend_schema(responses={204: None}))
class MenuDetailView(APIView):
    """PATCH / DELETE /api/stylists/me/menu/:id/"""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        profile = _my_profile(request)
        item = profile.menu_items.filter(pk=pk).first() if profile else None
        if item is None:
            return Response({"message": "That service is no longer on your menu"}, status=404)
        current = MenuItemSerializer(item).data
        current["price"] = float(item.price)
        draft, error = _menu_draft(request.data, current=current)
        if error:
            return Response({"message": error}, status=400)
        if draft["name"] != item.name:
            item.styles = []  # renamed: tag it again from the new name
        for field, value in draft.items():
            setattr(item, field, value)
        item.save()
        return Response(MenuItemSerializer(item).data)

    def delete(self, request, pk):
        profile = _my_profile(request)
        if profile:
            profile.menu_items.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(post=extend_schema(request=MenuImportRequestSerializer, responses={201: MenuItemSerializer(many=True)}))
class MenuImportView(APIView):
    """POST /api/stylists/me/menu/import/ — many services at once, from a pasted list."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = _my_profile(request)
        if profile is None:
            return Response(NO_PROFILE, status=404)
        items = request.data.get("items")
        if not isinstance(items, list) or not items:
            return Response({"message": "No items to import."}, status=400)
        drafts = []
        for raw in items:
            draft, error = _menu_draft(raw)
            if error:
                return Response({"message": error}, status=400)
            drafts.append(draft)
        with transaction.atomic():
            created = [MenuItem.objects.create(stylist=profile, **d) for d in drafts]
            open_if_ready(profile)
        return Response(MenuItemSerializer(created, many=True).data, status=201)


# ── Portfolio ─────────────────────────────────────────


@extend_schema_view(get=extend_schema(responses=PortfolioPhotoSerializer(many=True)), post=extend_schema(request=PortfolioAddRequestSerializer, responses={201: PortfolioPhotoSerializer(many=True)}))
class PortfolioListCreateView(APIView):
    """GET / POST /api/stylists/me/portfolio/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = _my_profile(request)
        if profile is None:
            return Response([])
        return Response(
            PortfolioPhotoSerializer(profile.portfolio_photos.all(), many=True).data
        )

    def post(self, request):
        profile = _my_profile(request)
        if profile is None:
            return Response(NO_PROFILE, status=404)
        photos = request.data.get("photos")
        if not isinstance(photos, list) or not photos:
            return Response({"message": "No photos to add"}, status=400)
        if len(photos) > settings.MAX_PORTFOLIO_BATCH:
            return Response({"message": "Add up to 20 at a time"}, status=400)
        checked = []
        for raw in photos:
            media = own_media(request.user, (raw or {}).get("uri"))
            if media is None:
                return Response({"message": "A photo needs a picture"}, status=400)
            uri = media_url(request, media, media.full_path)
            thumb = media_url(request, media, media.thumb_path) if media.thumb_path else ""
            service_id = (raw or {}).get("service_id")
            service = (
                profile.menu_items.filter(pk=service_id).first()
                if service_id and _is_uuid(service_id)
                else None
            )
            # A look she already posted of this photo, so her page links to it. Hers only.
            look_id = (raw or {}).get("look_id")
            if look_id:
                from apps.looks.models import Look

                if not (_is_uuid(look_id) and Look.objects.filter(pk=look_id, author=request.user).exists()):
                    return Response({"message": "That look isn’t yours"}, status=400)
            checked.append((uri, thumb, service, look_id or None))

        # Shared to the feed only from a live page: a draft page has nobody to send clients to.
        share = bool(request.data.get("post_as_looks")) and profile.published
        created = []
        with transaction.atomic():
            for uri, thumb, service, look_id in checked:
                photo = PortfolioPhoto.objects.create(
                    stylist=profile, uri=uri, thumb_uri=thumb, service=service, look_id=look_id
                )
                if share and service and not look_id:
                    photo.look_id = self._share(profile, photo, service)
                    if photo.look_id:
                        photo.save(update_fields=["look_id"])
                created.append(photo)
        return Response(PortfolioPhotoSerializer(created, many=True).data, status=201)

    def _share(self, profile, photo, service):
        """A look for a photo tagged with a service whose style can be told."""
        from apps.looks.models import Look

        style = style_for_service(service.name)
        if style is None:
            return None
        look = Look.objects.create(
            author=profile.account,
            photo_uri=photo.uri,
            thumb_uri=photo.thumb_uri,
            stylist_id=str(profile.account_id),
            stylist_name=profile.display_name,
            stylist_handle=profile.handle,
            service_id=str(service.pk),
            service_name=service.name,
            price=service.price,
            from_price=service.from_price,
            area=profile.base_area,
            visibility="public",
        )
        look.styles.add(style)
        return look.pk


@extend_schema_view(patch=extend_schema(request=PortfolioPatchRequestSerializer, responses=PortfolioPhotoSerializer), delete=extend_schema(responses={204: None}))
class PortfolioDetailView(APIView):
    """PATCH / DELETE /api/stylists/me/portfolio/:id/"""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        profile = _my_profile(request)
        photo = profile.portfolio_photos.filter(pk=pk).first() if profile else None
        if photo is None:
            return Response({"message": "That photo is no longer in your portfolio"}, status=404)
        if "service_id" in request.data:
            service_id = request.data.get("service_id")
            photo.service = (
                profile.menu_items.filter(pk=service_id).first()
                if service_id and _is_uuid(service_id)
                else None
            )
            photo.save(update_fields=["service"])
        return Response(PortfolioPhotoSerializer(photo).data)

    def delete(self, request, pk):
        profile = _my_profile(request)
        if profile:
            profile.portfolio_photos.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _day_param(value):
    try:
        return date.fromisoformat(value) if value else None
    except ValueError:
        return None


@extend_schema_view(
    get=extend_schema(
        parameters=[
            OpenApiParameter("service", str, description="The menu item"),
            OpenApiParameter("options", str, description="Its chosen option ids, comma separated"),
            OpenApiParameter("from", str, description="First day wanted, yyyy-MM-dd (today if left out)"),
            OpenApiParameter("to", str, description="Last day wanted, yyyy-MM-dd (four weeks on if left out)"),
            OpenApiParameter("booking", str, description="Her appointment to move: its length, its own time left free"),
        ],
        responses=FreeSlotsSerializer,
    )
)
class StylistSlotsView(APIView):
    """
    GET /api/stylists/by-handle/:handle/slots/?service=&options=&from=&to= — her free
    times on the days asked for, two months at most. With ?booking= instead of a
    service, the times the client could move that appointment to.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, handle):
        profile = StylistProfile.objects.filter(handle=handle.lower(), published=True).first()
        if profile is None:
            return Response({"message": "No page at that address"}, status=404)
        if profile.featured:
            return Response({"message": not_booking_message(profile)}, status=400)
        viewer = request.user if request.user.is_authenticated else None
        moving = request.query_params.get("booking")
        if moving:
            booking = (
                Booking.objects.filter(pk=moving, stylist_profile=profile, client=viewer, status="confirmed").first()
                if viewer and _is_uuid(moving)
                else None
            )
            if booking is None:
                return Response({"message": "That appointment isn’t yours to move"}, status=404)
            minutes, exclude = booking.duration_minutes or 120, booking.pk
        else:
            service_id = request.query_params.get("service")
            service = (
                profile.menu_items.filter(pk=service_id).first()
                if service_id and _is_uuid(service_id)
                else None
            )
            if service is None:
                return Response({"message": "Pick a service from the menu"}, status=400)
            option_ids = [
                o.strip() for o in request.query_params.get("options", "").split(",") if o.strip()
            ]
            minutes, exclude = job_minutes(service, option_ids), None
        params = request.query_params
        return Response(
            free_times(
                profile,
                minutes,
                first=_day_param(params.get("from")),
                last=_day_param(params.get("to")),
                viewer_id=viewer.pk if viewer else None,
                exclude_id=exclude,
            )
        )


def _present_block(block):
    return {
        "id": str(block.pk),
        "start": block.start,
        "end": block.end,
        "note": block.note,
        "repeats": list(block.repeats),
        # Only the ones still to come: the past ones are nobody's business.
        "skips": [d.isoformat() for d in block.skips if d >= today_for(block.stylist_profile)],
    }


def _when_parsed(value):
    from apps.common.timeparse import parse_iso

    try:
        return parse_iso(value) if value else None
    except (TypeError, ValueError):
        return None


@extend_schema_view(
    get=extend_schema(responses=TimeBlockSerializer(many=True)),
    post=extend_schema(request=TimeBlockRequestSerializer, responses={201: TimeBlockSerializer}),
)
class TimeBlockListView(APIView):
    """
    GET / POST /api/stylists/me/blocks/ — part of a day she's taken out of her diary
    (a client booked elsewhere, a school run). Clients see it as booked.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.bookings.models import TimeBlock

        profile = _my_profile(request)
        if profile is None:
            return Response(NO_PROFILE, status=404)
        blocks = TimeBlock.objects.filter(stylist_profile=profile).filter(
            Q(end__gt=timezone.now()) | ~Q(repeats=[])
        )
        return Response([_present_block(b) for b in blocks])

    def post(self, request):
        from apps.bookings.held import diary_lock, held_ranges
        from apps.bookings.models import TimeBlock

        profile = _my_profile(request)
        if profile is None:
            return Response(NO_PROFILE, status=404)
        start, end = _when_parsed(request.data.get("start")), _when_parsed(request.data.get("end"))
        if start is None or end is None or end <= start:
            return Response({"message": "Pick when it starts and when it ends"}, status=400)
        repeats = request.data.get("repeats") or []
        if not isinstance(repeats, list) or any(type(d) is not int or not 0 <= d <= 6 for d in repeats):
            return Response({"message": "Say which days it repeats on"}, status=400)
        repeats = sorted(set(repeats))
        if end <= timezone.now() and not repeats:
            return Response({"message": "That time has been and gone"}, status=400)
        if end - start > timedelta(hours=24):
            return Response({"message": "For whole days, add them as days away instead"}, status=400)
        block = TimeBlock(stylist_profile=profile, start=start, end=end, repeats=repeats)
        times = block.occurrences(zones.of(profile), today_for(profile), last_day(profile))
        with diary_lock(profile.pk):
            # Never over someone's appointment, or a time someone's waiting to hear about,
            # on any day it comes round.
            held = held_ranges(profile, blocks=False)
            clash = next(
                ((held_from, booking) for t_from, t_to in times for held_from, held_to, booking in held
                 if t_from < held_to and t_to > held_from),
                None,
            )
            if clash:
                held_from, booking = clash
                first = (booking.client_name or "A client").split(" ")[0]
                at = held_from.astimezone(zones.of(profile))
                asked = booking.status == "requested"
                return Response(
                    {
                        "message": f"That covers {first}’s {'request' if asked else 'appointment'} "
                        f"at {at:%H:%M} on {at:%a} {at.day} {at:%b}. "
                        f"{'Answer it' if asked else 'Move or cancel it'} first."
                    },
                    status=409,
                )
            block.note = str(request.data.get("note") or "").strip()[:100]
            block.save()
        return Response(_present_block(block), status=201)


@extend_schema_view(post=extend_schema(request=TimeBlockSkipRequestSerializer, responses=TimeBlockSerializer))
class TimeBlockSkipView(APIView):
    """
    POST /api/stylists/me/blocks/:id/skip/ {date, skip} — one day a repeating block
    doesn't come round (working through lunch next Tuesday), or does again.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        from apps.bookings.held import diary_lock, held_ranges, open_day
        from apps.bookings.models import TimeBlock

        profile = _my_profile(request)
        block = TimeBlock.objects.filter(pk=pk, stylist_profile=profile).first() if profile else None
        if block is None:
            return Response({"message": "That block is gone"}, status=404)
        day = _day_param(str(request.data.get("date") or ""))
        zone = zones.of(profile)
        weekday = (day.weekday() + 1) % 7 if day else None
        if day is None or weekday not in block.repeats or day < block.start.astimezone(zone).date():
            return Response({"message": "It doesn’t come round that day"}, status=400)
        if day < today_for(profile):
            return Response({"message": "That day has been and gone"}, status=400)
        skip = request.data.get("skip", True) is not False
        with diary_lock(profile.pk):
            block = TimeBlock.objects.get(pk=block.pk)
            if skip:
                block.skips = sorted({*block.skips, day})
            else:
                # Back on, as long as nothing's been booked into the time meanwhile.
                block.skips = [d for d in block.skips if d != day]
                times = block.occurrences(zone, day, day)
                if any(
                    s < held_to and e > held_from
                    for s, e in times
                    for held_from, held_to, _ in held_ranges(profile, blocks=False)
                ):
                    return Response({"message": "That time has been booked since"}, status=409)
            # Old skips go, so the list never grows.
            block.skips = [d for d in block.skips if d >= today_for(profile)]
            block.save(update_fields=["skips"])
        if skip:
            # Anyone waiting on that day hears it has room again.
            open_day(profile, datetime.combine(day, time(12), tzinfo=zone))
        return Response(_present_block(block))


@extend_schema_view(delete=extend_schema(responses={204: None}))
class TimeBlockDetailView(APIView):
    """DELETE /api/stylists/me/blocks/:id/ — the time is hers to book again."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        from apps.bookings.held import open_day
        from apps.bookings.models import TimeBlock

        profile = _my_profile(request)
        block = TimeBlock.objects.filter(pk=pk, stylist_profile=profile).first() if profile else None
        if block is None:
            return Response({"message": "Already gone"}, status=404)
        upcoming = [
            start
            for start, end in block.occurrences(zones.of(profile), today_for(profile), last_day(profile))
            if end > timezone.now()
        ]
        block.delete()
        if upcoming:
            # Anyone waiting on the next day it took hears that day has room again.
            open_day(profile, max(upcoming[0], timezone.now()))
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(post=extend_schema(request=ClosedDayRequestSerializer, responses=StylistProfileSerializer))
class ClosedDayView(APIView):
    """
    POST /api/stylists/me/closed-days/ {date, closed} — she has enough clients that day:
    no new requests for it. Appointments already on it stay as they are. `closed: false`
    opens it again.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = _my_profile(request)
        if profile is None:
            return Response(NO_PROFILE, status=404)
        day = _day_param(str(request.data.get("date") or ""))
        if day is None:
            return Response({"message": "Pick a day"}, status=400)
        if day < today_for(profile):
            return Response({"message": "That day has been and gone"}, status=400)
        closed = request.data.get("closed", True) is not False
        with transaction.atomic():
            profile = StylistProfile.objects.select_for_update().get(pk=profile.pk)
            availability = dict(profile.availability or {})
            if not isinstance(availability.get("week"), list):
                # Hours she never set are 9 to 6 every day; written down, so she sees them.
                availability["week"] = [dict(DEFAULT_HOURS)] * 7
            days = set(availability.get("closed") or [])
            (days.add if closed else days.discard)(day.isoformat())
            profile.availability = _merged_availability(profile, {**availability, "closed": sorted(days)})
            profile.save(update_fields=["availability", "updated_at"])
        return Response(StylistProfileSerializer(profile).data)


@extend_schema_view(get=extend_schema(responses=NumbersSerializer))
class StylistNumbersView(APIView):
    """GET /api/stylists/me/numbers/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = _my_profile(request)
        if profile is None:
            return Response(NO_PROFILE, status=404)
        return Response(numbers_for(profile))


@extend_schema_view(get=extend_schema(responses=StylistSummarySerializer))
class StylistSummaryView(APIView):
    """GET /api/stylists/me/summary/ — the badge on the mode switch."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = _my_profile(request)
        if profile is None:
            return Response({"pending_requests": 0, "appointments_today": 0})
        today = timezone.now().astimezone(zones.of(profile)).replace(hour=0, minute=0, second=0, microsecond=0)
        mine = Booking.objects.filter(stylist_profile=profile)
        return Response(
            {
                "pending_requests": mine.filter(
                    status="requested", expires_at__gt=timezone.now()
                ).count(),
                "appointments_today": mine.filter(
                    status="confirmed",
                    scheduled_for__gte=today,
                    scheduled_for__lt=today + timedelta(days=1),
                ).count(),
            }
        )




@extend_schema_view(put=extend_schema(request=None, responses=PageWaitlistSerializer),
                    delete=extend_schema(responses=PageWaitlistSerializer))
class PageWaitlistView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "waitlist"

    @transaction.atomic
    def _change(self, request, handle, joined):
        profile = StylistProfile.objects.select_related("account").filter(handle__iexact=handle, published=True).first()
        if profile is None:
            return Response({"message": "No page at that address"}, status=404)
        if profile.account_id == request.user.pk:
            return Response({"message": "This is your page"}, status=400)
        if not FeaturedPage.objects.filter(profile=profile).exists() or featured.takes_bookings(profile):
            return Response({"message": f"{profile.display_name} already takes bookings. Book now."}, status=400)
        if joined:
            PageWaitlist.objects.get_or_create(stylist=profile, client=request.user)
        else:
            PageWaitlist.objects.filter(stylist=profile, client=request.user).delete()
        return Response({"joined": joined})

    def put(self, request, handle):
        return self._change(request, handle, True)

    def delete(self, request, handle):
        return self._change(request, handle, False)


@extend_schema_view(get=extend_schema(responses={200: ClaimPreviewSerializer}),
                    post=extend_schema(request=None, responses=UserResponseSerializer))
class FeaturedClaimView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "claim"

    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method == "GET" else [permissions.IsAuthenticated()]

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Referrer-Policy"] = "no-referrer"
        response["Cache-Control"] = "no-store"
        return response

    def get(self, request, code):
        from apps.looks.models import Look

        page = featured.page_for_code(code)
        if page is None:
            return Response({"message": featured.LINK_GONE}, status=410)
        profile = page.profile
        looks = Look.objects.filter(author_id=profile.account_id)
        return Response({
            "display_name": profile.display_name, "handle": profile.handle, "avatar_uri": profile.avatar_uri,
            "look_count": looks.count(), "live": profile.published, "waiting": profile.waitlist.count(),
            "photos": [{"uri": row["photo_uri"], "thumb_uri": row["thumb_uri"]}
                       for row in looks.order_by("-created_at").values("photo_uri", "thumb_uri")[:6]],
        })

    def post(self, request, code):
        page = featured.page_for_code(code)
        if page is None:
            return Response({"message": featured.LINK_GONE}, status=410)
        try:
            user = featured.claim(page, request.user)
        except ValueError as error:
            return Response({"message": str(error)}, status=410 if str(error) == featured.LINK_GONE else 409)
        return Response(UserSerializer(user).data)


def _claimed_profile(request):
    return StylistProfile.objects.select_related("account", "featured_page").filter(
        account=request.user, featured_page__claimed_at__isnull=False,
    ).first()


@extend_schema_view(get=extend_schema(responses=FinishSerializer))
class FinishView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = _claimed_profile(request)
        return Response(featured.finish_state(profile)) if profile else Response(NO_PROFILE, status=404)


@extend_schema_view(post=extend_schema(request=FinishPriceSerializer, responses=FinishSerializer))
class FinishPriceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        from apps.looks.models import Look, Style

        profile = _claimed_profile(request)
        if profile is None:
            return Response(NO_PROFILE, status=404)
        # Serialize prices for overlapping styles so one look is linked to one service.
        profile = StylistProfile.objects.select_for_update().get(pk=profile.pk)
        serializer = FinishPriceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        style = Style.objects.filter(slug=data["style"], looks__author_id=profile.account_id,
                                     looks__created_at__lt=profile.featured_page.claimed_at).first()
        if style is None:
            return Response({"message": "Pick a style from your photos"}, status=400)
        draft, error = _menu_draft({**data, "name": style.name})
        if error:
            return Response({"message": error}, status=400)
        looks = Look.objects.filter(author_id=profile.account_id, styles=style, service_id="",
                                    pk__in=profile.portfolio_photos.filter(service=None).values("look_id"))
        if not looks.exists():
            return Response(featured.finish_state(profile))
        service = MenuItem.objects.create(stylist=profile, styles=[style.slug], **draft)
        ids = list(looks.values_list("pk", flat=True))
        PortfolioPhoto.objects.filter(stylist=profile, look_id__in=ids, service=None).update(service=service)
        Look.objects.filter(pk__in=ids).update(service_id=str(service.pk), service_name=service.name,
                                             price=service.price, from_price=service.from_price)
        featured.open_if_ready(profile)
        return Response(featured.finish_state(profile))


@extend_schema_view(post=extend_schema(request=None, responses=FinishSerializer))
class FinishTagsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        profile = _claimed_profile(request)
        if profile is None:
            return Response(NO_PROFILE, status=404)
        FeaturedPage.objects.filter(profile=profile).update(tags_checked_at=timezone.now())
        profile.featured_page.refresh_from_db()
        return Response(featured.finish_state(profile))


@extend_schema_view(get=extend_schema(responses=StylistSearchResultSerializer(many=True)))
class SuggestedStylistsView(APIView):
    """GET /api/stylists/suggested/ — "Stylists for you", while the ranked feed is on for her."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.feed.suggestions import suggested_stylists

        return Response(
            [
                {
                    "account_id": str(p.account_id),
                    "handle": p.handle,
                    "display_name": p.display_name,
                    "avatar_uri": p.avatar_uri,
                    "base_area": p.base_area,
                    "currency": p.currency,
                    "rating": float(p.rating_average) if p.rating_count else None,
                    "rating_count": p.rating_count,
                    "verification_tier": p.verification_tier,
                    "reason": reason,
                }
                for p, reason in suggested_stylists(request.user)
            ]
        )
