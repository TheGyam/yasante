"""
Every country, its currency and how it measures distance. A stylist's prices are
always in her country's currency, and a booking keeps the currency it was made in.
There's no converting: a price is shown as the stylist charges it.
"""

import json
from decimal import Decimal
from pathlib import Path

COUNTRIES = json.loads((Path(__file__).with_name("countries.json")).read_text(encoding="utf-8"))
BY_CODE = {country["code"]: country for country in COUNTRIES}
DEFAULT = "GB"

# Currencies written without minor units, so "₦12,000" and never "₦12,000.00".
_WHOLE = {"BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF", "UGX", "UYI",
          "VND", "VUV", "XAF", "XOF", "XPF"}


def is_country(code):
    return code in BY_CODE


def currency_of(code):
    """Her country's currency; the default country's for anything unknown."""
    return BY_CODE.get(code or DEFAULT, BY_CODE[DEFAULT])["currency"]


def money(amount, currency):
    """For server-written text (notifications, emails, the site's pages): "£45", "GH₵12.50"."""
    if amount is None:
        return ""
    value = Decimal(str(amount))
    whole = currency in _WHOLE or value == value.to_integral_value()
    number = f"{value:,.0f}" if whole else f"{value:,.2f}"
    symbol = SYMBOLS.get(currency)
    return f"{symbol}{number}" if symbol else f"{number} {currency}"


# Symbols for the currencies people meet most; the rest are written as a code after the
# number ("12,500 XOF"), which reads clearly everywhere.
SYMBOLS = {
    "GBP": "£", "EUR": "€", "USD": "$", "CAD": "CA$", "AUD": "A$", "NZD": "NZ$",
    "NGN": "₦", "GHS": "GH₵", "KES": "KSh", "ZAR": "R", "JPY": "¥", "INR": "₹",
    "CHF": "CHF ", "SEK": "kr ", "NOK": "kr ", "DKK": "kr ", "PLN": "zł ",
}


# ── GET /api/countries/ ──────────────────────────────────────────────────────
from drf_spectacular.utils import extend_schema  # noqa: E402
from rest_framework import permissions, serializers  # noqa: E402
from rest_framework.response import Response  # noqa: E402
from rest_framework.views import APIView  # noqa: E402


class CountrySerializer(serializers.Serializer):
    code = serializers.CharField(help_text="ISO 3166")
    name = serializers.CharField()
    currency = serializers.CharField(help_text="ISO 4217")
    units = serializers.ChoiceField(choices=["km", "mi"], help_text="How distances are given there")


class CountryListView(APIView):
    """Every country, its currency and its distance units: for the country pickers."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @extend_schema(responses=CountrySerializer(many=True))
    def get(self, request):
        response = Response(COUNTRIES)
        # The same for everyone and rarely changes: let phones and the CDN keep it a day.
        response["Cache-Control"] = "public, max-age=86400"
        return response
