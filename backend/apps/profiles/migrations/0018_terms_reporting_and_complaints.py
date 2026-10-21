"""
Terms of use 2026-10-21: reporting open to anyone, illegal and dangerous content dealt
with first, the automatic copy check, complaints answered within 14 days, a contact point
for authorities and the EU, and what happens to reviews when an account is deleted.
Approved by Yaw on 21 October 2026. Earlier versions stay, so every acceptance still
points at the text that was agreed to.
"""

from datetime import datetime, timezone

from django.db import migrations

VERSION = "2026-10-21"
EFFECTIVE = datetime(2026, 10, 21, tzinfo=timezone.utc)

BODY = """These terms apply when you use the Yasante app or yasante.com. By creating an account you agree to them. If you don't agree, please don't use Yasante.

1. What Yasante is

Yasante helps you find hair stylists, see their work, and ask them for an appointment. Stylists on Yasante are independent: they are not our employees or agents, and they set their own prices, hours, deposits and cancellation rules. When a stylist accepts your request, the appointment is an agreement between you and the stylist. Yasante is not a party to it.

2. Your account

You must be 18 or over. Give accurate details, keep your sign-in private, and tell us if you think someone else is using your account. You are responsible for what happens on your account. We may ask you to verify your phone number.

3. Booking an appointment

A request is not a booking until the stylist accepts it. Requests the stylist doesn't answer in time lapse on their own.

Some stylists ask for a deposit. Deposits are paid directly to the stylist using the method she shows you (for example a bank transfer). Yasante does not take, hold or refund payments. Your appointment is confirmed once the stylist marks the deposit as received, or straight away if she doesn't ask for one.

The stylist's address is shown to you only once your appointment is confirmed. Keep it private.

4. Cancelling, moving and not turning up

Each stylist shows her notice period and deposit rules before you send a request, and you accept them when you send it. Cancelling within her notice period, or not turning up, may mean you lose your deposit; that is between you and the stylist.

We keep a simple record of attendance: appointments kept, cancelled in good time, cancelled late, and missed. Cancelling in good time never counts against you. Stylists can see this record when you send them a request. If you think a no-show was marked wrongly, you can contest it in the app.

5. For stylists

If you offer services on Yasante, you confirm that you are entitled to work as a stylist, that your photos show your own work, that your prices and policies are accurate, and that you hold any insurance or permissions your work needs. You are responsible for your services, your premises and your own tax. Separate stylist terms may also apply.

6. Looks, comments and reviews

You keep ownership of the photos and words you post. You give Yasante a non-exclusive, worldwide, royalty-free licence to host, show, resize and share them within Yasante and on yasante.com, and to show them when promoting Yasante, for as long as they are on the service. You can delete them at any time. If you delete your account, reviews you left keep only their star rating, without your name or words.

Only post photos you took or have permission to post, and only post photos of other people with their agreement. Reviews can only be left after a completed appointment and must be your honest experience.

7. What's not allowed

Harassment, hate, threats or sexual content; spam or fake accounts; misleading reviews; posting someone else's work as your own; sharing other people's private details; asking to be paid outside the agreed deposit to get around a stylist's rules; or anything illegal. Our community guidelines give more detail.

8. Reports and moderation

You can report a look, comment, review, stylist or person from the app, including anything you think is illegal or puts someone at risk. Anyone, with or without an account, can also report by emailing support@yasante.com. A person reviews every report, and we aim to act within 24 hours, dealing first with anything that could put a child or anyone else in danger. We check new photos automatically against photos already on Yasante to spot copied work; a person decides what happens to anything it flags. We may hide or remove content, or suspend or close accounts, that break these terms or the law, and we report serious illegal content to the police or the right authority. If we act on your content we'll tell you why, and you can appeal from the app.

If you're unhappy with how we handled a report, a decision about your content or account, or anything else about safety on Yasante, email support@yasante.com. We'll reply within 14 days.

9. Our responsibility

We work to keep Yasante available and accurate, but we provide it as it is and can't promise it will always be available or error-free. We check some things about stylists (such as their phone number and a photo of their work) and show which checks each one has passed, but we don't guarantee any stylist's work, and we are not responsible for the services a stylist provides.

Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else the law does not allow us to limit. Otherwise, we are not liable for losses that were not foreseeable, for business losses, or for losses caused by a stylist or client. Your rights as a consumer are not affected.

10. Ending your account

You can delete your account at any time in Settings, Privacy and data. We may suspend or close an account that breaks these terms, and will tell you why unless the law or safety prevents it.

11. Changes

We may update these terms. If a change matters, we'll tell you in the app before it takes effect. The version and date are shown at the top of this page.

12. The law

These terms are governed by the law of England and Wales. You can bring a claim in the courts of the part of the UK where you live.

13. Contact

Questions about these terms, and complaints: support@yasante.com. This is also our point of contact for authorities and for people in the European Union, in English."""


def publish(apps, schema_editor):
    PolicyDocument = apps.get_model("profiles", "PolicyDocument")
    previous = PolicyDocument.objects.filter(type="terms", published=True).order_by("-effective_at").first()
    if previous is None or PolicyDocument.objects.filter(type="terms", version=VERSION).exists():
        return
    PolicyDocument.objects.create(
        type="terms", version=VERSION, title=previous.title, body=BODY, effective_at=EFFECTIVE, published=True
    )


def unpublish(apps, schema_editor):
    apps.get_model("profiles", "PolicyDocument").objects.filter(type="terms", version=VERSION).delete()


class Migration(migrations.Migration):
    dependencies = [("profiles", "0017_privacy_consents_and_research")]
    operations = [migrations.RunPython(publish, unpublish)]
