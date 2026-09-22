"""Content admin."""

from django.contrib import admin

from .models import ContentItem


@admin.register(ContentItem)
class ContentItemAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "published", "created_at")
    list_filter = ("kind", "published")
    search_fields = ("title", "body")
    prepopulated_fields = {"slug": ("title",)}
