"""
What a browser is told about each kind of page. Locally the site is served by Vite, so
these ask Django directly, as production does (it serves the site's pages and the API).
"""

import pytest

SITE = {"HTTP_HOST": "localhost"}


@pytest.mark.parametrize("path", ["/", "/looks", "/api/stylists/by-handle/nobody/"])
def test_every_response_refuses_framing_and_sniffing(client, db, path):
    r = client.get(path, **SITE)
    assert r["X-Frame-Options"] == "DENY"
    assert r["X-Content-Type-Options"] == "nosniff"
    assert "camera=()" in r["Permissions-Policy"]


def test_site_pages_limit_which_scripts_may_run(client, db):
    """The site shows text people wrote (bios, captions, comments); a CSP is the
    backstop if any of it ever gets through as markup."""
    r = client.get("/looks", **SITE)
    assert "script-src" in r.get("Content-Security-Policy", "")
