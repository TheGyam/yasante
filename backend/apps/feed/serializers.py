from rest_framework import serializers

from .models import FeedEvent


class FeedEventSerializer(serializers.Serializer):
    session = serializers.RegexField(r"^[A-Za-z0-9_-]{8,40}$")
    surface = serializers.ChoiceField(choices=[value for value, _ in FeedEvent.SURFACE_CHOICES])
    look_id = serializers.UUIDField()
    kind = serializers.ChoiceField(choices=[value for value, _ in FeedEvent.KIND_CHOICES])
    position = serializers.IntegerField(min_value=0, max_value=10000, required=False)
    source = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    # An hour is plenty: anything longer is a phone left open on the look.
    ms = serializers.IntegerField(min_value=0, max_value=3_600_000, required=False)


class FeedEventBatchSerializer(serializers.Serializer):
    """POST /api/feed/events/"""

    events = serializers.ListField(child=FeedEventSerializer(), max_length=100)
