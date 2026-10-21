"""The team's vocabulary and navigation order, shared by every staff screen."""
import re
from django.utils import timezone

GROUPS = {
    "People": [("stylists.featuredpage", "Featured stylists", "Scissors", "Stylists featured with permission"), ("accounts.user", "People", "Users", "Accounts in your community"), ("stylists.stylistprofile", "Stylists", "Scissors", "People bringing their craft to Yasante"), ("profiles.hairprofile", "Hair profiles", "UserRound", "Preferences and hair care needs"), ("accounts.invite", "Invites", "Mail", "Welcome someone to Yasante"), ("web.waitlistentry", "Waitlist", "Clock", "People waiting to join")],
    "Bookings": [("bookings.booking", "Bookings", "Calendar", "Requests and appointments"), ("bookings.checkin", "Check-ins", "Heart", "How styles are holding up"), ("bookings.review", "Reviews", "Star", "Clients' appointment experiences"), ("bookings.slotinterest", "Slot interest", "Clock", "Demand for upcoming appointments")],
    "Content": [("looks.look", "Looks", "Image", "Styles shared by the community"), ("looks.lookcomment", "Comments", "MessageSquare", "Conversations around looks"), ("looks.style", "Styles", "Scissors", "The style catalogue"), ("content.tip", "Tips", "Lightbulb", "A little useful advice"), ("content.contentitem", "Articles", "BookOpen", "Guides and stories"), ("shelf.product", "Products", "Package", "The product catalogue"), ("shelf.shelfitem", "Shelf items", "Package", "What people are using"), ("planner.collection", "Collections", "Folder", "Saved inspiration"), ("planner.careplan", "Care plans", "Heart", "Hair care routines"), ("planner.careplansession", "Care plan sessions", "Check", "Completed care sessions"), ("stylists.portfoliophoto", "Portfolio photos", "Image", "Stylists' work"), ("stylists.menuitem", "Menu items", "List", "Services and prices")],
    "Messages": [("staff.broadcast", "Push notifications", "Send", "Messages to people's phones")],
    "Insights": [("common.errorissue", "Errors", "Activity", "Failures that need attention"), ("stylists.pageview", "Page views", "Eye", "Visits to stylist pages"), ("common.searchlog", "Searches", "Search", "What people are looking for"), ("feed.feedevent", "Feed activity", "Eye", "Looks people saw and opened in the feed"), ("profiles.analyticsevent", "Analytics events", "Activity", "How people use Yasante")],
    "System": [("common.clienterror", "Client errors", "Bug", "Individual error occurrences"), ("looks.moderationaction", "Moderation log", "Shield", "A record of moderation decisions"), ("looks.block", "Blocks", "Ban", "People's safety preferences"), ("looks.looklike", "Likes", "Heart", "Community favourites"), ("profiles.consentrecord", "Consent records", "Shield", "Permissions people have given"), ("profiles.policydocument", "Policy documents", "FileText", "Published policies"), ("profiles.hairprofilesnapshot", "Hair profile snapshots", "History", "Hair profiles over time"), ("accounts.devicetoken", "Device tokens", "Smartphone", "Push notification destinations"), ("accounts.emailchallenge", "Email challenges", "Mail", "Email verification attempts"), ("django_celery_beat.periodictask", "Scheduled jobs", "Clock", "Recurring background work"), ("django_celery_beat.intervalschedule", "Interval schedules", "Clock", "Repeat intervals"), ("django_celery_beat.crontabschedule", "Calendar schedules", "Clock", "Calendar schedules"), ("django_celery_beat.solarschedule", "Solar schedules", "Clock", "Sun-based schedules"), ("django_celery_beat.clockedschedule", "One-off schedules", "Clock", "One-off run times"), ("auth.group", "Groups and permissions", "Lock", "Team access"), ("token_blacklist.outstandingtoken", "Sign-in tokens", "KeyRound", "Issued sessions"), ("token_blacklist.blacklistedtoken", "Revoked tokens", "KeyRound", "Revoked sessions"), ("admin.logentry", "Staff activity", "History", "Who changed what and when"), ("features.switch", "Feature switches", "ToggleLeft", "Features turned on or off without an app update")],
    "Review": [("looks.report", "Reports", "Flag", "Reported looks, comments and profiles"), ("bookings.reviewreport", "Review reports", "Flag", "Reported appointment reviews"), ("looks.appeal", "Appeals", "Shield", "A second look at moderation decisions"), ("stylists.verification", "Stylist checks", "BadgeCheck", "Evidence for trusted stylist badges"), ("common.media", "Flagged photos", "Image", "Possible duplicate photos")],
}
NAMES = {key: {"name": name, "group": group, "icon": icon, "description": description, "order": order}
         for group, entries in GROUPS.items() for order, (key, name, icon, description) in enumerate(entries)}
for key, entry in NAMES.items():
    if key.startswith("django_celery_beat.") and not key.endswith("periodictask"):
        entry["parent"] = "django_celery_beat.periodictask"
    if key == "token_blacklist.blacklistedtoken":
        entry["parent"] = "token_blacklist.outstandingtoken"


# "New person", not "New user": the words on buttons follow the names above.
SINGULAR = {
    "accounts.user": "person", "stylists.stylistprofile": "stylist", "content.contentitem": "article",
    "looks.lookcomment": "comment", "common.errorissue": "error", "common.clienterror": "error report",
    "web.waitlistentry": "waitlist entry", "django_celery_beat.periodictask": "scheduled job",
    "auth.group": "group", "staff.broadcast": "push notification", "admin.logentry": "activity entry", "shelf.shelfitem": "shelf item",
}


def model_name(model):
    key = model._meta.label_lower
    entry = NAMES.get(key, {"name": str(model._meta.verbose_name_plural).capitalize(), "group": "System", "icon": "Settings", "description": "", "order": 100})
    return {**entry, "singular": SINGULAR.get(key, str(model._meta.verbose_name))}


def field_label(value):
    label = str(value).replace("_", " ")
    label = label[:1].upper() + label[1:]
    return re.sub(r"\b(id|url|uri|ip|uk|sms|otp)\b", lambda match: match[0].upper(), label, flags=re.I)


def saved_views(key):
    today = timezone.localdate().isoformat()
    presets = {
        "accounts.user": [("All", ""), ("Stylists", "roles__contains=stylist"), ("Staff", "is_staff__exact=1"), ("Unconfirmed email", "email_verified__exact=0")],
        "bookings.booking": [("Upcoming", f"scheduled_for__gte={today}&status__exact=confirmed"), ("Needs response", "status__exact=requested"), ("Past", f"scheduled_for__lt={today}"), ("All", "")],
        "looks.report": [("Open", "queue_status=open"), ("All", "queue_status=all")],
    }
    return [{"name": name, "query": query} for name, query in presets.get(key, [("All", "")])]
