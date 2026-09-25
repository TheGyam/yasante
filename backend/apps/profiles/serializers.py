"""
Profile serializers.
"""

from apps.accounts.serializers import UserSerializer
from rest_framework import serializers

from .models import HairProfile


class HairProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = HairProfile
        exclude = ["id", "user"]


class UserDetailSerializer(UserSerializer):
    """User with nested hair profile."""

    hair_profile = HairProfileSerializer(read_only=True)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ["hair_profile"]


class UserUpdateSerializer(serializers.Serializer):
    """PATCH /api/users/:id/"""

    name = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)
    avatar_uri = serializers.URLField(max_length=500, required=False, allow_blank=True)
    username = serializers.CharField(max_length=31, required=False)

    def validate_email(self, value):
        from apps.accounts.models import User

        value = value.strip().lower()
        user = self.context.get("user")
        if User.objects.filter(email__iexact=value).exclude(pk=getattr(user, "pk", None)).exists():
            raise serializers.ValidationError("Another account already uses that email.")
        return value

    def validate_username(self, value):
        from apps.accounts.usernames import normalise, username_problem

        value = normalise(value)
        problem = username_problem(value, self.context.get("user"))
        if problem:
            raise serializers.ValidationError(problem)
        return value


class ConsentSerializer(serializers.Serializer):
    """Single consent record within a batch."""

    purpose = serializers.CharField(max_length=50)
    granted = serializers.BooleanField()
    policy_version = serializers.CharField(max_length=50)
    recorded_at = serializers.DateTimeField()
    source = serializers.CharField(max_length=50, required=False, default="app")


class ConsentBatchSerializer(serializers.Serializer):
    """POST /api/consents/"""

    consents = ConsentSerializer(many=True)


class EventSerializer(serializers.Serializer):
    """Single analytics event."""

    name = serializers.CharField(max_length=100)
    at = serializers.DateTimeField()
    # Kept as the phone wrote it (see AnalyticsEvent.local_at).
    local_at = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    properties = serializers.DictField(required=False, default=dict)
    app_version = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")


class EventBatchSerializer(serializers.Serializer):
    """POST /api/events/"""

    events = EventSerializer(many=True)
    anonymous_id = serializers.CharField(max_length=100, required=False, default="")


# ── Shapes for the schema the app's types are generated from ─────────────────────
from apps.accounts.serializers import UserResponseSerializer  # noqa: E402
from apps.common.schema import BlankIsOptional, optional  # noqa: E402


class HairProfileResponseSerializer(BlankIsOptional, HairProfileSerializer):
    pass


class UserDetailResponseSerializer(UserResponseSerializer):
    hair_profile = optional(HairProfileResponseSerializer(read_only=True))

    class Meta(UserResponseSerializer.Meta):
        fields = UserResponseSerializer.Meta.fields + ["hair_profile"]


class UsernameCheckSerializer(serializers.Serializer):
    username = serializers.CharField()
    available = serializers.BooleanField()
    reason = optional(serializers.CharField())


class DataExportResponseSerializer(serializers.Serializer):
    requested_at = serializers.DateTimeField()


class PolicySerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["terms", "stylist_terms", "privacy", "guidelines"])
    version = serializers.CharField()
    title = serializers.CharField()
    effective_at = serializers.DateTimeField()
    body = serializers.CharField()


class HairProfileRequestSerializer(serializers.Serializer):
    texture = serializers.CharField(required=False, allow_blank=True)
    length = serializers.CharField(required=False, allow_blank=True)
    shrunk_length = serializers.CharField(required=False, allow_blank=True)
    density = serializers.CharField(required=False, allow_blank=True)
    porosity = serializers.CharField(required=False, allow_blank=True)
    goals = serializers.ListField(child=serializers.CharField(), required=False)
    scalp = serializers.ListField(child=serializers.CharField(), required=False)
    chemicals = serializers.ListField(child=serializers.CharField(), required=False)
    area = serializers.CharField(required=False, allow_blank=True)
    budget = serializers.CharField(required=False, allow_blank=True)
    photo_uri = serializers.CharField(required=False, allow_blank=True)
    length_measured_at = serializers.DateTimeField(required=False, allow_null=True)
    length_cm = serializers.FloatField(required=False, allow_null=True, min_value=1, max_value=200)
    completed_at = serializers.DateTimeField(required=False, allow_null=True)


class HairLogSerializer(serializers.Serializer):
    id = serializers.CharField()
    kind = serializers.ChoiceField(choices=["trim", "wash", "take_down"])
    at = serializers.DateTimeField()
    booking_id = optional(serializers.CharField())


class HairLogRequestSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["trim", "wash", "take_down"])
    at = serializers.DateTimeField(required=False, help_text="When it happened; now if left out")
    local_at = serializers.CharField(required=False, help_text="The phone's own clock, ISO without offset")
    booking_id = serializers.UUIDField(required=False)
