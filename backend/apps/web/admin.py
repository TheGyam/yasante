from django.contrib import admin

from .models import WaitlistEntry


@admin.register(WaitlistEntry)
class WaitlistEntryAdmin(admin.ModelAdmin):
    list_display = ("email", "role", "area", "source", "created_at")
    list_filter = ("role",)
    search_fields = ("email", "area")
