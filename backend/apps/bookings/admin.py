"""Booking admin — booking browser, review moderation, check-ins."""

from django.contrib import admin

from .models import Booking, CheckIn, Review, ReviewReport, SlotInterest


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "status",
        "client_name",
        "stylist_name",
        "service_name",
        "scheduled_for",
        "price",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = ("client_name", "stylist_name", "service_name")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("booking", "rating", "author_name", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("author_name", "body")
    actions = ["publish_reviews", "remove_reviews"]

    @admin.action(description="Publish selected reviews")
    def publish_reviews(self, request, queryset):
        queryset.update(status="published")

    @admin.action(description="Remove selected reviews")
    def remove_reviews(self, request, queryset):
        queryset.update(status="removed")


@admin.register(ReviewReport)
class ReviewReportAdmin(admin.ModelAdmin):
    list_display = ("review", "reporter", "reason", "created_at")
    list_filter = ("reason",)


@admin.register(CheckIn)
class CheckInAdmin(admin.ModelAdmin):
    list_display = ("booking", "week", "holding", "scalp", "again", "created_at")


@admin.register(SlotInterest)
class SlotInterestAdmin(admin.ModelAdmin):
    list_display = ("client", "stylist_name", "from_date", "to_date", "opened_on")
