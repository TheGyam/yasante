"""
Privacy policy 2026-09-25: the same policy, now naming IONOS, which sends Yasante's
account emails (sign-up codes and password resets) from admin@yasante.com, and saying
that an email address is confirmed with a code. The earlier version stays, so every
consent record still points at the text that was agreed to.
"""

from datetime import datetime, timezone

from django.db import migrations

VERSION = "2026-09-25"
EFFECTIVE = datetime(2026, 9, 25, tzinfo=timezone.utc)

PROVIDERS_BEFORE = "Amazon Web Services (hosting, in the EU), Expo (sending push notifications),"
PROVIDERS_AFTER = (
    "Amazon Web Services (hosting, in the EU), IONOS (sending account emails, such as "
    "sign-up codes and password reset links, in the EU), Expo (sending push notifications),"
)
ACCOUNT_BEFORE = "Account details: your name, email address, phone number, and password (stored only in scrambled form)."
ACCOUNT_AFTER = (
    "Account details: your name, email address (which we confirm by emailing you a code), "
    "phone number if you add one, and password (stored only in scrambled form)."
)


def publish(apps, schema_editor):
    PolicyDocument = apps.get_model("profiles", "PolicyDocument")
    previous = (
        PolicyDocument.objects.filter(type="privacy", published=True).order_by("-effective_at").first()
    )
    if previous is None or PolicyDocument.objects.filter(type="privacy", version=VERSION).exists():
        return
    body = previous.body.replace(PROVIDERS_BEFORE, PROVIDERS_AFTER).replace(ACCOUNT_BEFORE, ACCOUNT_AFTER)
    PolicyDocument.objects.create(
        type="privacy",
        version=VERSION,
        title=previous.title,
        body=body,
        effective_at=EFFECTIVE,
        published=True,
    )


def unpublish(apps, schema_editor):
    apps.get_model("profiles", "PolicyDocument").objects.filter(type="privacy", version=VERSION).delete()


class Migration(migrations.Migration):
    dependencies = [("profiles", "0006_hairprofile_length_cm_hairprofilesnapshot_length_cm_and_more")]
    operations = [migrations.RunPython(publish, unpublish)]
