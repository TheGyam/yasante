from datetime import datetime, time, timedelta, date
from zoneinfo import ZoneInfo
import hashlib
from django.core.cache import cache
from django.core.exceptions import BadRequest, PermissionDenied
from django.http import Http404
from django.utils import timezone
from django.views.decorators.http import require_GET
from ..access import staff_data, visible_admins
from ..insights import SOURCES, calculate


@staff_data
@require_GET
def insight(request, name):
    if name not in SOURCES:
        raise Http404
    # Money, and the research report, are for superusers only.
    if name in ("money", "top-stylists", "hair-trends", "feed") and not request.user.is_superuser:
        raise PermissionDenied
    admins = visible_admins(request)
    if any(key not in admins for key in SOURCES[name]):
        raise PermissionDenied
    today = timezone.now().astimezone(ZoneInfo("Europe/London")).date()
    try:
        first = date.fromisoformat(request.GET.get("from", (today-timedelta(days=29)).isoformat()))
        last = date.fromisoformat(request.GET.get("to", today.isoformat()))
        if not 0 <= (last-first).days <= 366:
            raise ValueError
    except ValueError:
        raise BadRequest("Choose a date range of up to 12 months.")
    start, end = (datetime.combine(day, time.min, ZoneInfo("Europe/London")) for day in (first, last+timedelta(days=1)))
    compare = request.GET.get("compare") == "1"
    currency = request.GET.get("currency", "").upper()
    currency = currency if len(currency) == 3 and currency.isalpha() else None
    key = "staff:insight:" + hashlib.sha256(f"{request.user.pk}:{name}:{first}:{last}:{compare}:{currency}".encode()).hexdigest()
    result = cache.get(key)
    if result is None:
        sources = {key: admins[key].get_queryset(request) for key in SOURCES[name]}
        result = calculate(name, sources, start, end, currency)
        result.update({"from": str(first), "to": str(last), "previous": None})
        if compare:
            days = (last-first).days+1
            previous_start = datetime.combine(first-timedelta(days=days), time.min, ZoneInfo("Europe/London"))
            result["previous"] = calculate(name, sources, previous_start, start, result["meta"].get("currency") or currency)["rows"]
        cache.set(key, result, 300)
    return result
