"""Stylist admin — profiles, verification, menu, portfolio."""

from django.contrib import admin

from .models import MenuItem, PageView, PaymentMethod, PortfolioPhoto, StylistProfile


class PaymentMethodInline(admin.TabularInline):
    model = PaymentMethod
    extra = 0
    max_num = 5


class MenuItemInline(admin.TabularInline):
    model = MenuItem
    extra = 0
    fields = ("name", "price", "from_price", "duration_minutes")


@admin.register(StylistProfile)
class StylistProfileAdmin(admin.ModelAdmin):
    list_display = (
        "handle",
        "display_name",
        "base_area",
        "verification_tier",
        "published",
        "rating_average",
        "confirmed_styles_count",
        "created_at",
    )
    list_filter = ("published", "verification_tier", "service_models")
    search_fields = ("handle", "display_name", "account__email")
    readonly_fields = (
        "confirmed_styles_count",
        "rating_average",
        "rating_count",
        "response_hours",
    )
    inlines = [PaymentMethodInline, MenuItemInline]

    fieldsets = (
        (None, {"fields": ("account", "display_name", "handle", "bio", "avatar_uri")}),
        (
            "Business",
            {
                "fields": (
                    "service_models",
                    "base_area",
                    "travel_radius_miles",
                    "instagram_handle",
                )
            },
        ),
        (
            "Policies",
            {
                "fields": (
                    "notice_hours",
                    "deposit_type",
                    "deposit_amount",
                    "reschedule_free_once",
                )
            },
        ),
        (
            "Verification",
            {"fields": ("proof_photo_uri", "verification_tier", "published")},
        ),
        (
            "Stats",
            {
                "fields": (
                    "confirmed_styles_count",
                    "rating_average",
                    "rating_count",
                    "response_hours",
                )
            },
        ),
    )


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ("name", "stylist", "price", "from_price", "duration_minutes")
    search_fields = ("name", "stylist__handle")


@admin.register(PortfolioPhoto)
class PortfolioPhotoAdmin(admin.ModelAdmin):
    list_display = ("stylist", "service", "look_id", "created_at")


@admin.register(PageView)
class PageViewAdmin(admin.ModelAdmin):
    list_display = ("stylist", "viewer", "viewed_at")
    list_filter = ("viewed_at",)
