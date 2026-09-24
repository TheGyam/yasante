"""Shapes for the schema the app's types are generated from (see compat.py)."""

from rest_framework import serializers

from apps.common.schema import optional

from .models import ContentItem


class ContentResponseSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    description = optional(serializers.CharField())
    type = serializers.ChoiceField(choices=["article", "video"])
    topic = serializers.ChoiceField(choices=ContentItem.TOPIC_CHOICES)
    hair_types = serializers.ListField(child=serializers.CharField())
    thumbnail_uri = optional(serializers.CharField())
    video_uri = optional(serializers.CharField())
    article_content = optional(serializers.CharField())
    duration = optional(serializers.IntegerField())
    author = optional(serializers.CharField())
    published_at = serializers.DateTimeField()


class FavoriteResponseSerializer(serializers.Serializer):
    id = serializers.CharField()
    user_id = serializers.CharField()
    content_id = serializers.CharField()
    created_at = serializers.DateTimeField()


class FavoriteStateSerializer(serializers.Serializer):
    is_favorite = serializers.BooleanField()
    favorite = optional(FavoriteResponseSerializer())


class FavoriteToggleRequestSerializer(serializers.Serializer):
    content_id = serializers.CharField()
