"""Looks admin — look browser, comment moderation, report queue, blocks, style taxonomy."""

from django.contrib import admin

from .models import Block, CommentLike, Look, LookComment, LookLike, Report, Style


@admin.register(Style)
class StyleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "sort_order")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Look)
class LookAdmin(admin.ModelAdmin):
    list_display = (
        "author",
        "visibility",
        "like_count",
        "comment_count",
        "save_count",
        "created_at",
    )
    list_filter = ("visibility",)
    search_fields = ("author__name", "caption")


@admin.register(LookComment)
class LookCommentAdmin(admin.ModelAdmin):
    list_display = ("author", "look", "body", "like_count", "created_at")
    search_fields = ("body", "author__name")


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("reporter", "reason", "content_type", "object_id", "created_at")
    list_filter = ("reason", "content_type")
    search_fields = ("note",)


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ("blocker", "blocked", "created_at")
    search_fields = ("blocker__name", "blocked__name")


@admin.register(LookLike)
class LookLikeAdmin(admin.ModelAdmin):
    list_display = ("user", "look", "created_at")
