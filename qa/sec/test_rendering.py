"""
The HTML Django writes for yasante.com: title, meta tags, JSON-LD and the page data.
qaweb can't see this layer locally (Vite serves the pages there), so it is checked here,
with the same canaries SEC-01 plants. Text people wrote must stay text: no tag, no event
handler, no way out of a <script>.
"""

import json
from datetime import timedelta
from html.parser import HTMLParser

import pytest
from django.utils import timezone


def canary(code):
    return (
        f"X{code} <img src=//canary.invalid/{code}m onerror=fetch('//canary.invalid/{code}j')> "
        f"\"><svg onload=fetch('//canary.invalid/{code}a')> "
        f"</script><script>fetch('//canary.invalid/{code}s')</script>"
    )


class Audit(HTMLParser):
    """Collects every way a canary could have become markup."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.problems, self.scripts, self._script = [], [], None

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if "canary.invalid" in (value or "") and (name.startswith("on") or name in ("src", "href", "srcset")):
                self.problems.append(f"<{tag} {name}={value[:80]!r}>")
        if tag == "svg" and any("canary" in (v or "") for _, v in attrs):
            self.problems.append(f"<svg> from user text: {attrs}")
        if tag == "script":
            self._script = dict(attrs).get("type", "")

    def handle_endtag(self, tag):
        if tag == "script":
            self._script = None

    def handle_data(self, data):
        if self._script is None:
            return
        self.scripts.append((self._script, data))
        if "canary.invalid" in data and self._script not in ("application/ld+json", "application/json"):
            self.problems.append(f"script ({self._script or 'js'}) runs user text: {data[:80]!r}")


@pytest.fixture
def planted(make_user, make_stylist, make_look, book):
    from apps.bookings.models import Booking, Review

    ama = make_stylist(bio=canary("C02"))
    type(ama).objects.filter(pk=ama.pk).update(display_name=canary("C01")[:150])
    ama.refresh_from_db()
    efua = make_user(name=canary("C07")[:150])
    look = make_look(efua, stylist=ama, caption=canary("C06"))
    booking = Booking.objects.get(pk=book(efua, ama)["id"])
    Booking.objects.filter(pk=booking.pk).update(status="completed", completed_at=timezone.now(),
                                                 scheduled_for=timezone.now() - timedelta(days=1))
    Review.objects.create(booking=booking, rating=5, body=canary("C08"), author_name=canary("C09")[:150],
                          service_name="Knotless braids", status="published")
    return {"ama": ama, "look": look}


@pytest.mark.parametrize("page", ["stylist", "look", "looks", "style", "area"])
def test_user_text_stays_text_in_server_html(client, planted, page):
    ama, look = planted["ama"], planted["look"]
    path = {"stylist": f"/{ama.handle}", "look": f"/looks/{look.pk}", "looks": "/looks",
            "style": "/styles/knotless", "area": "/areas/peckham"}[page]
    r = client.get(path, HTTP_HOST="localhost")
    assert r.status_code in (200, 404), (path, r.status_code)
    html = r.content.decode()
    if page in ("stylist", "look"):
        assert "XC0" in html, f"{path}: the canaries never reached the page, so this proves nothing"
    audit = Audit()
    audit.feed(html)
    assert audit.problems == [], f"{path}: {audit.problems}"
    for kind, data in audit.scripts:
        if kind in ("application/ld+json", "application/json") and data.strip():
            json.loads(data)  # still one intact JSON document
