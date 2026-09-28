"""
Where a UK postcode or place is on the map, and how far apart two points are. From
postcodes.io: free, no key, UK open data (OGL). Answers are cached for a month, so
each postcode or place is asked about once.
"""

import hashlib
import json
import logging
import math
import re
import urllib.error
import urllib.parse
import urllib.request

from django.core.cache import cache

logger = logging.getLogger(__name__)

BASE = "https://api.postcodes.io"
POSTCODE = re.compile(r"([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})", re.IGNORECASE)
MONTH = 60 * 60 * 24 * 30


def _fetch(path):
    try:
        with urllib.request.urlopen(f"{BASE}{path}", timeout=4) as response:
            return json.loads(response.read().decode("utf-8")).get("result")
    except (urllib.error.URLError, TimeoutError, ValueError):
        logger.info("postcodes.io had nothing for %s", path, exc_info=True)
        return None


def postcode_in(text):
    """"SE15 4QJ" from anywhere in a string, or ""."""
    match = POSTCODE.search(text or "")
    return f"{match.group(1)} {match.group(2)}".upper() if match else ""


def locate(text):
    """(latitude, longitude) for a postcode in the text, or else a place name; None if unknown."""
    text = (text or "").strip()
    if not text:
        return None
    key = "geo:" + hashlib.sha1(text.lower().encode()).hexdigest()
    found = cache.get(key)
    if found is None:
        postcode = postcode_in(text)
        if postcode:
            result = _fetch(f"/postcodes/{urllib.parse.quote(postcode.replace(' ', ''))}") or {}
            found = [result.get("latitude"), result.get("longitude")]
        else:
            places = _fetch(f"/places?{urllib.parse.urlencode({'q': text, 'limit': 1})}") or []
            found = [places[0].get("latitude"), places[0].get("longitude")] if places else [None, None]
        cache.set(key, found, MONTH)
    return tuple(found) if found and found[0] is not None else None


def miles(a, b):
    """Straight-line miles between two (latitude, longitude) points."""
    lat1, lng1, lat2, lng2 = map(math.radians, (*a, *b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 3958.8 * 2 * math.asin(math.sqrt(h))
