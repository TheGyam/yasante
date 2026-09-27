"""
Shelf serializers.
"""

from rest_framework import serializers

from .models import Product, ShelfItem


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "brand",
            "name",
            "category",
            "description",
            "ingredients",
            "photo_uri",
            "link",
        ]
        read_only_fields = fields


class ShelfItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = ShelfItem
        fields = [
            "id",
            "product",
            "product_id",
            "status",
            "rating",
            "review",
            "times_bought",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "times_bought", "created_at", "updated_at"]

    def create(self, validated_data):
        # We don't save the hair snapshot on creation unless they rate it immediately
        return super().create(validated_data)


class ShelfItemUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=["using", "finished", "repurchased"], required=False
    )
    rating = serializers.IntegerField(
        min_value=1, max_value=5, required=False, allow_null=True
    )
    review = serializers.CharField(max_length=500, required=False, allow_blank=True)


# ── Shapes for the schema the app's types are generated from ─────────────────────
from apps.common.schema import optional  # noqa: E402


class ProductResponseSerializer(serializers.Serializer):
    id = serializers.CharField()
    brand = serializers.CharField()
    name = serializers.CharField()
    category = serializers.ChoiceField(choices=Product.CATEGORY_CHOICES)
    # Only on a product she added that a moderator hasn't approved yet.
    pending = optional(serializers.BooleanField())


class ProductCreateRequestSerializer(serializers.Serializer):
    """POST /api/products/ — a product she can't find, added by her."""

    brand = serializers.CharField(max_length=150)
    name = serializers.CharField(max_length=150)
    category = serializers.ChoiceField(choices=Product.CATEGORY_CHOICES)
    barcode = serializers.CharField(max_length=20, required=False, allow_blank=True)


class BarcodeResultSerializer(serializers.Serializer):
    product = ProductResponseSerializer()
    source = serializers.ChoiceField(choices=["catalogue", "open_beauty_facts"])


class ShelfItemResponseSerializer(serializers.Serializer):
    id = serializers.CharField()
    product = ProductResponseSerializer()
    status = serializers.ChoiceField(choices=["using", "finished", "repurchased"])
    rating = optional(serializers.IntegerField(min_value=1, max_value=5))
    times_bought = serializers.IntegerField()
    started_at = serializers.DateTimeField()
    finished_at = optional(serializers.DateTimeField())


class ShelfAddRequestSerializer(serializers.Serializer):
    product_id = serializers.CharField()


class ShelfPatchRequestSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["using", "finished", "repurchased"], required=False)
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False)
