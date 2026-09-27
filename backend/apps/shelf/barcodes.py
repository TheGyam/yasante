"""
Scanning a product: our own catalogue first, then Open Beauty Facts (a free, open
database of cosmetics, no account needed). A product found there joins the
catalogue, so the next person to scan it gets it straight from us.
"""

import json
import logging
import re
import urllib.error
import urllib.request

from .models import Product

logger = logging.getLogger(__name__)

LOOKUP = "https://world.openbeautyfacts.org/api/v2/product/{code}.json?fields=product_name,brands,categories_tags,ingredients_text,image_front_url"
# Open Beauty Facts asks every app to say who it is.
AGENT = "Yasante/1.0 (admin@yasante.com)"

# The words in a product's categories or name that say which shelf it belongs on.
CATEGORY_WORDS = [
    ("leave-in", ("leave-in", "leave in", "leave-in-conditioners")),
    ("conditioner", ("conditioner",)),
    ("shampoo", ("shampoo", "co-wash", "cowash")),
    ("oil", ("oil",)),
    ("styler", ("gel", "curl", "custard", "mousse", "cream", "butter", "edge", "styling", "pomade")),
]


def clean(raw):
    """The digits of a retail barcode (8 to 14 of them), or None if it isn't one."""
    digits = re.sub(r"\D", "", raw or "")
    return digits if 8 <= len(digits) <= 14 else None


def guess_category(*texts):
    words = " ".join(t.lower() for t in texts if t)
    for category, markers in CATEGORY_WORDS:
        if any(m in words for m in markers):
            return category
    return "treatment"


def _fetch(code):
    request = urllib.request.Request(LOOKUP.format(code=code), headers={"User-Agent": AGENT})
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError):
        logger.warning("Open Beauty Facts lookup failed for %s", code, exc_info=True)
        return None


def find(code):
    """(product, source) for a barcode, or (None, None) if nobody knows it."""
    product = Product.objects.filter(barcode=code).first()
    if product:
        return product, "catalogue"

    data = _fetch(code)
    found = (data or {}).get("product") if (data or {}).get("status") == 1 else None
    name = ((found or {}).get("product_name") or "").strip()
    if not name:
        return None, None
    brand = ((found.get("brands") or "").split(",")[0]).strip() or "Unknown brand"
    product = Product.objects.create(
        barcode=code,
        brand=brand[:150],
        name=name[:150],
        category=guess_category(" ".join(found.get("categories_tags") or []), name),
        ingredients=(found.get("ingredients_text") or "")[:2000],
        photo_uri=(found.get("image_front_url") or "")[:500],
    )
    return product, "open_beauty_facts"
