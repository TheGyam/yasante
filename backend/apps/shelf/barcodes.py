"""
Scanning a product: our own catalogue first, then Open Beauty Facts. A product found
there joins the catalogue, so the next person to scan it gets it straight from us.
"""

import re

from . import openbeauty
from .models import Product


def clean(raw):
    """The digits of a retail barcode (8 to 14 of them), or None if it isn't one."""
    digits = re.sub(r"\D", "", raw or "")
    return digits if 8 <= len(digits) <= 14 else None


def find(code, user=None):
    """(product, source) for a barcode, or (None, None) if nobody knows it."""
    product = Product.objects.visible_to(user).filter(barcode=code).first()
    if product:
        return product, "catalogue"
    found = openbeauty.product(code)
    values = openbeauty.fields(found) if found else None
    if not values:
        return None, None
    product = Product.objects.create(barcode=code, source="open_beauty_facts", **values)
    return product, "open_beauty_facts"
