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
        choices=["using", "finished", "repurchased", "discarded"], required=False
    )
    rating = serializers.IntegerField(
        min_value=1, max_value=5, required=False, allow_null=True
    )
    review = serializers.CharField(max_length=500, required=False, allow_blank=True)
