"""Shelf admin."""

from django.contrib import admin

from .models import Product, ShelfItem


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Members' additions arrive 'Awaiting review': approve to show them to everyone."""

    list_display = ("brand", "name", "category", "status", "source", "added_by", "barcode")
    search_fields = ("brand", "name", "category", "barcode")
    list_filter = ("status", "source", "category")
    raw_id_fields = ("added_by",)
    actions = ["approve", "reject"]

    @admin.action(description="Approve: show to everyone")
    def approve(self, request, queryset):
        self.message_user(request, f"{queryset.update(status='live')} approved.")

    @admin.action(description="Reject: keep out of the catalogue")
    def reject(self, request, queryset):
        self.message_user(request, f"{queryset.update(status='rejected')} rejected.")


@admin.register(ShelfItem)
class ShelfItemAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "status", "rating", "times_bought")
    search_fields = ("product__name", "user__name", "user__email")
    list_filter = ("status", "rating")
