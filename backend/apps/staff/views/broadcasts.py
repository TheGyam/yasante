import json
import re

from django.core.exceptions import BadRequest, PermissionDenied
from django.db import transaction
from django.db.models import Count, Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods, require_POST

from apps.common.models import NotificationLog
from apps.common.notifications import notify

from ..access import staff_data
from ..broadcasts import CATEGORY, clean, news_too_soon, reach, reachable, send_broadcast, summary
from ..models import Broadcast
from ..privacy import log_access

IN_APP_PATH = re.compile(r"^/[A-Za-z0-9/_\-?=&.%]*$")


def allowed(request):
    if not request.user.has_perm("staff.add_broadcast"):
        raise PermissionDenied


def message(request):
    """The message and audience from the composer, checked."""
    try:
        payload = json.loads(request.POST.get("payload", "{}"))
    except ValueError:
        raise BadRequest
    kind = payload.get("kind")
    title = str(payload.get("title", "")).strip()
    body = str(payload.get("body", "")).strip()
    url = str(payload.get("url", "")).strip()
    if kind not in CATEGORY:
        raise BadRequest("Choose what kind of message this is.")
    if url and (not IN_APP_PATH.match(url) or url.startswith("//")):
        raise BadRequest("The link must be a page in the app, starting with /, like /looks.")
    return kind, title[:65], body[:180], url[:200], clean(payload.get("audience") or {})


def delivery(broadcast):
    counts = NotificationLog.objects.filter(event_key__startswith=broadcast.event_prefix).aggregate(
        sent=Count("pk", filter=Q(status="sent")),
        failed=Count("pk", filter=Q(status="failed")),
        waiting=Count("pk", filter=Q(status="queued")),
        noDevice=Count("pk", filter=Q(status="no_device")),
    )
    return counts


@staff_data
@require_http_methods(["GET"])
def history(request):
    if not (request.user.has_perm("staff.view_broadcast") or request.user.has_perm("staff.add_broadcast")):
        raise PermissionDenied
    items = []
    for broadcast in Broadcast.objects.select_related("sent_by")[:30]:
        items.append({
            "id": broadcast.pk, "kind": broadcast.kind, "title": broadcast.title, "body": broadcast.body,
            "url": broadcast.url, "audience": broadcast.audience_summary, "recipients": broadcast.recipients,
            "sentBy": broadcast.sent_by.name if broadcast.sent_by else "", "at": broadcast.created_at.isoformat(),
            "finished": broadcast.finished_at is not None, **delivery(broadcast),
        })
    return {"items": items, "canSend": request.user.has_perm("staff.add_broadcast"), "newsTooSoon": bool(news_too_soon())}


@staff_data
@csrf_protect
@require_POST
def audience(request):
    allowed(request)
    kind, _, _, _, spec = message(request)
    return {**reach(spec, kind), "summary": summary(spec)}


@staff_data
@csrf_protect
@require_POST
def test(request):
    """To your own phones only, whatever you've switched on, so you see it as they will."""
    allowed(request)
    kind, title, body, url, _ = message(request)
    if not title or not body:
        raise BadRequest("Write a title and a message first.")
    if not request.user.devices.exists():
        return JsonResponse({"message": "Your account has no phone signed in to the app, so there's nowhere to send a test."}, status=400)
    notify(request.user.pk, "account", f"broadcast-test:{request.user.pk}:{timezone.now().timestamp()}", title, body, **({"url": url} if url else {}))
    return {"sent": True}


@staff_data
@csrf_protect
@require_POST
def send(request):
    allowed(request)
    kind, title, body, url, spec = message(request)
    if not title or not body:
        raise BadRequest("Write a title and a message first.")
    if kind == "news" and news_too_soon():
        return JsonResponse({"message": "A news message went out in the last day. People turn notifications off when they get too many, so wait until tomorrow."}, status=409)
    count = reachable(spec, kind).count()
    if not count:
        return JsonResponse({"message": "Nobody in this audience can receive it yet."}, status=400)
    # The number they confirmed must still be right: an audience can grow while they write.
    if request.POST.get("expected") != str(count):
        return JsonResponse({"message": f"The audience changed: it now reaches {count}. Check and send again.", "reachable": count}, status=409)
    with transaction.atomic():
        broadcast = Broadcast.objects.create(
            kind=kind, title=title, body=body, url=url, audience=spec, audience_summary=summary(spec),
            recipients=count, sent_by=request.user,
        )
        log_access(request, Broadcast, f"Sent a push notification to {count} people: {title}", broadcast)
        transaction.on_commit(lambda: send_broadcast.delay(broadcast.pk))
    return {"done": True, "id": broadcast.pk, "recipients": count}
