"""Planner admin."""

from django.contrib import admin

from .models import CarePlan, CarePlanSession, CarePlanStep, Collection, CollectionItem


class CollectionItemInline(admin.TabularInline):
    model = CollectionItem
    extra = 0
    fields = ("kind", "ref_id", "title")


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "created_at")
    search_fields = ("name", "user__name", "user__email")
    inlines = [CollectionItemInline]


class CarePlanStepInline(admin.TabularInline):
    model = CarePlanStep
    extra = 0
    fields = ("text", "sort_order")


@admin.register(CarePlan)
class CarePlanAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "frequency", "last_done_at")
    search_fields = ("name", "user__name", "user__email")
    inlines = [CarePlanStepInline]


@admin.register(CarePlanSession)
class CarePlanSessionAdmin(admin.ModelAdmin):
    list_display = ("plan", "user", "completed_at")
    search_fields = ("plan__name", "user__name", "notes")
    ordering = ("-completed_at",)
