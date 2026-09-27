"""
The first published Community guidelines (version 2026-09), which the terms point to,
so yasante.com/guidelines and the app's link work. Later versions are added in the
admin, not here.
"""

from datetime import datetime, timezone

from django.db import migrations

VERSION = "2026-09"
EFFECTIVE = datetime(2026, 9, 28, tzinfo=timezone.utc)

GUIDELINES = """Yasante is for finding, sharing and booking textured hair: braids, locs, twists, natural styles and the people who do them. These guidelines keep it a good place to be. They apply to everything you post — looks, comments, reviews, profiles, stylist pages and messages in a booking — and they sit alongside our Terms of use.

We have zero tolerance for objectionable content and abusive behaviour. Content that breaks these guidelines is removed, and people who break them can be suspended or removed from Yasante.

1. Be kind

Talk about hair, not about people's bodies, looks or backgrounds. No harassment, bullying, threats, or piling on. Disagree with a review or a comment by reporting it, not by attacking the person.

2. No hate

Nothing that attacks or demeans people for their race, ethnicity, national origin, religion, sex, gender identity, sexual orientation, disability, age or any other part of who they are. Colourism and texture shaming count.

3. Nothing sexual or violent

No nudity, sexual content, or graphic violence, and nothing that sexualises anyone under 18. Photos should show hair.

4. Only your own work, honestly shown

Post photos you took or have the right to share, of work you did or had done. Don't post someone else's work as yours, and don't edit a photo so much that it misleads people about what they'll get. Credit the stylist when you can.

5. Honest reviews

Review only appointments you actually had, and describe your own experience. Don't offer, ask for or pay for reviews, and don't review yourself or a competitor.

6. Respect privacy

Don't share anyone's address, phone number or other private details, and don't post photos of people who haven't agreed to it. Stylists: the address you share for a booking is for that booking only.

7. No spam or scams

No fake accounts, bulk posting, misleading links, or selling things unrelated to hair. Stylists: don't ask clients to pay outside the deposit you set to get around your own policies.

8. Keep it legal and safe

Nothing illegal, and nothing that encourages harm, including unsafe hair or scalp treatments.

Reporting and blocking

You can report any look, comment, review, stylist or person from the app, and block anyone so you no longer see each other. A person reviews every report, and we aim to act within 24 hours. If we remove something of yours, we'll tell you why, and you can appeal from the app.

Contact

Questions about these guidelines: admin@yasante.com."""


def publish(apps, schema_editor):
    apps.get_model("profiles", "PolicyDocument").objects.get_or_create(
        type="guidelines",
        version=VERSION,
        defaults={
            "title": "Community guidelines",
            "body": GUIDELINES.strip(),
            "effective_at": EFFECTIVE,
            "published": True,
        },
    )


def unpublish(apps, schema_editor):
    apps.get_model("profiles", "PolicyDocument").objects.filter(
        type="guidelines", version=VERSION
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("profiles", "0009_domain_marker")]
    operations = [migrations.RunPython(publish, unpublish)]
