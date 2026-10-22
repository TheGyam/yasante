from django.contrib import admin

from apps.common.admin_access import SuperusersOnly

from .models import FeedEvent, FeedWeights


@admin.register(FeedEvent)
class FeedEventAdmin(SuperusersOnly, admin.ModelAdmin):
    list_display = ("kind", "surface", "user", "look", "position", "source", "created_at")
    list_filter = ("kind", "surface", "source")
    ordering = ("-created_at",)


@admin.register(FeedWeights)
class FeedWeightsAdmin(SuperusersOnly, admin.ModelAdmin):
    list_display = ("created_at", "impressions")
    readonly_fields = ("weights", "metrics", "impressions", "created_at")
