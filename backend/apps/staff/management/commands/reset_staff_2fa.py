from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from apps.staff.audit import security_event
from apps.staff.models import StaffSecondFactor


class Command(BaseCommand):
    help = "Reset staff 2FA after identity verification by an authorized server operator."

    def add_arguments(self, parser):
        parser.add_argument("email")

    def handle(self, email, **options):
        user = get_user_model().objects.filter(email__iexact=email, is_staff=True).first()
        if not user:
            raise CommandError("Staff account not found.")
        StaffSecondFactor.objects.filter(user=user).delete()
        security_event(None, "2FA reset by authorized server operator", user)
        self.stdout.write(self.style.SUCCESS(f"Second factor reset for {user.email}. Sign in again to enroll."))
