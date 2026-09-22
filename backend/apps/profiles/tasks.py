import json
import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

"""
Profile background tasks.
"""


logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def generate_data_export(self, user_id: str):
    """Assemble all user data and email it."""
    from apps.accounts.models import User
    from apps.profiles.models import ConsentRecord, HairProfile, HairProfileSnapshot

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning("Data export: user %s not found", user_id)
        return

    # Collect all data

    data = {
        "user": {
            "id": str(user.pk),
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "roles": user.roles,
            "created_at": user.created_at.isoformat(),
        },
    }

    # Hair profile
    try:
        hp = user.hair_profile
        data["hair_profile"] = {
            "texture": hp.texture,
            "length": hp.length,
            "density": hp.density,
            "porosity": hp.porosity,
            "goals": hp.goals,
            "scalp": hp.scalp,
            "chemicals": hp.chemicals,
        }
    except HairProfile.DoesNotExist:
        pass

    # Snapshots
    snapshots = HairProfileSnapshot.objects.filter(user=user).values()
    data["hair_snapshots"] = list(snapshots)

    # Consents
    consents = ConsentRecord.objects.filter(user=user).values()
    data["consents"] = list(consents)

    # In production: upload to S3 and email a signed URL
    # For now, email the JSON directly
    send_mail(
        "Your Yasante Data Export",
        f"Here is your data export:\n\n{json.dumps(data, indent=2, default=str)}",
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=True,
    )

    logger.info("Data export sent to %s", user.email)
