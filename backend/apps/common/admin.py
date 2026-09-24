from django.contrib import admin

from .models import Media, SearchLog


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    """Uploads, with near-duplicate flags (possible stolen portfolios) up front."""

    list_display = ("created_at", "owner", "kind", "visibility", "moderation_status", "duplicate_of", "width", "height")
    list_filter = ("moderation_status", "kind", "visibility", "source")
    search_fields = ("owner__name", "owner__email", "phash")
    readonly_fields = ("phash", "width", "height", "full_path", "feed_path", "thumb_path", "duplicate_of")
    actions = ["clear_flag", "remove"]

    @admin.action(description="Not a duplicate: clear the flag")
    def clear_flag(self, request, queryset):
        queryset.update(moderation_status="ok")

    @admin.action(description="Delete the photo and its files")
    def remove(self, request, queryset):
        for media in queryset:
            media.delete()


@admin.register(SearchLog)
class SearchLogAdmin(admin.ModelAdmin):
    """What people search for: zero-result searches are the recruiting list."""

    list_display = ("created_at", "surface", "query", "filters", "result_count", "user")
    list_filter = ("surface",)
    search_fields = ("query",)

    def has_add_permission(self, request):
        return False
