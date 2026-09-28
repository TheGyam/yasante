"""
A confirmed appointment as a calendar file (.ics), for "Add to calendar" on an iPhone:
Safari opens it in the phone's own "Add to Calendar" screen, with no app permission
and no native module. The link is signed for one booking and one person, so it can be
opened without signing in and can't be guessed.
"""

from datetime import timezone as dt_timezone

from django.conf import settings
from django.core import signing
from django.http import Http404, HttpResponse
from django.utils import timezone

SALT = "booking-calendar"


def calendar_url(booking, viewer):
    token = signing.dumps({"b": str(booking.pk), "u": str(viewer.pk)}, salt=SALT, compress=True)
    base = (settings.PUBLIC_BASE_URL or "https://api.yasante.com").rstrip("/")
    return f"{base}/api/bookings/calendar/{token}.ics"


def _text(value):
    """iCalendar text: commas, semicolons and backslashes escaped, one line."""
    return (
        str(value or "")
        .replace("\\", "\\\\")
        .replace(";", "\;")
        .replace(",", "\,")
        .replace("\n", "\n")
    )


def _utc(dt):
    return dt.astimezone(dt_timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def calendar_file(request, token):
    from datetime import timedelta

    from .models import Booking

    try:
        data = signing.loads(token, salt=SALT)
    except signing.BadSignature:
        raise Http404
    booking = Booking.objects.filter(pk=data.get("b")).first()
    if booking is None or not booking.scheduled_for or booking.status not in ("confirmed", "completed"):
        raise Http404
    if str(data.get("u")) not in (str(booking.client_id), str(booking.stylist_id)):
        raise Http404
    as_stylist = str(data.get("u")) == str(booking.stylist_id)
    start = booking.scheduled_for
    end = start + timedelta(minutes=booking.duration_minutes or 120)
    who = (booking.client_name or "Client") if as_stylist else booking.stylist_name
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Yasante//Bookings//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{booking.pk}@yasante.com",
        f"DTSTAMP:{_utc(timezone.now())}",
        f"DTSTART:{_utc(start)}",
        f"DTEND:{_utc(end)}",
        f"SUMMARY:{_text(f'{booking.service_name} with {who}')}",
        f"LOCATION:{_text(booking.address or booking.area)}",
        "DESCRIPTION:Booked on Yasante",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    response = HttpResponse("\r\n".join(lines) + "\r\n", content_type="text/calendar; charset=utf-8")
    response["Content-Disposition"] = 'inline; filename="yasante-appointment.ics"'
    return response
