"""What search engines and AI assistants can read on yasante.com without running JavaScript."""

import json
import re

import pytest
from django.test import Client

pytestmark = pytest.mark.django_db


def html(path):
    response = Client().get(path)
    assert response.status_code == 200, path
    return response.content.decode()


def jsonld(body):
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', body, re.S)
    assert blocks, "no structured data"
    return [node for block in blocks for doc in json.loads(block) for node in doc["@graph"]]


def root(body):
    """What's inside #root: the part a crawler reads when it doesn't run the app."""
    return body.split('<div id="root">', 1)[1].split("</div>\n", 1)[0]


def test_a_stylist_page_carries_its_menu_prices_and_business_data(make_stylist):
    profile = make_stylist(bio="Knotless and boho braids, gentle on edges.")
    body = html(f"/{profile.handle}")
    content = root(body)
    assert profile.display_name in content and "Knotless braids" in content and "from £120" in content
    assert "Peckham" in content and "Request a booking" in content
    business = next(n for n in jsonld(body) if n["@type"] == "HairSalon")
    assert business["name"] == profile.display_name
    assert business["address"]["addressLocality"] == "Peckham" and "streetAddress" not in business["address"]
    offers = business["hasOfferCatalog"]["itemListElement"]
    assert {o["itemOffered"]["name"] for o in offers} >= {"Knotless braids", "Cornrows"}
    assert f'<link rel="canonical" href="https://yasante.com/{profile.handle}">' in body
    assert "max-image-preview:large" in body


def test_a_look_page_describes_the_image_and_credits_it(make_user, make_look, make_stylist):
    stylist = make_stylist()
    look = make_look(make_user(), stylist=stylist, caption="Waist-length knotless.")
    body = html(f"/looks/{look.pk}")
    assert "Waist-length knotless." in root(body)
    image = next(n for n in jsonld(body) if n["@type"] == "ImageObject")
    assert image["contentUrl"] == look.photo_uri and image["creditText"]


def test_the_home_page_says_what_yasante_is(make_stylist):
    profile = make_stylist()
    body = html("/")
    assert "Yasante is an app and website for textured hair" in root(body)
    assert f'href="/{profile.handle}"' in root(body)
    types = {n["@type"] for n in jsonld(body)}
    assert {"Organization", "WebSite"} <= types


def test_ai_crawlers_are_welcome_and_private_pages_are_not_crawled():
    robots = html("/robots.txt")
    for bot in ("GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "OAI-SearchBot"):
        assert f"User-agent: {bot}" in robots
    assert "Disallow: /auth/" in robots and "Disallow: /api/" in robots and "Allow: /" in robots
    assert "Sitemap: " in robots


def test_llms_txt_tells_assistants_what_is_here(make_stylist):
    profile = make_stylist()
    short = html("/llms.txt")
    assert short.startswith("# Yasante") and f"https://yasante.com/{profile.handle}" in short
    full = html("/llms-full.txt")
    assert "Knotless braids: from £120" in full and profile.display_name in full


def test_the_sitemap_lists_pages_with_their_photos(make_user, make_look, make_stylist):
    stylist = make_stylist()
    make_look(make_user(), stylist=stylist)
    xml = html("/sitemap.xml")
    assert 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' in xml
    assert f"https://yasante.com/{stylist.handle}" in xml and "<image:loc>" in xml
    assert "https://yasante.com/privacy" in xml


def test_indexnow_key_is_served_and_publishing_pings(make_stylist, settings, monkeypatch, django_capture_on_commit_callbacks):
    from apps.web import indexnow

    assert html(f"/{settings.INDEXNOW_KEY}.txt").strip() == settings.INDEXNOW_KEY
    sent = []
    monkeypatch.setattr(indexnow.ping, "delay", lambda paths: sent.append(paths))
    settings.INDEXNOW_ENABLED = True
    with django_capture_on_commit_callbacks(execute=True):
        profile = make_stylist()
    assert [f"/{profile.handle}", "/llms.txt"] in sent


def test_every_page_has_a_picture_for_link_previews(db):
    from django.test import Client

    home = Client().get("/").content.decode()
    assert '<meta property="og:image" content="https://yasante.com/static/site/share.jpg">' in home
    assert '<meta name="twitter:card" content="summary_large_image">' in home
