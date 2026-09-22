"""
Stylist serializers.
"""

from rest_framework import serializers

from .models import NOT_HANDLES, MenuItem, PaymentMethod, PortfolioPhoto, StylistProfile


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ["id", "label", "details"]


class PoliciesSerializer(serializers.Serializer):
    notice_hours = serializers.IntegerField(min_value=0)
    deposit_type = serializers.ChoiceField(choices=["none", "fixed", "percent"])
    deposit_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    reschedule_free_once = serializers.BooleanField(default=True)


class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = [
            "id",
            "name",
            "price",
            "from_price",
            "duration_minutes",
            "note",
            "hair_included",
            "options",
        ]
        read_only_fields = ["id"]


class MenuItemDraftSerializer(serializers.Serializer):
    """For creating/updating menu items."""

    name = serializers.CharField(max_length=150)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    from_price = serializers.BooleanField(default=False)
    duration_minutes = serializers.IntegerField(
        required=False, allow_null=True, min_value=1
    )
    note = serializers.CharField(
        max_length=500, required=False, allow_blank=True, default=""
    )
    hair_included = serializers.BooleanField(required=False, allow_null=True)
    options = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )


class PortfolioPhotoSerializer(serializers.ModelSerializer):
    service_id = serializers.UUIDField(
        source="service.id", read_only=True, allow_null=True
    )

    class Meta:
        model = PortfolioPhoto
        fields = ["id", "uri", "thumb_uri", "service_id", "look_id", "created_at"]
        read_only_fields = ["id", "thumb_uri", "look_id", "created_at"]


class StylistProfileSerializer(serializers.ModelSerializer):
    """Full profile for the stylist herself."""

    account_id = serializers.UUIDField(source="account.id", read_only=True)
    policies = PoliciesSerializer(source="*", read_only=True)
    payment_methods = PaymentMethodSerializer(many=True, read_only=True)

    class Meta:
        model = StylistProfile
        fields = [
            "id",
            "account_id",
            "display_name",
            "handle",
            "bio",
            "avatar_uri",
            "service_models",
            "base_area",
            "address",
            "travel_radius_miles",
            "instagram_handle",
            "policies",
            "availability",
            "payment_methods",
            "proof_photo_uri",
            "verification_tier",
            "published",
            "created_at",
        ]
        read_only_fields = ["id", "account_id", "verification_tier", "created_at"]


class StylistProfileDraftSerializer(serializers.Serializer):
    """For creating / updating a stylist profile."""

    display_name = serializers.CharField(max_length=150)
    handle = serializers.CharField(max_length=50)
    bio = serializers.CharField(
        max_length=1000, required=False, allow_blank=True, default=""
    )
    service_models = serializers.ListField(
        child=serializers.ChoiceField(choices=["salon", "home", "mobile"])
    )
    base_area = serializers.CharField(max_length=100)
    travel_radius_miles = serializers.FloatField(required=False, allow_null=True)
    instagram_handle = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )
    policies = PoliciesSerializer(required=False)
    proof_photo_uri = serializers.URLField(
        max_length=500, required=False, allow_blank=True, default=""
    )
    availability = serializers.DictField(required=False)
    payment_methods = PaymentMethodSerializer(many=True, required=False)

    def validate_handle(self, value):
        import re

        value = value.lower().strip()
        if value in NOT_HANDLES:
            raise serializers.ValidationError("That handle is reserved.")
        # The same rules the app checks as she types.
        if (
            not re.fullmatch(r"[a-z0-9][a-z0-9._]*", value)
            or re.search(r"[._]{2,}", value)
            or value[-1] in "._"
        ):
            raise serializers.ValidationError(
                "Letters, numbers, dots and underscores only."
            )
        return value


class HandleCheckSerializer(serializers.Serializer):
    handle = serializers.CharField(max_length=50)
    available = serializers.BooleanField(read_only=True)
    suggestions = serializers.ListField(
        child=serializers.CharField(), read_only=True, required=False
    )


class StylistPageSerializer(serializers.Serializer):
    """Public page — strips private fields."""

    profile = serializers.SerializerMethodField()
    menu = MenuItemSerializer(many=True)
    photos = PortfolioPhotoSerializer(many=True)
    confirmed_styles = serializers.IntegerField()
    reviews = serializers.ListField()
    rating = serializers.SerializerMethodField()
    response_hours = serializers.FloatField(allow_null=True)
    timing_label = serializers.DictField(allow_null=True, required=False)

    def get_profile(self, obj):
        data = StylistProfileSerializer(obj["profile"]).data
        # Strip private fields
        data.pop("proof_photo_uri", None)
        data.pop("payment_methods", None)
        return data

    def get_rating(self, obj):
        profile = obj["profile"]
        if profile.rating_count > 0:
            return {
                "average": float(profile.rating_average),
                "count": profile.rating_count,
            }
        return None
