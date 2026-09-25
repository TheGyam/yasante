"""
The first published Stylist terms (version 2026-09), so yasante.com/stylist-terms
works and stylists signing up on the web can accept them. Like the first terms and
privacy policy, a working draft for the closed beta: a solicitor reviews it before
launch, and later versions are added in the admin, not here.
"""

from datetime import datetime, timezone

from django.db import migrations

VERSION = "2026-09"
EFFECTIVE = datetime(2026, 9, 25, tzinfo=timezone.utc)

STYLIST_TERMS = """These terms apply when you offer your services as a stylist on Yasante, in the app or on yasante.com. They sit alongside our Terms of use, Privacy policy and Community guidelines, which also apply to you. By setting up a stylist account you agree to them.

1. You are independent

You run your own business. You are not our employee, worker, agent or partner, and nothing in these terms makes you one. You decide your services, prices, hours, deposits, notice period and who you work with. When you accept a client's request, the appointment is an agreement between you and that client. Yasante is not a party to it.

2. Who can be a stylist on Yasante

You must be 18 or over and entitled to work in the UK. You confirm that you have any licences, permissions and insurance your work needs, and that you will follow the health, safety and hygiene rules that apply to it. If you work from home or a rented chair, it's up to you to have the permissions to do so.

3. Your page

Your page shows your name, handle, district, services, prices, hours, policies and work. Keep it accurate and up to date. Show your district only: your full address is shared with a client only once their appointment is confirmed, and you should keep theirs private too.

Your prices are what a client will be quoted. A price marked "from" is the starting point, and the final price must follow the options you list (such as length and size). Don't add charges that weren't on your page or agreed with the client before the appointment.

4. Your work and your photos

Only post photos of your own work, taken by you or with the photographer's permission, and only of people who have agreed to be shown. Don't edit a photo in a way that misrepresents the result. Photos you post as looks appear in the Yasante feed and on yasante.com for people browsing styles.

You keep ownership of your photos and words. You give Yasante a non-exclusive, worldwide, royalty-free licence to host, show, resize and share them within Yasante and on yasante.com, and to show them when promoting Yasante, for as long as they are on the service. You can remove them at any time.

5. Checks

We may check your phone number, a photo of your work, your identity or insurance, or meet you in person or on video. Your page shows exactly which checks you have passed, and never more than that. A proof-of-work photo you give us for checking is private and is not shown on your page.

6. Requests and bookings

Answer requests promptly. A request you don't accept, move or decline within 48 hours lapses on its own. If you ask for a deposit, a client who doesn't pay it within 24 hours of your acceptance loses the slot.

Keep the appointments you accept. If you have to cancel or move one, tell the client as early as you can, through Yasante. Repeatedly cancelling late or not turning up may lead us to limit or suspend your page.

Mark attendance honestly. You can record that a client didn't turn up; clients can contest it, and a person at Yasante looks at every contested record.

7. Deposits and payments

Deposits and payment go directly from the client to you, using the details you give. Yasante never takes, holds, or refunds money, and is not responsible for payments between you and your clients. Your deposit and cancellation rules are shown to clients before they send a request and they accept them when they send it; apply them as shown. You are responsible for your own tax and accounts.

8. Clients' information

You'll see a client's name, request details and attendance record, and, once an appointment is confirmed, whatever you need to carry it out. Use it only to arrange and provide that appointment. Don't add clients to marketing lists, share their details, or contact them outside Yasante for anything unrelated to their appointment, unless they have asked you to.

9. Reviews

Clients can review you only after a completed appointment. Don't ask for, offer anything for, or write reviews of yourself, and don't pressure clients about their reviews. You can report a review you believe breaks our guidelines.

10. Fees

Setting up a page and taking bookings on Yasante is currently free for founding stylists. If we introduce fees, we'll tell you clearly and in advance, and they won't apply to you unless you agree to them.

11. Suspending or closing a page

We may hide your page, limit it, or close your account if you break these terms or our guidelines, if a check shows your page isn't genuine, or to keep clients safe. We'll tell you why unless the law or safety prevents it, and you can appeal. You can close your account at any time; appointments you've already accepted remain between you and your clients.

12. Our responsibility

We work to keep Yasante available and working well, but we provide it as it is. We are not responsible for what happens at an appointment, for clients who don't turn up or don't pay, or for business you lose. Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else the law does not allow us to limit.

13. Changes

We may update these terms. If a change matters, we'll tell you before it takes effect. The version and date are shown at the top of this page.

14. The law

These terms are governed by the law of England and Wales, and the courts of England and Wales can hear any dispute.

15. Contact

Questions about these terms: support@yasante.com."""


def publish(apps, schema_editor):
    apps.get_model("profiles", "PolicyDocument").objects.get_or_create(
        type="stylist_terms",
        version=VERSION,
        defaults={
            "title": "Stylist terms",
            "body": STYLIST_TERMS.strip(),
            "effective_at": EFFECTIVE,
            "published": True,
        },
    )


def unpublish(apps, schema_editor):
    apps.get_model("profiles", "PolicyDocument").objects.filter(
        type="stylist_terms", version=VERSION
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("profiles", "0007_privacy_names_ionos")]
    operations = [migrations.RunPython(publish, unpublish)]
