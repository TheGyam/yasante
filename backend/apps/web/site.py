"""
The website's HTML. The pages themselves are a React app (web/ at the repo root), built
into static/site/. Django sends each page's HTML with what can't wait for JavaScript:
the title, description and share image (for search engines and link previews), and the
page's own API data, so it opens on its content rather than a spinner.
"""

import json
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.shortcuts import render
from django.templatetags.static import static
from django.utils.safestring import mark_safe

from apps.common.renderers import CamelCaseJSONRenderer

BUILD = Path(__file__).resolve().parent / "static" / "site"
DESCRIPTION = "Find a braider whose work you’ve seen on hair like yours, and book them."


def _read_assets():
    """The built bundle's script and stylesheets, from Vite's manifest; None before a build."""
    try:
        manifest = json.loads((BUILD / ".vite" / "manifest.json").read_text())
    except (OSError, ValueError):
        return None
    entry = manifest.get("index.html")
    if not entry:
        return None
    return {
        "script": static(f"site/{entry['file']}"),
        "styles": [static(f"site/{css}") for css in entry.get("css", [])],
    }


_cached_assets = lru_cache(maxsize=1)(_read_assets)


def assets():
    # Read once in production; every time while developing, so a rebuild shows up.
    return _read_assets() if settings.DEBUG else _cached_assets()


def page_data(seeds):
    """
    The page's API responses as the site's query cache reads them: [{key, data}], each
    rendered exactly as the API would send it. Escaped so nothing in it can close the
    <script> it sits in.
    """
    if not seeds:
        return ""
    body = CamelCaseJSONRenderer().render([{"key": key, "data": data} for key, data in seeds])
    text = body.decode().replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    return mark_safe(text)


def page(request, *, title=None, description=None, image="", seeds=(), status=200):
    """Render one page of the site. `seeds` is [(query key, API data)]."""
    return render(
        request,
        "web/site.html",
        {
            "title": f"{title} · Yasante" if title else "Yasante",
            "og_title": title or "Yasante",
            "description": (description or DESCRIPTION).strip(),
            "image": image,
            "assets": assets(),
            "page_data": page_data(seeds),
        },
        status=status,
    )
