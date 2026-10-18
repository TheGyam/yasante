"""Feature switches admin: Yaw flips these to turn a feature on or off."""

from django.contrib import admin

from .models import Switch


@admin.register(Switch)
class SwitchAdmin(admin.ModelAdmin):
    list_display = ("key", "mode", "percent", "updated_at")
    list_editable = ("mode", "percent")
    filter_horizontal = ("users",)
    search_fields = ("key",)
    readonly_fields = ("updated_at", "updated_by")

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def save_model(self, request, obj, form, change):
        # Also runs for a quick edit from the changelist (list_editable), not only the full form.
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)
