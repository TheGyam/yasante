"""
Account admin — user management, invite management.
"""

from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm

from rest_framework_simplejwt.token_blacklist.admin import OutstandingTokenAdmin
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from .models import DeviceToken, EmailChallenge, Invite, User


class UserForm(UserChangeForm):
    """
    Django's username field can't be left empty when the column allows null (it measures
    None and crashes), and most people here have no username. A plain optional field
    saves an empty one as null, which keeps the unique constraint happy.
    """

    username = forms.CharField(max_length=30, required=False, empty_value=None)

    class Meta(UserChangeForm.Meta):
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserForm
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
    # The token lets anyone holding our push keys message that phone; nobody reads it.
    exclude = ("token",)
    list_filter = ("platform",)


# Sign-in sessions. The refresh token itself is a live credential: shown to nobody,
# exported by nobody. Staff see whose session it is and when it ends, and can end it.
admin.site.unregister(OutstandingToken)


@admin.register(OutstandingToken)
class SessionAdmin(OutstandingTokenAdmin):
    exclude = ("token",)
    actions = ["end_sessions"]

    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.fields if field.name != "token"]

    def get_actions(self, request):
        # The library turns actions off; this one is safe and is what staff need.
        return admin.ModelAdmin.get_actions(self, request)

    @admin.action(description="End these sessions (they sign in again)", permissions=["view"])
    def end_sessions(self, request, queryset):
        from .sessions import end

        for token in queryset:
            BlacklistedToken.objects.get_or_create(token=token)
        end(queryset.values_list("jti", flat=True))
        self.message_user(request, f"Ended {queryset.count()} sessions.")
