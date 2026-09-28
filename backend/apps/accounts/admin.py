"""
Account admin — user management, invite management.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import DeviceToken, EmailChallenge, Invite, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "email",
        "name",
        "email_verified",
        "roles_display",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active", "is_staff", "email_verified", "roles")
    # Set by signing in with Apple or Google, and by the phone: not typed here.
    readonly_fields = ("apple_id", "google_id", "time_zone")
    search_fields = ("email", "name", "phone")
    ordering = ("-created_at",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal", {"fields": ("name", "username", "email_verified", "avatar_uri", "time_zone")}),
        (
            "Stylist checks",
            {
                "description": "Only for stylists: tick after checking their phone yourself (a call "
                "or video). It earns the “Phone and work checked” badge. Not needed for clients.",
                "fields": ("phone", "phone_verified"),
            },
        ),
        ("Signed in with", {"fields": ("apple_id", "google_id")}),
        ("Roles", {"fields": ("roles", "age_confirmed", "policy_version")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Dates", {"fields": ("last_login",)}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "name", "password1", "password2", "roles"),
            },
        ),
    )

    actions = ["mark_phone_checked"]

    @admin.action(description="Mark phone as checked (after a call or video check)")
    def mark_phone_checked(self, request, queryset):
        """Phone verification by hand while texts aren't sent: counts towards her badge."""
        from apps.stylists.models import record_check

        done = 0
        for user in queryset.exclude(phone=""):
            user.phone_verified = True
            user.save(update_fields=["phone_verified"])
            record_check(user.pk, "phone", evidence=user.phone, by=request.user)
            done += 1
        skipped = queryset.count() - done
        self.message_user(request, f"Phone checked: {done}" + (f"; {skipped} had no number" if skipped else ""))

    @admin.display(description="Roles")
    def roles_display(self, obj):
        return ", ".join(obj.roles) if obj.roles else "—"


@admin.register(Invite)
class InviteAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "role",
        "invited_by",
        "expires_at",
        "redeemed_by",
        "redeemed_at",
    )
    list_filter = ("role",)
    search_fields = ("code", "invited_by")
    readonly_fields = ("redeemed_by", "redeemed_at", "created_at")


@admin.register(EmailChallenge)
class EmailChallengeAdmin(admin.ModelAdmin):
    list_display = ("user", "email", "attempts", "expires_at", "created_at")
    readonly_fields = ("code_hash",)


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "platform", "created_at")
    list_filter = ("platform",)
