"""
Area names to pick from while a stylist outside the UK types where she works. From
Mapbox's free temporary geocoding: its terms forbid keeping those answers, so nothing is
cached or stored. Only the name she picks is saved, as text she could have typed.
"""

import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from drf_spectacular.utils import OpenApiParameter, extend_schema

from apps.common.countries import is_country

logger = logging.getLogger(__name__)

URL = "https://api.mapbox.com/search/geocode/v6/forward"


def suggest(text, country):
    """Up to five areas matching what she's typed, in her country: [{"name", "context"}]."""
    token = settings.MAPBOX_TOKEN
    if not token or len(text) < 2 or not is_country(country):
        return []
    query = urllib.parse.urlencode(
        {
            "q": text,
            "country": country.lower(),
            "types": "neighborhood,locality,place,district",
            "autocomplete": "true",
            "limit": 5,
            "access_token": token,
        }
    )
    try:
        with urllib.request.urlopen(f"{URL}?{query}", timeout=4) as response:
            features = json.loads(response.read().decode("utf-8")).get("features") or []
    except (urllib.error.URLError, TimeoutError, ValueError):
        logger.info("Mapbox had no suggestions", exc_info=True)
        return []
    found = []
    for feature in features:
        props = feature.get("properties") or {}
        if props.get("name"):
            found.append({"name": props["name"], "context": props.get("place_formatted") or ""})
    return found


class PlaceSuggestionsThrottle(UserRateThrottle):
    scope = "places"
    rate = "60/min"


class PlaceSerializer(serializers.Serializer):
    name = serializers.CharField(help_text="What to save if she picks it")
    context = serializers.CharField(help_text="Where it is, to tell same-named places apart")


class PlaceSuggestionsView(APIView):
    """Areas for the area field outside the UK. Signed in only, so the free quota is ours."""

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
        response = Response(suggest(text, country))
        response["Cache-Control"] = "no-store"
        return response
