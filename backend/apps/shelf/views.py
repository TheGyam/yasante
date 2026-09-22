"""
Shelf: the product catalogue, and what's on her own shelf.
"""

import logging
import uuid

from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product, ShelfItem

logger = logging.getLogger(__name__)


def present_product(p):
    return {"id": str(p.pk), "brand": p.brand, "name": p.name, "category": p.category}


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


class ProductSearchView(APIView):
    """GET /api/products/?q=&limit= — every word must match brand, name or category."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            limit = max(1, min(int(request.query_params.get("limit", 30)), 50))
        except (TypeError, ValueError):
            limit = 30
        qs = Product.objects.all()
        for word in request.query_params.get("q", "").split():
            qs = qs.filter(
                Q(brand__icontains=word) | Q(name__icontains=word) | Q(category__icontains=word)
            )
        return Response([present_product(p) for p in qs.order_by("brand", "name")[:limit]])


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
            product = Product.objects.filter(pk=uuid.UUID(str(product_id))).first()
        except (TypeError, ValueError):
            product = None
        if product is None:
            return Response({"message": "That product isn’t in the catalogue"}, status=404)
        if ShelfItem.objects.filter(user=request.user, product=product).exists():
            return Response({"message": "It’s already on your shelf"}, status=409)
        item = ShelfItem.objects.create(user=request.user, product=product, status="using")
        return Response(present_item(item), status=201)


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
                {"message": f"Can’t go from {item.status} to {wanted}"}, status=409
            )
        item.save()
        return Response(present_item(item))

    def delete(self, request, pk):
        deleted, _ = ShelfItem.objects.filter(pk=pk, user=request.user).delete()
        if not deleted:
            return Response({"message": "That’s not on your shelf"}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)
