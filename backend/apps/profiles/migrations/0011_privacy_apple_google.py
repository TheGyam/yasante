"""
Privacy policy 2026-09-28: the same policy, now saying what Apple and Google share
when someone chooses to sign in with them. The earlier version stays, so every
consent record still points at the text that was agreed to.
"""

from datetime import datetime, timezone

from django.db import migrations

VERSION = "2026-09-28"
EFFECTIVE = datetime(2026, 9, 28, tzinfo=timezone.utc)

ACCOUNT_BEFORE = (
    "Account details: your name, email address (which we confirm by emailing you a code), "
    "phone number if you add one, and password (stored only in scrambled form)."
)
ACCOUNT_AFTER = (
    ACCOUNT_BEFORE
    + " If you choose to sign in with Apple or Google, they tell us your name, your email"
    " address (Apple can give us a private relay address instead) and an ID for your"
    " account with them, and you won't have a Yasante password. We never see your Apple"
    " or Google password."
)


def publish(apps, schema_editor):
    PolicyDocument = apps.get_model("profiles", "PolicyDocument")
    previous = (
        PolicyDocument.objects.filter(type="privacy", published=True).order_by("-effective_at").first()
    )
    if previous is None or PolicyDocument.objects.filter(type="privacy", version=VERSION).exists():
        return
    PolicyDocument.objects.create(
        type="privacy",
        version=VERSION,
        title=previous.title,
        body=previous.body.replace(ACCOUNT_BEFORE, ACCOUNT_AFTER),
        effective_at=EFFECTIVE,
        published=True,
    )


def unpublish(apps, schema_editor):
    apps.get_model("profiles", "PolicyDocument").objects.filter(type="privacy", version=VERSION).delete()


class Migration(migrations.Migration):
    dependencies = [("profiles", "0010_community_guidelines")]
    operations = [migrations.RunPython(publish, unpublish)]
