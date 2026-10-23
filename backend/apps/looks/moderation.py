"""
Hiding, removing and restoring content, in one place so every action is audited,
its reports are answered, and counts stay true. Used by the admin's actions.
"""

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import Look, LookComment, ModerationAction, Report

RESOLUTIONS = {
    "hide": "Hidden while we look into it",
    "remove": "Removed for breaking the community guidelines",
    "restore": "Reviewed and restored",
    "unpublish": "Page taken down while we look into it",
    "dismiss": "Reviewed: it doesn't break the guidelines",
}


def _author_of(target):
    from apps.bookings.models import Review
    from apps.planner.models import CarePlan, Collection
    from apps.stylists.models import StylistProfile

    if isinstance(target, (Collection, CarePlan)):
        return target.user_id
    if isinstance(target, (Look, LookComment)):
        return target.author_id
    if isinstance(target, Review):
        return target.booking.client_id
    if isinstance(target, StylistProfile):
        return target.account_id
    return None


def _set_status(target, action):
    from apps.bookings.models import Review
    from apps.planner.models import CarePlan, Collection
    from apps.stylists.models import StylistProfile

    if isinstance(target, (Collection, CarePlan)):
        # A shared collection or plan stays its author's: only the sharing stops, and
        # everyone tagging along loses it. She can't share it again unless it's restored.
        if action in ("hide", "remove"):
            target.stop_sharing()
            type(target).objects.filter(pk=target.pk).update(share_blocked=True)
        elif action == "restore":
            type(target).objects.filter(pk=target.pk).update(share_blocked=False)
    elif isinstance(target, (Look, LookComment)):
        status = {"hide": "hidden", "remove": "removed", "restore": "live"}.get(action)
        if status:
            before = target.status
            target.status = status
            target.save(update_fields=["status"])
            if isinstance(target, LookComment) and (before == "live") != (status == "live"):
                # A comment coming or going changes its look's count.
                delta = 1 if status == "live" else -1
                Look.objects.filter(pk=target.look_id).update(comment_count=F("comment_count") + delta)
                Look.objects.filter(pk=target.look_id, comment_count__lt=0).update(comment_count=0)
    elif isinstance(target, Review):
        status = {"hide": "removed", "remove": "removed", "restore": "published"}.get(action)
        if status:
            target.status = status
            target.save(update_fields=["status"])
    elif isinstance(target, StylistProfile):
        if action in ("unpublish", "hide", "remove"):
            target.published = False
            target.save(update_fields=["published"])
        elif action == "restore":
            target.published = True
            target.save(update_fields=["published"])


def _answer_reports(target, moderator, action):
    from apps.bookings.models import Review, ReviewReport

    now = timezone.now()
    outcome = "dismissed" if action in ("dismiss", "restore") else "actioned"
    fields = {
        "status": outcome,
        "handled_by": moderator,
        "handled_at": now,
        "resolution": RESOLUTIONS[action],
    }
    if isinstance(target, Review):
        ReviewReport.objects.filter(review=target, status="open").update(**fields)
    else:
        Report.objects.filter(
            content_type=ContentType.objects.get_for_model(target),
            object_id=target.pk,
            status="open",
        ).update(**fields)


@transaction.atomic
def moderate(target, action, moderator=None, reason=""):
    """Apply one action to a look, comment, review or stylist page. Returns the audit row."""
    if action not in RESOLUTIONS:
        raise ValueError(f"Unknown action {action}")
    if action != "dismiss":
        _set_status(target, action)
    _answer_reports(target, moderator, action)
    return ModerationAction.objects.create(
        moderator=moderator,
        action=action,
        reason=reason or RESOLUTIONS[action],
        content_type=ContentType.objects.get_for_model(target),
        object_id=target.pk,
        author_id=_author_of(target),
    )
