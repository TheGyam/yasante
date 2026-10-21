from django.contrib import admin

from apps.common.admin_access import SuperusersOnly

from .models import FeedEvent


@admin.register(FeedEvent)
class FeedEventAdmin(SuperusersOnly, admin.ModelAdmin):
    list_display = ("kind", "surface", "user", "look", "position", "source", "created_at")
    list_filter = ("kind", "surface", "source")
    ordering = ("-created_at",)
