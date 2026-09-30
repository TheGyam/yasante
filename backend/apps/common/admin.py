from django.contrib import admin

from .models import ClientError, ErrorIssue, Media, SearchLog
from django.contrib.admin.models import LogEntry


@admin.register(LogEntry)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ("action_time", "user", "object_repr", "change_message")
    list_filter = ("user", "action_flag")
    readonly_fields = [f.name for f in LogEntry._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(ErrorIssue)
class ErrorIssueAdmin(admin.ModelAdmin):
    list_display = ("title", "platform", "status", "count", "last_seen")
    list_filter = ("platform", "status", "app_version")
    search_fields = ("title",)
    readonly_fields = ("fingerprint", "count", "users_affected", "first_seen", "last_seen", "platform", "app_version")


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


@admin.register(ClientError)
class ClientErrorAdmin(admin.ModelAdmin):
    list_display = ("created_at", "kind", "platform", "os_version", "app_version", "message")
    list_filter = ("kind", "platform", "app_version")
    search_fields = ("message", "stack")
    readonly_fields = [f.name for f in ClientError._meta.fields]
