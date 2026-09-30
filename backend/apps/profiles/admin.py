"""Profile admin."""

from django.contrib import admin

from apps.common.admin_access import SuperusersOnly

from .models import (
    AnalyticsEvent,
    ConsentRecord,
    HairProfile,
    HairProfileSnapshot,
    PolicyDocument,
)


@admin.register(HairProfile)
class HairProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "texture", "length", "density", "completed_at")
    # Where someone lives, to the metre, is for matching stylists nearby, not for reading.
    exclude = ("latitude", "longitude")
    search_fields = ("user__name", "user__email")
    list_filter = ("texture", "density")


@admin.register(HairProfileSnapshot)
class HairProfileSnapshotAdmin(admin.ModelAdmin):
    list_display = ("user", "texture", "length", "recorded_at")
    list_filter = ("texture",)
    ordering = ("-recorded_at",)


@admin.register(ConsentRecord)
class ConsentRecordAdmin(admin.ModelAdmin):
    list_display = ("user", "purpose", "granted", "policy_version", "recorded_at")
    list_filter = ("purpose", "granted")
    ordering = ("-recorded_at",)


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(SuperusersOnly, admin.ModelAdmin):
    list_display = ("name", "user", "at", "anonymous_id")
    list_filter = ("name",)
    ordering = ("-at",)


@admin.register(PolicyDocument)
class PolicyDocumentAdmin(admin.ModelAdmin):
    """Publish a policy by adding a version; the newest effective one is current."""

    list_display = ("type", "version", "effective_at", "published", "created_at")
    list_filter = ("type", "published")
