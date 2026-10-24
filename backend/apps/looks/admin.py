"""
Looks admin: the report queue, content moderation, appeals, blocks, style taxonomy.
Every hide, remove or restore goes through apps.looks.moderation, so it's audited
and the reports on it are answered.
"""

from django.contrib import admin, messages
from django.utils import timezone

from .models import Appeal, Block, Look, LookComment, LookLike, LookPhoto, ModerationAction, Report, Style
from .moderation import moderate, tell_author


def _moderate_selected(modeladmin, request, queryset, action):
    done = 0
    for obj in queryset:
        target = obj.content_object if isinstance(obj, Report) else obj
        if target is None:
            continue
        moderate(target, action, moderator=request.user)
        done += 1
    modeladmin.message_user(request, f"{action.title()}: {done}", messages.SUCCESS)


@admin.register(Style)
class StyleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "sort_order")
    prepopulated_fields = {"slug": ("name",)}


class LookPhotoInline(admin.TabularInline):
    model = LookPhoto
    extra = 0
    can_delete = False
    readonly_fields = ("position", "photo_uri", "thumb_uri", "feed_uri", "aspect", "created_at")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Look)
class LookAdmin(admin.ModelAdmin):
    inlines = [LookPhotoInline]
    list_display = ("author", "caption", "status", "visibility", "like_count", "comment_count", "created_at")
    list_filter = ("status", "visibility", "type")
    search_fields = ("author__name", "caption")
    actions = ["hide", "remove", "restore"]

    @admin.action(description="Hide (the author can appeal)")
    def hide(self, request, queryset):
        _moderate_selected(self, request, queryset, "hide")

    @admin.action(description="Remove")
    def remove(self, request, queryset):
        _moderate_selected(self, request, queryset, "remove")

    @admin.action(description="Restore")
    def restore(self, request, queryset):
        _moderate_selected(self, request, queryset, "restore")


@admin.register(LookComment)
class LookCommentAdmin(LookAdmin):
    inlines = []
    list_display = ("author", "look", "body", "status", "like_count", "created_at")
    list_filter = ("status",)
    search_fields = ("body", "author__name")


class ReportStatusFilter(admin.SimpleListFilter):
    title = "status"
    parameter_name = "queue_status"

    def lookups(self, request, model_admin):
        return [("all", "All statuses"), *Report.QUEUE_CHOICES]

    def queryset(self, request, queryset):
        if "status__exact" in request.GET:
            return queryset
        value = self.value() or "open"
        return queryset if value == "all" else queryset.filter(status=value)

    def choices(self, changelist):
        selected = self.value() or changelist.params.get("status__exact", "open")
        for value, label in self.lookup_choices:
            yield {"selected": selected == value, "display": label,
                   "query_string": changelist.get_query_string({self.parameter_name:value}, ["status__exact"])}


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    """The queue: open reports first; one click acts on the reported thing."""

    list_display = ("created_at", "reason", "content_type", "object_id", "status", "handled_by")
    list_filter = (ReportStatusFilter, "reason", "content_type")
    search_fields = ("note",)
    readonly_fields = ("handled_by", "handled_at")
    actions = ["hide_target", "remove_target", "dismiss"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("content_type", "handled_by")

    @admin.action(description="Hide what was reported")
    def hide_target(self, request, queryset):
        _moderate_selected(self, request, queryset, "hide")

    @admin.action(description="Remove what was reported")
    def remove_target(self, request, queryset):
        _moderate_selected(self, request, queryset, "remove")

    @admin.action(description="Dismiss (it doesn't break the guidelines)")
    def dismiss(self, request, queryset):
        _moderate_selected(self, request, queryset, "dismiss")


@admin.register(ModerationAction)
class ModerationActionAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "content_type", "object_id", "author", "moderator", "reason")
    list_filter = ("action", "content_type")
    readonly_fields = [f.name for f in ModerationAction._meta.fields]

    def has_add_permission(self, request):
        return False  # The audit trail is written by actions, never by hand.


@admin.register(Appeal)
class AppealAdmin(admin.ModelAdmin):
    list_display = ("created_at", "author", "action", "status", "decided_by")
    list_filter = ("status",)
    actions = ["uphold", "overturn"]

    def _decide(self, request, queryset, status):
        for appeal in queryset.filter(status="open"):
            if status == "overturned" and appeal.action.target is not None:
                moderate(appeal.action.target, "restore", moderator=request.user, reason="Appeal upheld")
            appeal.status = status
            appeal.decided_by = request.user
            appeal.decided_at = timezone.now()
            appeal.save(update_fields=["status", "decided_by", "decided_at"])
            if status == "upheld":  # overturned, the restore tells her itself
                tell_author(appeal.author_id, "We looked at your appeal", f"The decision stands: {appeal.action.reason.rstrip('.')}.", f"appeal:{appeal.pk}")

    @admin.action(description="Keep the action (appeal refused)")
    def uphold(self, request, queryset):
        self._decide(request, queryset, "upheld")

    @admin.action(description="Overturn and restore the content")
    def overturn(self, request, queryset):
        self._decide(request, queryset, "overturned")


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ("blocker", "blocked", "created_at")


@admin.register(LookLike)
class LookLikeAdmin(admin.ModelAdmin):
    list_display = ("user", "look", "created_at")
