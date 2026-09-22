"""
Profile serializers.
"""

from apps.accounts.serializers import UserSerializer
from rest_framework import serializers

from .models import AnalyticsEvent, ConsentRecord, HairProfile


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
    local_at = serializers.DateTimeField()


class EventBatchSerializer(serializers.Serializer):
    """POST /api/events/"""

    events = EventSerializer(many=True)
    anonymous_id = serializers.CharField(max_length=100, required=False, default="")
