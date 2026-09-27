"""python manage.py import_products [--pages N] — hair products from Open Beauty Facts, now."""

from django.core.management.base import BaseCommand

from apps.shelf.tasks import import_hair_products


class Command(BaseCommand):
    help = "Import hair products from Open Beauty Facts into the catalogue."

    def add_arguments(self, parser):
        parser.add_argument("--pages", type=int, default=20, help="Pages of 100 per brand or country (default 20).")

    def handle(self, *args, pages, **options):
        added, updated = import_hair_products(max_pages=pages)
        self.stdout.write(self.style.SUCCESS(f"{added} added, {updated} updated"))
