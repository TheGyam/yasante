"""The weekly import of hair products from Open Beauty Facts."""

import logging

from celery import shared_task

from . import openbeauty
from .barcodes import clean
from .models import Product

logger = logging.getLogger(__name__)


def import_hair_products(max_pages=20):
    """
    Adds hair products we don't have yet and refreshes the ones that came from Open
    Beauty Facts. Never touches our own or members' products. Returns (added, updated).
    """
    added = updated = 0
    for products in openbeauty.hair_pages(max_pages=max_pages):
        for found in products:
            code = clean(found.get("code"))
            values = openbeauty.fields(found) if openbeauty.is_hair(found) else None
            if not code or not values:
                continue
            existing = Product.objects.filter(barcode=code).first()
            if existing is None:
                Product.objects.create(barcode=code, source="open_beauty_facts", **values)
                added += 1
            elif existing.source == "open_beauty_facts":
                changed = {k: v for k, v in values.items() if v and getattr(existing, k) != v}
                if changed:
                    Product.objects.filter(pk=existing.pk).update(**changed)
                    updated += 1
    logger.info("Open Beauty Facts import: %s added, %s updated", added, updated)
    return added, updated


@shared_task(ignore_result=True)
def weekly_product_import():
    import_hair_products()
