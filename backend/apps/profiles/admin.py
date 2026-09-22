"""Profile admin."""

from django.contrib import admin

from .models import AnalyticsEvent, ConsentRecord, HairProfile, HairProfileSnapshot


@admin.register(HairProfile)
class HairProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "texture", "length", "density", "completed_at")
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
class AnalyticsEventAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "at", "anonymous_id")
    list_filter = ("name",)
    ordering = ("-at",)
