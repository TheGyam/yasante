"""
Stylist views: her page, menu, portfolio, free times, numbers and summary.
"""

import logging
import uuid
from datetime import timedelta
from zoneinfo import ZoneInfo

from apps.bookings.models import Booking, Review
from apps.common.blocks import blocked_account_ids, is_blocked
from apps.common.models import log_search
from apps.common.permissions import IsPhoneVerified
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    NOT_HANDLES,
    MenuItem,
    PageView,
    PaymentMethod,
    PortfolioPhoto,
    StylistProfile,
)
from .numbers import numbers_for, timing_label_for
from .pricing import clean_options
from .serializers import (
    MenuItemSerializer,
    PortfolioPhotoSerializer,
    StylistProfileDraftSerializer,
    StylistProfileSerializer,
)
from .slots import compute_free_slots
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
    return isinstance(value.get("blocked", []), list)


class HandleCheckView(APIView):
    """GET /api/stylists/handle-available/?handle="""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        handle = request.query_params.get("handle", "").lower().strip()
        if not handle:
            return Response({"message": "Provide a handle."}, status=400)

        # Her own handle isn't "taken": editing her page checks the one she already has.
        others = StylistProfile.objects.all()
        if request.user.is_authenticated:
            others = others.exclude(account=request.user)

        def taken(h):
            return h in NOT_HANDLES or others.filter(handle=h).exists()

        if not taken(handle):
            return Response({"handle": handle, "available": True})
        suggestions = [
            s for s in (f"{handle}hair", f"{handle}.london", f"{handle}studio") if not taken(s)
        ]
        return Response({"handle": handle, "available": False, "suggestions": suggestions})


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

            name = Style.objects.filter(slug=style).values_list("name", flat=True).first() or style
            tagged = Look.objects.filter(styles__slug=style).values_list("stylist_id", flat=True)
            qs = qs.filter(
                Q(account_id__in=[t for t in tagged if t]) | Q(menu_items__name__icontains=name)
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
        qs = list(qs.order_by("-verification_tier", "-rating_count", "display_name")[:20])
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
                    travel_radius_miles=data.get("travel_radius_miles"),
                    instagram_handle=data.get("instagram_handle", ""),
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
                if "stylist" not in (request.user.roles or []):
                    request.user.roles = list(request.user.roles or []) + ["stylist"]
                    request.user.save(update_fields=["roles"])
        except IntegrityError:
            return Response({"message": "That handle has just been taken"}, status=409)

        return Response(StylistProfileSerializer(profile).data, status=201)


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

        for field in (
            "display_name",
            "bio",
            "avatar_uri",
            "base_area",
            "address",
            "instagram_handle",
            "proof_photo_uri",
        ):
            if field in data:
                setattr(profile, field, str(data[field] or "").strip())
                update_fields.append(field)
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
            profile.availability = data["availability"]
            update_fields.append("availability")

        if "handle" in data:
            new_handle = str(data["handle"] or "").lower().strip()
            if new_handle != profile.handle:
                if (
                    new_handle in NOT_HANDLES
                    or StylistProfile.objects.filter(handle=new_handle)
                    .exclude(pk=profile.pk)
                    .exists()
                ):
                    return Response({"message": "That handle is taken."}, status=409)
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

        profile.refresh_from_db()
        return Response(StylistProfileSerializer(profile).data)


class StylistPublishView(APIView):
    """POST /api/stylists/me/publish/ — refused until her phone is verified."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = _my_profile(request)
        if profile is None:
            return Response(NO_PROFILE, status=404)
        if not request.user.phone_verified:
            return Response(
                {"message": "Verify your mobile number before your page goes live"},
                status=403,
            )
        profile.published = True
        profile.save(update_fields=["published", "updated_at"])
        return Response(StylistProfileSerializer(profile).data)


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

        data = StylistProfileSerializer(profile).data
        # The proof photo is for the verification queue, and her payment details go
        # only to a client she's accepted — neither is on her page.
        data.pop("proof_photo_uri", None)
        data.pop("payment_methods", None)
        data.pop("address", None)

        return Response(
            {
                "profile": data,
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
        )


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
        item = MenuItem.objects.create(stylist=profile, **draft)
        return Response(MenuItemSerializer(item).data, status=201)


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
        for field, value in draft.items():
            setattr(item, field, value)
        item.save()
        return Response(MenuItemSerializer(item).data)

    def delete(self, request, pk):
        profile = _my_profile(request)
        if profile:
            profile.menu_items.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        return Response(MenuItemSerializer(created, many=True).data, status=201)


# ── Portfolio ─────────────────────────────────────────


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
            uri = str((raw or {}).get("uri") or "").strip()
            if not uri.startswith(("http://", "https://")):
                return Response({"message": "A photo needs a picture"}, status=400)
            service_id = (raw or {}).get("service_id")
            service = (
                profile.menu_items.filter(pk=service_id).first()
                if service_id and _is_uuid(service_id)
                else None
            )
            checked.append((uri, str((raw or {}).get("thumb_uri") or ""), service))

        # Shared to the feed only from a live page: a draft page has nobody to send clients to.
        share = bool(request.data.get("post_as_looks")) and profile.published
        created = []
        with transaction.atomic():
            for uri, thumb, service in checked:
                photo = PortfolioPhoto.objects.create(
                    stylist=profile, uri=uri, thumb_uri=thumb, service=service
                )
                if share and service:
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


class StylistSlotsView(APIView):
    """GET /api/stylists/by-handle/:handle/slots/?service=&options= — her free times."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, handle):
        profile = StylistProfile.objects.filter(handle=handle.lower(), published=True).first()
        if profile is None:
            return Response({"message": "No page at that address"}, status=404)
        service_id = request.query_params.get("service")
        service = (
            profile.menu_items.filter(pk=service_id).first()
            if service_id and _is_uuid(service_id)
            else None
        )
        if service is None:
            return Response({"message": "Pick a service from her menu"}, status=400)
        option_ids = [
            o.strip() for o in request.query_params.get("options", "").split(",") if o.strip()
        ]
        return Response(compute_free_slots(profile, service, option_ids))


class StylistNumbersView(APIView):
    """GET /api/stylists/me/numbers/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = _my_profile(request)
        if profile is None:
            return Response(NO_PROFILE, status=404)
        return Response(numbers_for(profile))


class StylistSummaryView(APIView):
    """GET /api/stylists/me/summary/ — the badge on the mode switch."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = _my_profile(request)
        if profile is None:
            return Response({"pending_requests": 0, "appointments_today": 0})
        zone = ZoneInfo(settings.STYLIST_TIME_ZONE)
        today = timezone.now().astimezone(zone).replace(hour=0, minute=0, second=0, microsecond=0)
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
