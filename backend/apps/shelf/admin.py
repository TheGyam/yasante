"""Shelf admin."""

from django.contrib import admin

from .models import Product, ShelfItem


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("brand", "name", "category")
    search_fields = ("brand", "name", "category")
    list_filter = ("category", "brand")


@admin.register(ShelfItem)
class ShelfItemAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "status", "rating", "times_bought")
    search_fields = ("product__name", "user__name", "user__email")
    list_filter = ("status", "rating")
