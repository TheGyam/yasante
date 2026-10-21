"""Booking admin — booking browser, review moderation, check-ins."""

from django.contrib import admin

from apps.looks.moderation import moderate

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
    actions = ["restore_reviews", "remove_reviews"]

    @admin.action(description="Restore selected reviews")
    def restore_reviews(self, request, queryset):
        for review in queryset:
            moderate(review, "restore", moderator=request.user)

    @admin.action(description="Remove selected reviews")
    def remove_reviews(self, request, queryset):
        for review in queryset:
            moderate(review, "remove", moderator=request.user)


@admin.register(ReviewReport)
class ReviewReportAdmin(admin.ModelAdmin):
    list_display = ("created_at", "review", "reason", "status", "handled_by")
    list_filter = ("status", "reason")
    actions = ["remove_review", "dismiss"]

    @admin.action(description="Remove the reported review")
    def remove_review(self, request, queryset):
        for report in queryset:
            moderate(report.review, "remove", moderator=request.user)

    @admin.action(description="Dismiss (the review stays)")
    def dismiss(self, request, queryset):
        for report in queryset:
            moderate(report.review, "dismiss", moderator=request.user)


@admin.register(CheckIn)
class CheckInAdmin(admin.ModelAdmin):
    list_display = ("booking", "week", "created_at")


@admin.register(SlotInterest)
class SlotInterestAdmin(admin.ModelAdmin):
    list_display = ("client", "stylist_name", "from_date", "to_date", "opened_on")
