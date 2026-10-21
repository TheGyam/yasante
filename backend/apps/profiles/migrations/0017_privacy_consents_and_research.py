"""
Privacy policy 2026-10-20: hair details as their own consent, usage analytics off
until people say yes, research, the map services, cookies and storage, and how long
each thing is kept. Approved by Yaw on 20 and 21 October 2026. The earlier versions stay, so
every consent record still points at the text that was agreed to.
"""

from datetime import datetime, timezone

from django.db import migrations

VERSION = "2026-10-20"
EFFECTIVE = datetime(2026, 10, 20, tzinfo=timezone.utc)

BODY = """This policy explains what personal information Yasante collects, why, who sees it, and your rights. Yasante is responsible for your information as data controller. We follow UK data protection law (the UK GDPR and the Data Protection Act 2018) and, for people in the European Union, the EU GDPR. CYPA, [REGISTERED ADDRESS], company number [NUMBER]. Our representative in the European Union is Caleb Kyei (representative@yasante.com).

1. What we collect

Account details: your name, email address (which we confirm by emailing you a code), phone number if you add one, and password (stored only in scrambled form). If you choose to sign in with Apple or Google, they tell us your name, your email address (Apple can give us a private relay address instead) and an ID for your account with them, and you won't have a Yasante password. We never see your Apple or Google password. If you sign in with Apple, Apple also gives us a token we use only to disconnect your account from Apple when you delete it. If you choose to give it at sign-up, your age band (such as 25 to 34), never your date of birth.

Your hair details, if you choose to share them: your hair's texture, length, density and porosity, your goals, your scalp, any chemical treatments, your area and, if you add one, your postcode. We keep a history of changes, so you can see how your hair changes over time. After an appointment we ask how your style is holding, how your scalp feels and whether you'd book again. Your hair diary keeps the wash days, trims and take-downs you log, with the day and hour. Your product shelf remembers what your hair was like when you used each product. If you like, what you'd want for your next style: styles, length, colour, upkeep and time in the chair. When a style comes out, why, if you say; whether it hurt is only asked with your consent to use your hair details. Section 3 explains how we use all of this.

What you post and do: looks, captions, comments, reviews, collections, your product shelf, check-ins, care plans with their steps and the sessions you log, the looks and guides you like or save, reports you make and accounts you block. Looks and stylists you mark “Not for me” are kept so your feed shows fewer like them. Nobody else sees them.

Bookings: the stylist, service, times, deposit status, attendance, cancellations and reviews, what a booking is for, if you say (a wedding, a holiday or an event), your note to the stylist, your address if she comes to you, whether it started on time and how long it took, and alerts you ask for when a stylist has a free slot or opens her page. If you are a stylist: your page, services, prices, hours, area, address (shown to a client only once their appointment is confirmed), portfolio, verification checks such as your phone number and a proof-of-work photo, the payment details you give clients for deposits, your booking numbers and, if you note it, the extension hair you used at an appointment.

Device and usage: a push notification token for your phone, your phone's time zone so times show correctly, and basic technical logs (such as IP address and errors) kept for security. Usage analytics only if you turn them on (section 4).

What we never collect: your ethnicity or race, your precise or background location, your contacts, which other apps you use, or advertising IDs. We don't use ad networks or any third-party tracking.

2. Why we use it, and our lawful basis

To run your account and the service you asked for, including bookings, notifications and your page: this is necessary for our contract with you.

To keep Yasante safe: preventing fraud and misuse, checking stylists, handling reports and appeals, and keeping attendance records so stylists can trust requests. This is our legitimate interest in running a safe marketplace.

To use your hair details, to see how Yasante is used, and for research: only with your consent, asked for separately for each (sections 3 to 5). You can change each one at any time in Settings, Privacy and data.

To meet legal obligations, such as responding to lawful requests and keeping records the law requires.

We don't sell your personal information, and we don't use it for advertising.

3. Your hair details

Your hair's texture can say something about your ethnic background, and your scalp can say something about your health. The law treats both as special category information, so we only use your hair details with your explicit consent. We ask for it before your hair profile starts.

With your consent, we use your hair details to show you first the looks on hair like yours, and looks by stylists and with products seen on hair like yours; to suggest guides for your hair; and to show you insights about your own hair. A stylist you book sees your hair's texture, length and porosity, so she can prepare. Nobody else sees your hair details.

If you say no, Yasante still works, just without matching to your hair. If you turn it off later, we stop using your hair details from then on, and new bookings no longer share them with your stylist. Your hair profile stays saved for you to see, and you can turn the consent back on at any time.

We never guess your ethnicity, health or income from what you do on Yasante.

4. Usage analytics

Off until you say yes. With it on, we record the actions you take in the app, such as opening a look, searching or starting a booking, with the time, your phone's local time and the app version. We never record what you post, write or search for. If you turn it off, we stop at once and drop anything not yet sent to us. We keep these records for 12 months.

5. Research

Off until you say yes. If you say yes, your hair data can be part of anonymous research on hair, including reports for hair brands and studies with universities.

Research only ever uses totals, never your own record. Your name, your photos and anything you've written are never included. Every group in a result has at least 20 people; smaller groups are merged or left out. Places are given by area or region, never by postcode, and times by week or month, never the exact time.

You can stop at any time in Settings, Privacy and data, and you're left out of all research from then on. Totals published before you stopped can't be taken back, but they contain nothing that identifies you.

6. Who sees what

Other people on Yasante see what you post publicly and your public profile. A stylist sees the details of requests you send her, including your attendance record. A client sees a stylist's address only once their appointment is confirmed. Looks and stylist pages you post publicly can also be seen on yasante.com.

We use a small number of service providers who process information on our behalf and under contract: Amazon Web Services (hosting, in the EU), IONOS (sending account emails, such as sign-up codes and password reset links, in the EU), Expo (sending push notifications), Google Firebase Cloud Messaging and Apple Push Notification service (delivering notifications to your phone).

Two free map services help with places. When a stylist outside the UK types where she works, our server sends what she's typed, and her country, to Photon (run by komoot in Germany, using OpenStreetMap) to suggest area names. When you give a UK postcode, our server sends that postcode to postcodes.io (run by Ideal Postcodes in the UK) to find roughly where it is. Neither service is told who you are.

Where information leaves the UK, it is protected by the safeguards UK law requires, such as adequacy regulations or approved contract terms.

7. Cookies and storage

The website, yasante.com, sets no cookies. It keeps a few things in your browser's own storage, all needed for the site to work: your sign-in, for that tab only; a booking or a stylist page setup you've started, so a reload doesn't lose it; consent choices not yet sent to us; and a marker that stops the page reloading over and over after an update. The staff site, used only by the Yasante team, sets two essential cookies: one keeps staff signed in, and one protects their forms from forgery.

On your phone, the app keeps your sign-in in the phone's secure storage. It keeps your settings, drafts, recent searches, consent choices and any hair profile answers not yet sent to us on the phone itself. The app uses your recent searches to show you more looks in the styles you've searched for; it sends us those styles to order your feed, and we don't keep them. To open quickly, it also keeps a copy of screens you've seen recently, such as your profile, bookings and looks, for up to a day. With usage analytics on, it also keeps a random ID that is sent with your usage records.

8. How long we keep it

We keep your account information while your account is open. When you delete your account, we delete your profile, hair profile, looks, comments, collections, shelf, check-ins, care plans and consent records. Stylists keep a record of appointments they had with you, for their business records, without your name, hair details, notes or address. Reviews you left keep only their star rating.

Usage analytics: 12 months. Searches: kept without your name from the start, to see what people look for, and deleted after 12 months. Views of a stylist's page: who viewed is removed after 90 days; the counts stay, because the stylist sees them. Security logs and error reports: up to 90 days. Backups are overwritten within 7 days.

9. Your rights

You can ask to see, correct, download or delete your information, object to or restrict how we use it, and withdraw consent at any time. You can download your data and delete your account yourself in Settings, Privacy and data. For anything else, email privacy@yasante.com. We'll reply within one month.

If you're unhappy with how we've handled your information, tell us first. You can also complain to the Information Commissioner's Office (ico.org.uk) or, in the European Union, to the data protection authority where you live.

10. Children

Yasante is for people aged 18 and over. We don't knowingly collect information from children.

11. Security

Information is sent encrypted, sign-in tokens are kept in your phone's secure storage, private photos such as proof-of-work photos are never publicly reachable, and access to our systems is restricted to the people who need it.

12. Changes

If we change this policy in a way that matters, we'll tell you in the app. The version and date are at the top of this page.

13. Contact

privacy@yasante.com"""


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
        body=BODY,
        effective_at=EFFECTIVE,
        published=True,
    )


def unpublish(apps, schema_editor):
    apps.get_model("profiles", "PolicyDocument").objects.filter(type="privacy", version=VERSION).delete()


class Migration(migrations.Migration):
    dependencies = [("profiles", "0016_search_events_without_what_was_searched")]
    operations = [migrations.RunPython(publish, unpublish)]
