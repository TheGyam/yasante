"""
The privacy policy, terms of use and community guidelines for sharing collections and
care plans (docs/SHARING_PLAN.md, appendices A and B): what others see of something
shared, tagging along, making your own version, reminders set on the phone, and that
"More like this" records what's shown there. Also fixes a broken sentence in the
opening and leaves out the staff site's cookies, which only the Yasante team meets. Approved by Yaw on 22 October 2026; merging
publishes them. Earlier versions stay, so every consent record still points at the text
agreed to.
"""

from django.db import migrations
from django.utils import timezone

VERSION = "2026-10-24"

PRIVACY = """This policy explains what personal information Yasante collects, why, who sees it, and your rights. Yasante is responsible for your information as data controller. We follow UK data protection law (the UK GDPR and the Data Protection Act 2018) and, for people in the European Union, the EU GDPR. If you have a question about your information, email privacy@yasante.com. Our representative in the European Union is Caleb Kyei (representative@yasante.com).

1. What we collect

Account details: your name, email address (which we confirm by emailing you a code), phone number if you add one, and password (stored only in scrambled form). If you choose to sign in with Apple or Google, they tell us your name, your email address (Apple can give us a private relay address instead) and an ID for your account with them, and you won't have a Yasante password. We never see your Apple or Google password. If you sign in with Apple, Apple also gives us a token we use only to disconnect your account from Apple when you delete it. If you choose to give it at sign-up, your age band (such as 25 to 34), never your date of birth.

Your hair details, if you choose to share them: your hair's texture, length, density and porosity, your goals, your scalp, any chemical treatments, your area and, if you add one, your postcode. We keep a history of changes, so you can see how your hair changes over time. After an appointment we ask how your style is holding, how your scalp feels and whether you'd book again. Your hair diary keeps the wash days, trims and take-downs you log, with the day and hour. Your product shelf remembers what your hair was like when you used each product. If you like, what you'd want for your next style: styles, length, colour, upkeep and time in the chair. When a style comes out, why, if you say; whether it hurt is only asked with your consent to use your hair details. Section 3 explains how we use all of this.

What you post and do: looks, captions, comments, reviews, collections, your product shelf, check-ins, care plans with their steps and the sessions you log, collections and care plans you share, and the ones you tag along with or make your own, the looks and guides you like or save, reports you make and accounts you block. Looks and stylists you mark “Not for me” are kept so your feed shows fewer like them. Nobody else sees them.

Bookings: the stylist, service, times, deposit status, attendance, cancellations and reviews, what a booking is for, if you say (a wedding, a holiday or an event), your note to the stylist, your address if she comes to you, whether it started on time and how long it took, and alerts you ask for when a stylist has a free slot or opens her page. If you are a stylist: your page, services, prices, hours, area, address (shown to a client only once their appointment is confirmed), portfolio, verification checks such as your phone number and a proof-of-work photo, the payment details you give clients for deposits, your booking numbers and, if you note it, the extension hair you used at an appointment.

Device and usage: a push notification token for your phone, your phone's time zone so times show correctly, and basic technical logs (such as IP address and errors) kept for security. Usage analytics only if you turn them on (section 4). What you do in the feed: which looks you're shown, which you open and how long you stay on them.

What we never collect: your ethnicity or race, your precise or background location, your contacts, which other apps you use, or advertising IDs. We don't use ad networks or any third-party tracking.

2. Why we use it, and our lawful basis

To run your account and the service you asked for, including bookings, notifications and your page: this is necessary for our contract with you.

To keep Yasante safe: preventing fraud and misuse, checking stylists, handling reports and appeals, and keeping attendance records so stylists can trust requests. This is our legitimate interest in running a safe marketplace.

To use your hair details, to see how Yasante is used, and for research: only with your consent, asked for separately for each (sections 3 to 5). You can change each one at any time in Settings, Privacy and data.

To choose and order what you see in your feed, in "More like this" and in "Stylists for you", and for some notifications: we use what you do on Yasante, such as the looks you like, save, comment on, open and spend time on, the stylists you book or visit, and what you mark "Not for me". This is our legitimate interest in showing you what's relevant to you. We never use it to guess your hair type, ethnicity, health or income. You can choose Latest at the top of the feed to see the newest looks with nothing personal, and a look's menu tells you why it's in your feed.

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

Other people on Yasante see what you post publicly and your public profile. If you share a collection or a care plan, anyone with its link can see its name and what's in it (for a care plan, its steps), with your name, username and photo. They can tag along, which keeps it in their Planner as you change it, or make their own version, which says it's based on yours and names you. You see how many people tag along and made it theirs, never who. Nothing else of yours is shown: not your hair details, your schedule, your reminders or the days you did a plan. You can stop sharing at any time, and the link stops working straight away. A stylist sees the details of requests you send her, including your attendance record. A client sees a stylist's address only once their appointment is confirmed. Looks and stylist pages you post publicly can also be seen on yasante.com.

We use a small number of service providers who process information on our behalf and under contract: Amazon Web Services (hosting, in the EU), IONOS (sending account emails, such as sign-up codes and password reset links, in the EU), Expo (sending push notifications), Google Firebase Cloud Messaging and Apple Push Notification service (delivering notifications to your phone).

Two free map services help with places. When a stylist outside the UK types where she works, our server sends what she's typed, and her country, to Photon (run by komoot in Germany, using OpenStreetMap) to suggest area names. When you give a UK postcode, our server sends that postcode to postcodes.io (run by Ideal Postcodes in the UK) to find roughly where it is. Neither service is told who you are.

Where information leaves the UK, it is protected by the safeguards UK law requires, such as adequacy regulations or approved contract terms.

7. Cookies and storage

The website, yasante.com, sets no cookies. It keeps a few things in your browser's own storage, all needed for the site to work: your sign-in, for that tab only; a booking or a stylist page setup you've started, so a reload doesn't lose it; consent choices not yet sent to us; and a marker that stops the page reloading over and over after an update.

On your phone, the app keeps your sign-in in the phone's secure storage. It keeps your settings, drafts, recent searches, consent choices and any hair profile answers not yet sent to us on the phone itself. The app uses your recent searches to show you more looks in the styles you've searched for; it sends us those styles to order your feed, and we don't keep them. To open quickly, it also keeps a copy of screens you've seen recently, such as your profile, bookings and looks, for up to a day. With usage analytics on, it also keeps a random ID that is sent with your usage records. Care plan reminders are set on your phone itself, for the days and time of day you choose.

8. How long we keep it

We keep your account information while your account is open. When you delete your account, we delete your profile, hair profile, looks, comments, collections, shelf, check-ins, care plans and consent records. Anything you shared stops being shared, so people tagging along lose it; versions others made their own stay theirs, without your name. Stylists keep a record of appointments they had with you, for their business records, without your name, hair details, notes or address. Reviews you left keep only their star rating.

Usage analytics: 12 months. Searches: kept without your name from the start, to see what people look for, and deleted after 12 months. Views of a stylist's page: who viewed is removed after 90 days; the counts stay, because the stylist sees them. What you're shown and open in the feed and in "More like this": 90 days. Security logs and error reports: up to 90 days. Backups are overwritten within 7 days.

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

You keep ownership of the photos and words you post. You give Yasante a non-exclusive, worldwide, royalty-free licence to host, show, resize and share them within Yasante and on yasante.com, and to show them when promoting Yasante, for as long as they are on the service. You can delete them at any time. If you delete your account, reviews you left keep only their star rating, without your name or words.

If you share a collection or a care plan, you let others with the link view it, tag along and make their own version of it. You can stop sharing at any time; versions others have made stay theirs.

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

GUIDELINES = """Yasante is for finding, sharing and booking hair: braids, locs, twists, natural styles and the people who do them. These guidelines keep it a good place to be. They apply to everything you post — looks, comments, reviews, profiles, stylist pages, messages in a booking, and the collections and care plans you share — and they sit alongside our Terms of use.

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

Nothing illegal, and nothing that encourages harm, including unsafe hair or scalp treatments. Care plans you share must be safe to follow. Don't share steps that could harm someone's hair, scalp or health, such as leaving chemicals on longer than their instructions say, or medical advice. Collection and care plan names follow the same rules as captions.

Reporting and blocking

You can report any look, comment, review, stylist or person from the app, including anything illegal or that puts someone in danger, and block anyone so you no longer see each other. Anyone, with or without an account, can also report by emailing support@yasante.com. A person reviews every report, and we aim to act within 24 hours, dealing first with anything that could put a child or anyone else in danger. If we remove something of yours, we'll tell you why, and you can appeal from the app. If you're unhappy with how we handled something, email support@yasante.com and we'll reply within 14 days.

Contact

Questions about these guidelines: support@yasante.com."""


def publish(apps, schema_editor):
    PolicyDocument = apps.get_model("profiles", "PolicyDocument")
    for type_, body in (("privacy", PRIVACY), ("terms", TERMS), ("guidelines", GUIDELINES)):
        previous = PolicyDocument.objects.filter(type=type_, published=True).order_by("-effective_at").first()
        if previous is None or PolicyDocument.objects.filter(type=type_, version=VERSION).exists():
            continue
        PolicyDocument.objects.create(
            # In force from when it's published.
            type=type_, version=VERSION, title=previous.title, body=body, effective_at=timezone.now(), published=True
        )


def unpublish(apps, schema_editor):
    apps.get_model("profiles", "PolicyDocument").objects.filter(
        type__in=["privacy", "terms", "guidelines"], version=VERSION
    ).delete()


class Migration(migrations.Migration):
    # In this app, not profiles, so it can't clash with another policy change in flight.
    dependencies = [
        ("planner", "0004_sharing"),
        ("feed", "0005_privacy_policy_for_the_feed"),
        ("profiles", "0019_stylist_terms_and_guidelines"),
    ]
    operations = [migrations.RunPython(publish, unpublish)]
