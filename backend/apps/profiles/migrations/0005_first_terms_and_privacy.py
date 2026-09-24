"""
The first published Terms of use and Privacy policy (version 2026-09), so
yasante.com/terms and /privacy work and the app's links land somewhere real.
Working drafts for the closed beta: a solicitor reviews them before launch, and
later versions are added in the admin, not here.
"""

from datetime import datetime, timezone

from django.db import migrations

VERSION = "2026-09"
EFFECTIVE = datetime(2026, 9, 24, tzinfo=timezone.utc)

TERMS = """These terms apply when you use the Yasante app or yasante.com. By creating an account you agree to them. If you don't agree, please don't use Yasante.

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

You keep ownership of the photos and words you post. You give Yasante a non-exclusive, worldwide, royalty-free licence to host, show, resize and share them within Yasante and on yasante.com, and to show them when promoting Yasante, for as long as they are on the service. You can delete them at any time.

Only post photos you took or have permission to post, and only post photos of other people with their agreement. Reviews can only be left after a completed appointment and must be your honest experience.

7. What's not allowed

Harassment, hate, threats or sexual content; spam or fake accounts; misleading reviews; posting someone else's work as your own; sharing other people's private details; asking to be paid outside the agreed deposit to get around a stylist's rules; or anything illegal. Our community guidelines give more detail.

8. Reports and moderation

You can report a look, comment, review, stylist or person from the app. A person reviews reports, and we aim to act within 24 hours. We may hide or remove content, or suspend or close accounts, that break these terms. If we act on your content we'll tell you why, and you can appeal from the app.

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

Questions about these terms: support@yasante.com.
"""

PRIVACY = """This policy explains what personal information Yasante collects, why, and your rights. Yasante is responsible for your information as data controller. We follow UK data protection law (the UK GDPR and the Data Protection Act 2018).

1. What we collect

Account details: your name, email address, phone number, and password (stored only in scrambled form).

Your hair profile, if you fill it in: things like texture, length, density, porosity, area and budget, and photos you choose to add. You can leave any of it blank.

What you post: looks, captions, comments, reviews, collections, your product shelf and check-ins.

Bookings: the stylist, service, times, deposit status, attendance, cancellations and reviews. If you are a stylist: your page, services, prices, hours, area, address (shown to a client only once their appointment is confirmed), portfolio, verification checks such as your phone number, a proof-of-work photo and any insurance certificate you upload, and your booking numbers.

Device and usage: a push notification token for your phone, basic technical logs (such as IP address and errors) kept for security, and, only if you turn on usage analytics, the actions you take in the app (such as viewing a look or starting a booking).

2. Why we use it, and our lawful basis

To run your account and the service you asked for, including bookings, notifications and your page: this is necessary for our contract with you.

To keep Yasante safe: preventing fraud and misuse, checking stylists, handling reports and appeals, and keeping attendance records so stylists can trust requests. This is our legitimate interest in running a safe marketplace.

To improve Yasante with usage analytics, and to personalise what you see from your hair profile: only with your consent, which you can change at any time in Settings, Privacy and data.

To meet legal obligations, such as responding to lawful requests and keeping records the law requires.

We don't sell your personal information, and we don't use it for advertising.

3. Who sees what

Other people on Yasante see what you post publicly and your public profile. A stylist sees the details of requests you send her, including your attendance record. A client sees a stylist's address only once their appointment is confirmed. Looks and stylist pages you post publicly can also be seen on yasante.com.

We use a small number of service providers who process information on our behalf and under contract: Amazon Web Services (hosting, in the EU), Expo (sending push notifications), Google Firebase Cloud Messaging and Apple Push Notification service (delivering notifications to your phone). Where information leaves the UK, it is protected by the safeguards UK law requires, such as adequacy regulations or approved contract terms.

4. How long we keep it

We keep your information while your account is open. When you delete your account, we delete your profile, hair profile, looks, comments, collections and shelf. Stylists keep a record of appointments they had with you, without your name, for their business records. Security logs are kept for up to 90 days. Backups are overwritten within 7 days.

5. Your rights

You can ask to see, correct, download or delete your information, object to or restrict how we use it, and withdraw consent at any time. You can download your data and delete your account yourself in Settings, Privacy and data. For anything else, email privacy@yasante.com. We'll reply within one month.

If you're unhappy with how we've handled your information, please tell us first. You can also complain to the Information Commissioner's Office (ico.org.uk).

6. Children

Yasante is for people aged 18 and over. We don't knowingly collect information from children.

7. Security

Information is sent encrypted, sign-in tokens are kept in your phone's secure storage, private photos such as proof-of-work photos are never publicly reachable, and access to our systems is restricted to the people who need it.

8. Changes

If we change this policy in a way that matters, we'll tell you in the app. The version and date are at the top of this page.

9. Contact

privacy@yasante.com
"""


def publish(apps, schema_editor):
    PolicyDocument = apps.get_model("profiles", "PolicyDocument")
    for type_, title, body in (
        ("terms", "Terms of use", TERMS),
        ("privacy", "Privacy policy", PRIVACY),
    ):
        PolicyDocument.objects.get_or_create(
            type=type_,
            version=VERSION,
            defaults={"title": title, "body": body.strip(), "effective_at": EFFECTIVE, "published": True},
        )


def unpublish(apps, schema_editor):
    apps.get_model("profiles", "PolicyDocument").objects.filter(
        type__in=["terms", "privacy"], version=VERSION
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("profiles", "0004_policydocument")]
    operations = [migrations.RunPython(publish, unpublish)]
