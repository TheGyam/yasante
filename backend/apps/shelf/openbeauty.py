"""
Open Beauty Facts: a free, open database of cosmetics (openbeautyfacts.org, ODbL), with
no account or key. Yasante's catalogue grows from it three ways: a scanned barcode we
don't know, a search that finds too little here, and a weekly import of hair products.
Whatever comes back joins our catalogue, so each product is asked for once.

Their limits (per IP): 100 product reads and 10 searches a minute. The weekly import
waits between pages to stay inside them.
"""

import hashlib
import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request

from django.core.cache import cache

logger = logging.getLogger(__name__)

BASE = "https://world.openbeautyfacts.org"
FIELDS = "code,product_name,brands,categories_tags,ingredients_text,image_front_url"
# Open Beauty Facts asks every app to say who it is.
AGENT = "Yasante/1.0 (admin@yasante.com)"
# The categories that mean hair.
HAIR_TAGS = [
    "en:hair-care", "en:shampoos", "en:conditioners", "en:hair-conditioners",
    "en:hair-masks", "en:hair-oils", "en:hair-styling-products", "en:leave-in-conditioners",
    "en:hair-creams", "en:hair-gels", "en:hair",
]

# The words in a product's categories or name that say which shelf it belongs on.
CATEGORY_WORDS = [
    ("leave-in", ("leave-in", "leave in")),
    ("conditioner", ("conditioner", "masque", "mask", "deep-condition")),
    ("shampoo", ("shampoo", "co-wash", "cowash", "cleanser")),
    ("oil", ("oil",)),
    ("styler", ("gel", "curl", "custard", "mousse", "cream", "butter", "edge", "styling", "pomade", "twist")),
]


def guess_category(*texts):
    words = " ".join(t.lower() for t in texts if t)
    for category, markers in CATEGORY_WORDS:
        if any(m in words for m in markers):
            return category
    return "treatment"


def _get(path, params=None):
    url = f"{BASE}{path}" + (f"?{urllib.parse.urlencode(params)}" if params else "")
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError):
        # Unknown products come back as a 404: the same to us as not found.
        logger.info("Open Beauty Facts had nothing for %s", url, exc_info=True)
        return None


# Hair, but not for our shelf: colour is a different aisle.
NOT_OUR_SHELF = (
    "dye", "colorant", "colourant", "hair-color", "hair-colour", "bleach", "henna",
    "pet", "dog", "cat-", "animal",
)
# A name that's only the kind of product ("Shampoo") tells nobody which one it is.
GENERIC_NAMES = {"shampoo", "conditioner", "hair oil", "oil", "gel", "hair gel", "leave-in", "mask", "cream", "spray"}
# Words that mark a name as a joke or vandalism rather than a product (the database is
# open to anyone; a few entries are defaced).
BAD_WORDS = ("ballsack", "penis", "fuck", "shit", "test product", "asdf")

# The weekly import brings in brands made for textured hair, and hair products sold in
# the UK and Ireland, rather than the world's shelves. (Scans and searches are about
# what someone is actually holding or looking for, so those stay worldwide.)
TEXTURED_BRANDS = [
    "cantu", "shea-moisture", "sheamoisture", "mielle", "mielle-organics", "as-i-am",
    "aunt-jackie-s", "camille-rose", "eco-style", "ors", "ors-olive-oil", "pattern",
    "pattern-beauty", "bounce-curl", "flora-curl", "afrocenchix", "boucleme", "kinky-curly",
    "tgin", "carol-s-daughter", "creme-of-nature", "palmer-s", "luster-s", "dark-and-lovely",
    "design-essentials", "jamaican-mango-lime", "taliah-waajid", "uncle-funky-s-daughter",
    "curlsmith", "bread-beauty-supply", "umberto-giannini", "as-i-am-naturally", "curls",
    "the-mane-choice", "not-your-mother-s", "oui-the-people", "african-pride", "blue-magic",
]
COUNTRIES = ["en:united-kingdom", "en:ireland"]


def is_hair(found):
    tags = found.get("categories_tags") or []
    if any(bad in t for t in tags for bad in NOT_OUR_SHELF):
        return False
    return any(t in HAIR_TAGS or "hair" in t for t in tags)


def _looks_real(brand, name):
    text = f"{brand} {name}".lower()
    return (
        len(name) >= 3
        and len(brand) >= 2
        and name.lower().strip() not in GENERIC_NAMES
        and not any(w in text for w in BAD_WORDS)
        and not any(w in text.split() for w in ("dog", "dogs", "cat", "cats", "pet", "puppy"))
    )


def fields(found):
    """Our Product fields from one of their products, or None if it's missing a name."""
    name = (found.get("product_name") or "").strip()
    brand = ((found.get("brands") or "").split(",")[0]).strip()
    if not name or not brand or not _looks_real(brand, name):
        return None
    return {
        "brand": brand[:150],
        "name": name[:150],
        "category": guess_category(" ".join(found.get("categories_tags") or []), name),
        "ingredients": (found.get("ingredients_text") or "")[:2000],
        "photo_uri": (found.get("image_front_url") or "")[:500],
    }


def product(code):
    """One product by barcode, or None."""
    data = _get(f"/api/v2/product/{code}.json", {"fields": FIELDS}) or {}
    return data.get("product") if data.get("status") == 1 else None


def search(terms, page_size=24):
    """Hair products matching what someone typed. Cached for a day: people search alike."""
    key = "obf:search:" + hashlib.sha1(terms.lower().strip().encode()).hexdigest()
    found = cache.get(key)
    if found is None:
        data = _get("/cgi/search.pl", {
            "search_terms": terms, "search_simple": 1, "json": 1,
            "page_size": page_size, "fields": FIELDS,
        }) or {}
        found = [p for p in data.get("products", []) if is_hair(p)]
        cache.set(key, found, 60 * 60 * 24)
    return found


def hair_pages(max_pages=20, page_size=100, pause=7.0):
    """
    Pages of products for the weekly import: each textured-hair brand, then hair products
    sold in the UK and Ireland. Most recently changed first.
    """
    queries = [{"brands_tags": b} for b in TEXTURED_BRANDS]
    queries += [{"categories_tags": tag, "countries_tags": c} for c in COUNTRIES for tag in ("en:hair-care", "en:shampoos", "en:hair")]
    for query in queries:
        for page in range(1, max_pages + 1):
            data = _get("/api/v2/search", {
                **query, "fields": FIELDS, "page": page,
                "page_size": page_size, "sort_by": "last_modified_t",
            }) or {}
            products = data.get("products") or []
            if products:
                yield products
            time.sleep(pause)  # Inside their 10 searches a minute.
            if len(products) < page_size:
                break
