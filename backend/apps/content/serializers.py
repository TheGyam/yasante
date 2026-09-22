"""
Content serializers.
"""

from rest_framework import serializers

from .models import ContentItem


class ContentItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentItem
        fields = [
            "id",
            "title",
            "slug",
            "kind",
            "cover_uri",
            "video_uri",
            "body",
            "texture_tags",
            "porosity_tags",
            "topic_tags",
            "read_time_minutes",
            "created_at",
        ]
        read_only_fields = fields
