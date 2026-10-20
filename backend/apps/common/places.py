"""
Area names to pick from while a stylist outside the UK types where she works. From
Photon, komoot's free open-source search over OpenStreetMap: no key, and the data's
licence (ODbL) lets us keep answers, so each one is cached for a day. Only the name she
picks is saved on her profile, as text she could have typed.
"""

import hashlib
import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from django.core.cache import cache
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.common.countries import BY_CODE, is_country
from apps.common.models import log_search

logger = logging.getLogger(__name__)

URL = "https://photon.komoot.io/api/"
# Photon has no country filter: ask for more and keep hers.
ASKED = 20
SHOWN = 5
DAY = 60 * 60 * 24
MONTH = DAY * 30


def _photon(params):
    query = urllib.parse.urlencode(params)
    request = urllib.request.Request(f"{URL}?{query}", headers={"User-Agent": "Yasante (admin@yasante.com)"})
    with urllib.request.urlopen(request, timeout=4) as response:
        return json.loads(response.read().decode("utf-8")).get("features") or []


def _centre(country):
    """Her country's middle, (lon, lat), from Photon itself; kept for a month."""
    key = f"places-centre1:{country}"
    found = cache.get(key)
    if found is None:
        countries = _photon([("q", BY_CODE[country]["name"]), ("layer", "country"), ("limit", 5)])
        match = next((f for f in countries if (f["properties"].get("countrycode") or "").upper() == country), None)
        found = match["geometry"]["coordinates"] if match else []
        cache.set(key, found, MONTH)
    return found


def suggest(text, country):
    """
    Up to five areas matching what she's typed, in her country: [{"name", "context"}].
    None when Photon couldn't be reached, so the staff dashboard can count it.
    """
    if len(text) < 2 or not is_country(country):
        return []
    key = "places3:" + hashlib.sha1(f"{country}:{text.lower()}".encode()).hexdigest()
    found = cache.get(key)
    if found is not None:
        return found
    try:
        # Photon ranks the whole world, so "East Le" would find East London before East
        # Legon. Leaning the search towards her country's middle fixes that.
        params = [("q", text), ("limit", ASKED)] + [("layer", layer) for layer in ("city", "district", "locality")]
        centre = _centre(country)
        if centre:
            params += [("lon", centre[0]), ("lat", centre[1]), ("zoom", 6), ("location_bias_scale", 0.5)]
        features = _photon(params)
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError):
        logger.info("Photon had no suggestions", exc_info=True)
        return None  # Not cached: the next letter tries again.
    found, seen = [], set()
    for feature in features:
        props = feature.get("properties") or {}
        name = props.get("name")
        if not name or (props.get("countrycode") or "").upper() != country:
            continue
        # "Accra, Greater Accra Region": where it is, to tell same-named places apart.
        context = ", ".join(dict.fromkeys(p for p in (props.get("city"), props.get("state")) if p and p != name))
        if (name, context) not in seen:
            seen.add((name, context))
            found.append({"name": name, "context": context})
    found = found[:SHOWN]
    cache.set(key, found, DAY)
    return found


class PlaceSuggestionsThrottle(UserRateThrottle):
    scope = "places"
    rate = "60/min"


class PlaceSerializer(serializers.Serializer):
    name = serializers.CharField(help_text="What to save if she picks it")
    context = serializers.CharField(help_text="Where it is, to tell same-named places apart")


class PlaceSuggestionsView(APIView):
    """Areas for the area field outside the UK. Signed in only, to be fair to the free service."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PlaceSuggestionsThrottle]

    @extend_schema(
        parameters=[
            OpenApiParameter("q", str, description="What she's typed so far"),
            OpenApiParameter("country", str, description="ISO 3166, her country"),
        ],
        responses=PlaceSerializer(many=True),
    )
    def get(self, request):
        text = (request.query_params.get("q") or "").strip()[:80]
        country = (request.query_params.get("country") or "").upper()
        found = suggest(text, country)
        if len(text) >= 2 and is_country(country):
            # So the team can see if OpenStreetMap starts letting stylists down.
            log_search(request, "areas", text, {"country": country, "failed": found is None}, len(found or []))
        return Response(found or [])
