"""The public site: her page and a look open without the app; the waitlist; app-link files."""

import pytest
from django.test import Client

pytestmark = pytest.mark.django_db


def test_her_page_is_public_only_once_published(make_stylist):
    web = Client()
    profile = make_stylist()
    page = web.get(f"/{profile.handle}")
    assert page.status_code == 200
    body = page.content.decode()
    assert profile.display_name in body and "Knotless braids" in body and 'property="og:title"' in body
    assert "address" not in body.lower() or profile.address not in body
    profile.published = False
    profile.save()
    assert web.get(f"/{profile.handle}").status_code == 404
    # The API and admin aren't shadowed by the handle route.
    assert web.get("/admin/login/").status_code == 200


def test_a_look_page_hides_what_is_not_live(make_user, make_look):
    web = Client()
    look = make_look(make_user())
    assert web.get(f"/looks/{look.pk}").status_code == 200
    look.status = "hidden"
    look.save()
    assert web.get(f"/looks/{look.pk}").status_code == 404


def test_waitlist_joins_once_and_ignores_bots():
    from apps.web.models import WaitlistEntry

    web = Client()
    assert "on the list" in web.post("/", {"email": "A@b.com", "role": "stylist"}).content.decode()
    assert "on the list" in web.post("/", {"email": "a@b.com"}).content.decode()
    web.post("/", {"email": "bot@b.com", "website": "spam"})
    assert list(WaitlistEntry.objects.values_list("email", "role")) == [("a@b.com", "stylist")]


def test_sitemap_robots_and_app_links(make_stylist, settings):
    web = Client()
    profile = make_stylist()
    assert f"/{profile.handle}</loc>" in web.get("/sitemap.xml").content.decode()
    assert "Disallow: /api/" in web.get("/robots.txt").content.decode()
    assert web.get("/.well-known/assetlinks.json").status_code == 404
    settings.ANDROID_CERT_SHA256 = "AA:BB"
    links = web.get("/.well-known/assetlinks.json").json()
    assert links[0]["target"]["sha256_cert_fingerprints"] == ["AA:BB"]
    settings.APPLE_TEAM_ID = "TEAM123"
    aasa = web.get("/.well-known/apple-app-site-association").json()
    assert aasa["applinks"]["details"][0]["appIDs"] == ["TEAM123.com.yasante.app"]


def test_metrics_page_is_staff_only(make_user, make_stylist, make_look):
    make_look(make_user())
    make_stylist()
    web = Client()
    assert web.get("/admin/metrics/").status_code == 302
    staff = make_user(is_staff=True)
    web.force_login(staff)
    page = web.get("/admin/metrics/")
    assert page.status_code == 200 and "Activated stylists" in page.content.decode()
    assert "Metrics" in web.get("/admin/").content.decode()


def test_style_and_area_pages(make_stylist, make_user, make_look):
    web = Client()
    profile = make_stylist()
    make_look(make_user(), style="knotless", stylist=profile)
    assert "Knotless" in web.get("/styles/knotless").content.decode()
    assert web.get("/styles/nope").status_code == 404
    page = web.get(f"/areas/{profile.base_area.lower().replace(' ', '-')}")
    assert page.status_code == 200 and profile.display_name in page.content.decode()
    assert "/styles/knotless" in web.get("/sitemap.xml").content.decode()
