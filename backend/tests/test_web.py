"""The public site: each page's HTML, with its title and data; the waitlist; app-link files."""

import json
import re

import pytest
from django.test import Client

pytestmark = pytest.mark.django_db


def _page_data(page):
    """The API data a page's HTML carries for the site's query cache."""
    body = page.content.decode()
    found = re.search(r'<script id="page-data" type="application/json">(.*?)</script>', body, re.S)
    return {tuple(seed["key"]): seed["data"] for seed in json.loads(found.group(1))} if found else {}


def test_her_page_is_public_only_once_published(make_stylist, api):
    web = Client()
    profile = make_stylist()
    page = web.get(f"/{profile.handle}")
    assert page.status_code == 200
    body = page.content.decode()
    assert f"<title>{profile.display_name} (@{profile.handle}) — braider in {profile.base_area} · Yasante</title>" in body
    assert 'property="og:title"' in body
    # It opens on exactly what the API would send, under the key the site reads.
    data = _page_data(page)[("stylist", profile.handle)]
    assert data["profile"]["displayName"] == profile.display_name
    assert [item["name"] for item in data["menu"]][:1] == ["Knotless braids"]
    assert data == api().get(f"/api/stylists/by-handle/{profile.handle}/").json()
    assert profile.address not in body
    profile.published = False
    profile.save()
    assert web.get(f"/{profile.handle}").status_code == 404
    # The API and admin aren't shadowed by the handle route.
    assert web.get("/admin/login/").status_code == 404


def test_page_data_cannot_close_its_script(make_stylist):
    profile = make_stylist(bio="Braids </script><script>alert(1)</script>")
    body = Client().get(f"/{profile.handle}").content.decode()
    assert "<script>alert(1)" not in body
    assert _page_data(Client().get(f"/{profile.handle}"))[("stylist", profile.handle)]["profile"][
        "bio"
    ] == profile.bio


def test_a_look_page_hides_what_is_not_live(make_user, make_look):
    web = Client()
    look = make_look(make_user())
    page = web.get(f"/looks/{look.pk}")
    assert page.status_code == 200
    assert _page_data(page)[("look", str(look.pk))]["id"] == str(look.pk)
    assert f'content="{look.feed_uri or look.photo_uri}"' in page.content.decode()
    look.status = "hidden"
    look.save()
    assert web.get(f"/looks/{look.pk}").status_code == 404


def test_every_page_is_the_site(make_stylist):
    web = Client()
    for path in ("/", "/looks", "/looks?style=knotless", "/auth/reset-password"):
        page = web.get(path)
        assert page.status_code == 200 and '<div id="root">' in page.content.decode()
    # Anywhere else: the site's own not-found page, but never under the API.
    assert '<div id="root">' in web.get("/somewhere/else").content.decode()
    assert web.get("/somewhere/else").status_code == 404
    assert '<div id="root">' not in web.get("/api/nothing-here/").content.decode()


def test_brand_links_are_public_without_javascript_and_stay_in_the_browser(settings):
    from apps.stylists.models import NOT_HANDLES

    web = Client()
    response = web.get("/links")
    assert response.status_code == 200
    body = response.content.decode()
    assert "<title>Our links · Yasante</title>" in body
    assert '<link rel="canonical" href="https://yasante.com/links">' in body
    for href in (
        "https://yasante.com",
        "https://www.instagram.com/yasantebeauty/",
        "https://www.tiktok.com/@yasante_beauty",
    ):
        assert f'href="{href}"' in body
    assert "links" in NOT_HANDLES
    settings.APPLE_TEAM_ID = "TEAM123"
    association = web.get("/.well-known/apple-app-site-association").json()
    assert {"/": "/links", "exclude": True} in association["applinks"]["details"][0]["components"]


def test_a_stylist_can_sign_up_on_the_web():
    web = Client()
    signup = web.get("/auth/signup").content.decode()
    assert "<title>Set up your stylist account · Yasante</title>" in signup
    assert 'content="noindex"' not in signup
    # Signing in, the code and setup are for one person: kept out of search.
    for path in (
        "/auth/login",
        "/auth/verify-email",
        "/stylist-setup",
        # Her studio, at the app's addresses.
        "/today",
        "/requests",
        "/requests/00000000-0000-0000-0000-000000000001",
        "/portfolio",
        "/looks/new",
        "/menu",
        "/menu/new",
        "/menu/00000000-0000-0000-0000-000000000001",
        "/availability",
        "/payment-methods",
        "/account",
    ):
        page = web.get(path)
        assert page.status_code == 200 and '<meta name="robots" content="noindex">' in page.content.decode()


def test_waitlist_joins_once_and_ignores_bots(api):
    from apps.web.models import WaitlistEntry

    client = api()
    joined = client.post("/api/waitlist/", {"email": "A@b.com", "role": "stylist", "source": "braids1"})
    assert joined.status_code == 201
    assert client.post("/api/waitlist/", {"email": "a@b.com"}).status_code == 201
    assert client.post("/api/waitlist/", {"email": "bot@b.com", "website": "spam"}).status_code == 201
    assert list(WaitlistEntry.objects.values_list("email", "role", "source")) == [
        ("a@b.com", "stylist", "braids1")
    ]
    wrong = client.post("/api/waitlist/", {"email": "not an email"})
    assert wrong.status_code == 400 and "Email" in wrong.json()["message"]


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


def test_public_host_has_no_admin_metrics(make_user):
    web=Client()
    assert web.get("/admin/metrics/").status_code == 404
    web.force_login(make_user(is_staff=True,is_superuser=True))
    assert web.get("/admin/metrics/").status_code == 404
    assert web.get("/admin/").status_code == 404


def test_style_and_area_pages(make_stylist, make_user, make_look):
    web = Client()
    profile = make_stylist()
    make_look(make_user(), style="knotless", stylist=profile)
    assert "Knotless" in web.get("/styles/knotless").content.decode()
    assert web.get("/styles/nope").status_code == 404
    page = web.get(f"/areas/{profile.base_area.lower().replace(' ', '-')}")
    assert page.status_code == 200 and "Braiders in Peckham" in page.content.decode()
    assert web.get("/areas/nowhere-at-all").status_code == 404
    assert "/styles/knotless" in web.get("/sitemap.xml").content.decode()


def test_terms_and_privacy_are_published():
    web = Client()
    for path, title in (
        ("/terms", "Terms of use"),
        ("/privacy", "Privacy policy"),
        ("/stylist-terms", "Stylist terms"),
    ):
        page = web.get(path)
        assert page.status_code == 200 and title in page.content.decode()


def test_the_privacy_policy_names_who_sends_our_emails(api):
    current = api().get("/api/policies/privacy/").json()
    assert current["version"] == "2026-10-24"
    assert "IONOS" in current["body"] and "confirm by emailing you a code" in current["body"]


def test_stylist_terms_say_what_the_product_does(api):
    terms = api().get("/api/policies/stylist_terms/").json()
    assert terms["version"] == "2026-10-21"
    # Only the checks Yasante really makes.
    assert "your identity or insurance" not in terms["body"]
    # The facts they state are the ones the booking rules enforce.
    from django.conf import settings

    assert f"within {settings.BOOKING_REQUEST_LAPSE_HOURS} hours lapses" in terms["body"]
    assert f"within {settings.BOOKING_DEPOSIT_LAPSE_HOURS} hours of your acceptance" in terms["body"]
    assert "Yasante never takes, holds, or refunds money" in terms["body"]


def test_the_terms_explain_reporting_and_complaints_with_the_old_ones_kept(api):
    from apps.profiles.models import PolicyDocument

    current = api().get("/api/policies/terms/").json()
    assert current["version"] == "2026-10-24"
    assert "with or without an account" in current["body"] and "within 14 days" in current["body"]
    assert PolicyDocument.objects.filter(type="terms", version="2026-09").exists()
    # Signing up today agrees to privacy "2026-10-21": the text in force then.
    assert api().get("/api/policies/privacy/", version="2026-10-21").json()["version"] == "2026-10-20"
    assert api().get("/api/policies/terms/", version="2026-09").json()["version"] == "2026-09"


def test_the_privacy_policy_says_what_the_feed_uses_and_how_to_turn_it_off(api):
    body = api().get("/api/policies/privacy/").json()["body"]
    assert "To choose and order what you see in your feed" in body
    assert "You can choose Latest" in body and "What you're shown and open in the feed and in \"More like this\": 90 days." in body
    feed = api().get("/api/policies/privacy/", version="2026-10-22").json()
    assert feed["version"] == "2026-10-22" and "What you're shown and open in the feed: 90 days." in feed["body"]
    # The text agreed to before stays readable by its version.
    assert api().get("/api/policies/privacy/", version="2026-10-20").json()["version"] == "2026-10-20"


def test_the_guidelines_cover_all_hair_and_say_how_to_report(api):
    guidelines = api().get("/api/policies/guidelines/").json()
    assert guidelines["version"] == "2026-10-24"
    body = guidelines["body"]
    assert body.startswith("Yasante is for finding, sharing and booking hair:")
    assert "with or without an account" in body and "within 14 days" in body
    assert "support@yasante.com" in body and "admin@yasante.com" not in body
