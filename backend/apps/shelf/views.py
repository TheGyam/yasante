"""
Shelf: the product catalogue, and what's on her own shelf.
"""

import logging
import uuid

from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import barcodes, openbeauty
from .models import Product, ShelfItem
from .serializers import (
    BarcodeResultSerializer,
    ProductCreateRequestSerializer,
    ProductResponseSerializer,
    ShelfAddRequestSerializer,
    ShelfItemResponseSerializer,
    ShelfPatchRequestSerializer,
)

logger = logging.getLogger(__name__)


def present_product(p):
    data = {"id": str(p.pk), "brand": p.brand, "name": p.name, "category": p.category}
    if p.status == "pending":
        data["pending"] = True
    return data


# Fewer results than this here, and Open Beauty Facts is asked too.
FALLBACK_BELOW = 5


def present_item(i):
    return {
        "id": str(i.pk),
        "product": present_product(i.product),
        "status": i.status,
        "rating": i.rating,
        "times_bought": i.times_bought,
        "started_at": i.created_at,
        "finished_at": i.finished_at,
    }


def _hair_now(user):
    hair = getattr(user, "hair_profile", None)
    if not hair:
        return None
    return {
        "texture": hair.texture,
        "length": hair.length,
        "shrunk_length": hair.shrunk_length,
        "density": hair.density,
        "porosity": hair.porosity,
        "goals": hair.goals,
        "scalp": hair.scalp,
        "chemicals": hair.chemicals,
    }


@extend_schema_view(get=extend_schema(responses=BarcodeResultSerializer))
class ProductBarcodeView(APIView):
    """GET /api/products/barcode/<code>/ — the product behind a scanned barcode."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, code):
        digits = barcodes.clean(code)
        if not digits:
            return Response(
                {"message": "That barcode didn’t scan properly. Try again, a little closer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        product, source = barcodes.find(digits, request.user)
        if product is None:
            return Response(
                {"message": "We don’t know that one yet. Search for it by name instead."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"product": present_product(product), "source": source})


def _matching(user, q):
    qs = Product.objects.visible_to(user)
    for word in q.split():
        qs = qs.filter(Q(brand__icontains=word) | Q(name__icontains=word) | Q(category__icontains=word))
    return qs


def _learn_from_open_beauty_facts(q):
    """Hair products matching the search on Open Beauty Facts, kept in our catalogue."""
    for found in openbeauty.search(q):
        code = barcodes.clean(found.get("code"))
        values = openbeauty.fields(found)
        if not code or not values:
            continue
        Product.objects.get_or_create(barcode=code, defaults={**values, "source": "open_beauty_facts"})


@extend_schema_view(
    get=extend_schema(responses=ProductResponseSerializer(many=True)),
    post=extend_schema(request=ProductCreateRequestSerializer, responses={201: ProductResponseSerializer}),
)
class ProductSearchView(APIView):
    """
    GET /api/products/?q=&limit= — every word must match brand, name or category. When
    our catalogue has little for it, Open Beauty Facts is asked as well.
    POST /api/products/ — add one nobody has yet: hers at once, everyone's once approved.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            limit = max(1, min(int(request.query_params.get("limit", 30)), 50))
        except (TypeError, ValueError):
            limit = 30
        q = request.query_params.get("q", "").strip()
        qs = _matching(request.user, q)
        if len(q) >= 3 and qs.count() < FALLBACK_BELOW:
            _learn_from_open_beauty_facts(q)
            qs = _matching(request.user, q)
        return Response([present_product(p) for p in qs.order_by("brand", "name")[:limit]])

    def post(self, request):
        body = ProductCreateRequestSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        data = body.validated_data
        brand, name = data["brand"].strip(), data["name"].strip()
        code = barcodes.clean(data.get("barcode") or "")
        # Already here (approved, or hers): that one, not a second copy.
        existing = Product.objects.visible_to(request.user).filter(
            Q(barcode=code) if code else Q(brand__iexact=brand, name__iexact=name)
        ).first()
        if existing:
            return Response(present_product(existing), status=status.HTTP_200_OK)
        if code and Product.objects.filter(barcode=code).exists():
            # Someone else's addition with that barcode is awaiting review.
            code = None
        product = Product.objects.create(
            brand=brand, name=name, category=data["category"], barcode=code,
            source="community", status="pending", added_by=request.user,
        )
        return Response(present_product(product), status=status.HTTP_201_CREATED)


@extend_schema_view(get=extend_schema(responses=ShelfItemResponseSerializer(many=True)), post=extend_schema(request=ShelfAddRequestSerializer, responses={201: ShelfItemResponseSerializer}))
class ShelfListCreateView(APIView):
    """GET / POST /api/shelf/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        items = (
            ShelfItem.objects.filter(user=request.user)
            .select_related("product")
            .order_by("-created_at")
        )
        return Response([present_item(i) for i in items])

    def post(self, request):
        product_id = request.data.get("product_id")
        try:
            product = Product.objects.visible_to(request.user).filter(pk=uuid.UUID(str(product_id))).first()
        except (TypeError, ValueError):
            product = None
        if product is None:
            return Response({"message": "That product isn’t in the catalogue"}, status=404)
        if ShelfItem.objects.filter(user=request.user, product=product).exists():
            return Response({"message": "It’s already on your shelf"}, status=409)
        item = ShelfItem.objects.create(user=request.user, product=product, status="using")
        return Response(present_item(item), status=201)


@extend_schema_view(patch=extend_schema(request=ShelfPatchRequestSerializer, responses=ShelfItemResponseSerializer), delete=extend_schema(responses={204: None}))
class ShelfDetailView(APIView):
    """PATCH / DELETE /api/shelf/:id/ — a rating, finishing it, or buying it again."""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        item = ShelfItem.objects.select_related("product").filter(pk=pk, user=request.user).first()
        if item is None:
            return Response({"message": "That’s not on your shelf"}, status=404)

        if "rating" in request.data:
            try:
                rating = int(request.data["rating"])
            except (TypeError, ValueError):
                rating = 0
            if not 1 <= rating <= 5:
                return Response({"message": "Between one and five stars"}, status=400)
            item.rating = rating
            # Stored with her hair at that moment, to read against hair like hers.
            item.hair_snapshot = _hair_now(request.user)

        wanted = request.data.get("status")
        if wanted == "finished" and item.status != "finished":
            item.status = "finished"
            item.finished_at = timezone.now()
        elif wanted == "repurchased" and item.status == "finished":
            # Back in use, and counted — the strongest signal a product gets.
            item.status = "repurchased"
            item.times_bought += 1
            item.finished_at = None
        elif wanted and wanted != item.status:
            return Response(
                {"message": "That can’t be changed right now. Pull down to refresh and try again."}, status=409
            )
        item.save()
        return Response(present_item(item))

    def delete(self, request, pk):
        deleted, _ = ShelfItem.objects.filter(pk=pk, user=request.user).delete()
        if not deleted:
            return Response({"message": "That’s not on your shelf"}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)
