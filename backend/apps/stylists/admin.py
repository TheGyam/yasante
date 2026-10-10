"""Stylist admin — profiles, verification, menu, portfolio."""

from django.contrib import admin

from apps.common.admin_access import SuperusersOnly

from django.utils import timezone

from .models import (
    MenuItem,
    PageView,
    PaymentMethod,
    PortfolioPhoto,
    StylistProfile,
    Verification,
    recompute_tier,
)


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
                    # Hidden behind Show, which is logged (apps/staff/privacy.py).
                    "address",
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
class PageViewAdmin(SuperusersOnly, admin.ModelAdmin):
    list_display = ("stylist", "viewer", "viewed_at")
    list_filter = ("viewed_at",)


@admin.register(Verification)
class VerificationAdmin(admin.ModelAdmin):
    """The verification queue: pending checks first. Approving re-derives her tier."""

    list_display = ("created_at", "account", "type", "status", "evidence", "expires_at", "verified_by")
    list_filter = ("status", "type")
    search_fields = ("account__name", "account__email", "evidence")
    actions = ["approve", "reject"]

    def _decide(self, request, queryset, status):
        for check in queryset:
            check.status = status
            check.verified_by = request.user
            check.verified_at = timezone.now() if status == "verified" else None
            check.save(update_fields=["status", "verified_by", "verified_at"])
            if check.type == "phone" and status == "verified":
                check.account.__class__.objects.filter(pk=check.account_id).update(phone_verified=True)
            recompute_tier(check.account_id)

    @admin.action(description="Approve (grants the badge it earns)")
    def approve(self, request, queryset):
        self._decide(request, queryset, "verified")

    @admin.action(description="Reject")
    def reject(self, request, queryset):
        self._decide(request, queryset, "rejected")

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        recompute_tier(obj.account_id)
