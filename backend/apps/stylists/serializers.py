"""
Stylist serializers.
"""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.schema import BlankIsOptional, optional

from .models import NOT_HANDLES, MenuItem, PaymentMethod, PortfolioPhoto, StylistProfile


class PaymentMethodSerializer(BlankIsOptional, serializers.ModelSerializer):
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


class MenuOptionSerializer(serializers.Serializer):
    id = serializers.CharField()
    group = serializers.ChoiceField(choices=["length", "size"])
    label = serializers.CharField()
    add = serializers.FloatField()
    add_minutes = optional(serializers.IntegerField())


@extend_schema_field(serializers.ListField(child=MenuOptionSerializer()))
class OptionsField(serializers.JSONField):
    pass


class MenuItemSerializer(BlankIsOptional, serializers.ModelSerializer):
    # Sent as stored; the schema describes its shape.
    options = OptionsField(read_only=True)

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


class PortfolioPhotoSerializer(BlankIsOptional, serializers.ModelSerializer):
    service_id = serializers.UUIDField(
        source="service.id", read_only=True, allow_null=True
    )

    class Meta:
        model = PortfolioPhoto
        fields = ["id", "uri", "thumb_uri", "service_id", "look_id", "created_at"]
        read_only_fields = ["id", "thumb_uri", "look_id", "created_at"]


DAY_HOURS = {
    "type": "object",
    "nullable": True,
    "properties": {"start": {"type": "string"}, "end": {"type": "string"}},
    "required": ["start", "end"],
}


# Schema-only fields: sent exactly as stored, with their shape described. Each is its
# own subclass because extend_schema_field marks the class it decorates.
@extend_schema_field({"type": "array", "items": DAY_HOURS, "minItems": 7, "maxItems": 7})
class WeekField(serializers.JSONField):
    pass


class AvailabilitySerializer(serializers.Serializer):
    # Sunday first; null is a day off, so each day's hours are written out here.
    week = WeekField()
    blocked = serializers.ListField(child=serializers.DateField())


@extend_schema_field(optional(AvailabilitySerializer()))
class AvailabilityField(serializers.JSONField):
    """Whole or not at all: no hours saved yet is left out, never sent as {}."""

    def to_representation(self, value):
        week = (value or {}).get("week")
        if not isinstance(week, list) or len(week) != 7:
            return None
        return {"week": week, "blocked": list(value.get("blocked") or [])}


@extend_schema_field({"type": "integer", "enum": [0, 1, 2]})
class TierField(serializers.IntegerField):
    pass


class StylistProfileSerializer(BlankIsOptional, serializers.ModelSerializer):
    """Full profile for the stylist herself."""

    verification_tier = TierField(read_only=True)
    availability = AvailabilityField(read_only=True)

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



# ── Response shapes, for the schema the app's types are generated from ──────────
class StylistSearchResultSerializer(serializers.Serializer):
    account_id = serializers.CharField()
    handle = serializers.CharField()
    display_name = serializers.CharField()
    avatar_uri = optional(serializers.CharField())
    base_area = serializers.CharField()


class HandleCheckResponseSerializer(serializers.Serializer):
    handle = serializers.CharField()
    available = serializers.BooleanField()
    suggestions = optional(serializers.ListField(child=serializers.CharField()))


class PublicProfileSerializer(StylistProfileSerializer):
    """Her page's profile: no proof photo, payment details or address, plus the checks held."""

    checks = serializers.ListField(
        child=serializers.CharField(), help_text="phone, work, met_in_person, met_on_video, insurance"
    )

    class Meta(StylistProfileSerializer.Meta):
        fields = [
            f
            for f in StylistProfileSerializer.Meta.fields
            if f not in ("proof_photo_uri", "payment_methods", "address")
        ] + ["checks"]


class PageReviewSerializer(serializers.Serializer):
    id = serializers.CharField()
    booking_id = serializers.CharField()
    rating = serializers.IntegerField()
    body = optional(serializers.CharField())
    status = serializers.CharField()
    author_name = serializers.CharField()
    service_name = serializers.CharField()
    created_at = serializers.DateTimeField()


class RatingSerializer(serializers.Serializer):
    average = serializers.FloatField()
    count = serializers.IntegerField()


class TimingLabelSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(choices=["on_time", "early", "over"])
    count = serializers.IntegerField()
    sample = serializers.IntegerField()


class StylistPageResponseSerializer(serializers.Serializer):
    profile = PublicProfileSerializer()
    menu = MenuItemSerializer(many=True)
    photos = PortfolioPhotoSerializer(many=True)
    confirmed_styles = serializers.IntegerField()
    reviews = PageReviewSerializer(many=True)
    rating = optional(RatingSerializer())
    response_hours = optional(serializers.FloatField())
    timing_label = optional(TimingLabelSerializer())


class FreeDaySerializer(serializers.Serializer):
    date = serializers.DateField()
    times = serializers.ListField(child=serializers.DateTimeField())


class FreeSlotsSerializer(serializers.Serializer):
    minutes = serializers.IntegerField()
    days = FreeDaySerializer(many=True)


class WeekCountsSerializer(serializers.Serializer):
    views = serializers.IntegerField()
    requests = serializers.IntegerField()
    confirmed = serializers.IntegerField()
    completed = serializers.IntegerField()
    no_shows = serializers.IntegerField()
    late_cancellations = serializers.IntegerField()
    earned = serializers.FloatField()


class ServiceTimingSerializer(serializers.Serializer):
    service_id = serializers.CharField()
    service_name = serializers.CharField()
    quoted_minutes = optional(serializers.IntegerField())
    typical_minutes = optional(serializers.IntegerField())
    sample = serializers.IntegerField()
    early = serializers.IntegerField()
    on_time = serializers.IntegerField()
    over = serializers.IntegerField()
    client_side = serializers.IntegerField()


class NumbersSerializer(serializers.Serializer):
    week_of = serializers.DateTimeField()
    this_week = WeekCountsSerializer()
    last_week = WeekCountsSerializer()
    timing = ServiceTimingSerializer(many=True)


class StylistSummarySerializer(serializers.Serializer):
    pending_requests = serializers.IntegerField()
    appointments_today = serializers.IntegerField()


class MenuImportRequestSerializer(serializers.Serializer):
    items = MenuItemDraftSerializer(many=True)


class PortfolioAddRequestSerializer(serializers.Serializer):
    photos = serializers.ListField(child=serializers.DictField(), help_text="[{uri, thumbUri?, serviceId?}]")
    post_as_looks = serializers.BooleanField(required=False)


class PortfolioPatchRequestSerializer(serializers.Serializer):
    service_id = serializers.CharField(allow_null=True)
