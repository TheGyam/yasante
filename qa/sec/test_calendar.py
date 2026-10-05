"""
The calendar file (`.ics`) carries names and an address that other people wrote. A line
break in any of them must stay inside its field, or the writer can add lines of their own
to someone else's calendar: a link, another place, an alarm.
"""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

INJECTED = "URL:https://evil.example/pay-deposit"


@pytest.mark.xfail(strict=True, reason='F26: ics._text() replaces "\\n" with "\\n" (no-op) and ignores "\\r"')
@pytest.mark.parametrize("brk", ["\n", "\r\n"])
def test_a_line_break_in_a_name_stays_inside_its_field(make_user, make_stylist, book, brk):
    from apps.bookings.ics import calendar_url
    from apps.bookings.models import Booking

    efua, ama = make_user(), make_stylist()
    client = APIClient()
    client.force_authenticate(efua)
    r = client.patch(f"/api/users/{efua.pk}/", {"name": f"Efua{brk}{INJECTED}"}, format="json")
    assert r.status_code == 200, r.content  # the API takes the name as written
    booking = Booking.objects.get(pk=book(efua, ama)["id"])
    Booking.objects.filter(pk=booking.pk).update(status="confirmed", scheduled_for=timezone.now() + timedelta(days=2))
    booking.refresh_from_db()
    url = calendar_url(booking, ama.account).split("yasante.com", 1)[-1]
    ics = APIClient().get(url).content.decode()
    lines = ics.splitlines()  # calendar apps break on a bare \n too
    assert INJECTED not in lines and not any(l.startswith("URL:") for l in lines), ics
