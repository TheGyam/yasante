"""
Account admin — user management, invite management.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import DeviceToken, Invite, PhoneChallenge, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "email",
        "name",
        "phone",
        "phone_verified",
        "roles_display",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active", "is_staff", "phone_verified", "roles")
    search_fields = ("email", "name", "phone")
    ordering = ("-created_at",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal", {"fields": ("name", "phone", "phone_verified", "avatar_uri")}),
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


@admin.register(PhoneChallenge)
class PhoneChallengeAdmin(admin.ModelAdmin):
    list_display = ("user", "phone", "attempts", "expires_at", "created_at")
    readonly_fields = ("code_hash",)


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "platform", "created_at")
    list_filter = ("platform",)
