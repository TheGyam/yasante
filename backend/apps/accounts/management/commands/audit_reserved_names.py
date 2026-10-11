"""Read-only review of public names created before the current policy."""

from django.core.management.base import BaseCommand

from apps.accounts.models import User
from apps.common.identifiers import POLICY, identifier_problem, normalise
from apps.stylists.models import StylistProfile


class Command(BaseCommand):
    help = "Report names that do not meet the current policy. Never modifies accounts."

    def handle(self, *args, **options):
        count = 0
        for model, field, limit in (
            (User, "username", POLICY["username_max"]),
            (StylistProfile, "handle", POLICY["handle_max"]),
        ):
            rows = model.objects.exclude(**{f"{field}__isnull": True}).exclude(**{field: ""})
            for pk, value in rows.values_list("pk", field).iterator(chunk_size=500):
                normalized = normalise(value)
                reason = identifier_problem(normalized, max_length=limit)
                if reason or normalized != value:
                    count += 1
                    self.stdout.write(f"{model._meta.label} {pk} {value!r}: {reason or 'Not normalized'}")
        self.stdout.write(f"{count} name(s) need review. No accounts changed.")
