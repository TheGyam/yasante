from django.contrib import admin

from .models import Broadcast


@admin.register(Broadcast)
class BroadcastAdmin(admin.ModelAdmin):
    """Sent from the workspace's Push notifications page; here as a read-only record."""

    list_display = ("created_at", "kind", "title", "audience_summary", "recipients", "sent_by")
    list_filter = ("kind",)
    readonly_fields = [field.name for field in Broadcast._meta.fields]

    def has_change_permission(self, request, obj=None):
        return False
