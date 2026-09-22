"""
Planner serializers.
"""

from rest_framework import serializers

from .models import CarePlan, CarePlanSession, CarePlanStep, Collection, CollectionItem


class CollectionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectionItem
        fields = [
            "id",
            "collection_id",
            "kind",
            "ref_id",
            "photo_uri",
            "thumb_uri",
            "title",
            "created_at",
        ]
        read_only_fields = fields


class CollectionItemDraftSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["look", "product"])
    ref_id = serializers.UUIDField()


class CollectionSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Collection
        fields = ["id", "name", "items", "item_count", "created_at", "updated_at"]
        read_only_fields = ["id", "item_count", "created_at", "updated_at"]

    def get_items(self, obj):
        # Only return the first 4 items for the preview when listing collections
        # The detail view will return all items
        preview_count = self.context.get("preview_count", 4)
        items = obj.items.all()[:preview_count]
        return CollectionItemSerializer(items, many=True).data


class CarePlanStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarePlanStep
        fields = ["id", "text", "sort_order"]
        read_only_fields = ["id"]


class CarePlanSerializer(serializers.ModelSerializer):
    steps = CarePlanStepSerializer(many=True, read_only=True)

    class Meta:
        model = CarePlan
        fields = [
            "id",
            "name",
            "frequency",
            "last_done_at",
            "steps",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "last_done_at", "created_at", "updated_at"]


class CarePlanDraftSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    frequency = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )
    steps = serializers.ListField(
        child=serializers.CharField(max_length=255), required=False, default=list
    )


class CarePlanSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarePlanSession
        fields = ["id", "plan_id", "completed_at", "notes"]
        read_only_fields = ["id", "plan_id", "completed_at"]


class CarePlanSessionDraftSerializer(serializers.Serializer):
    notes = serializers.CharField(
        max_length=1000, required=False, allow_blank=True, default=""
    )
