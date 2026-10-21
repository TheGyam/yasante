import json

from django.core.management.base import BaseCommand

from apps.feed.learning import MIN_IMPRESSIONS, tune


class Command(BaseCommand):
    help = (
        "Learn the feed's weights from the last 30 days of impressions, compare them with the "
        "hand-set ones on the most recent fifth, and with --save keep them if they're better."
    )

    def add_arguments(self, parser):
        parser.add_argument("--save", action="store_true", help="Keep the learned weights if they're better.")
        parser.add_argument("--min-impressions", type=int, default=MIN_IMPRESSIONS)

    def handle(self, *args, save=False, min_impressions=MIN_IMPRESSIONS, **options):
        report = tune(min_impressions=min_impressions, save=save)
        self.stdout.write(json.dumps(report, indent=2, default=str))
