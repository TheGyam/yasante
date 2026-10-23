"""
Staff-workspace helpers. Local test database only.

  setup                         (web-up runs this) the test staff accounts and their group,
                                reset: password password123, two-factor removed
  totp <email>                  the current authenticator code for a test staff account
  audit [N] [--who <email>]     the last N lines of staff activity (default 15), read-only
  pushlog <email> [N]           the last N notifications the server made for someone, read-only
  phones <email> [<email> …]    give these accounts a pretend Android phone, so push
                                notifications have somewhere to go (they are only logged)
  clienterror "<message>"       report an app error through the public endpoint, as a phone would

`phones` and `clienterror` are setup, run only where a plan step says so. Each is logged
to qa/runs/<active run>/fixtures.log.
"""

import datetime as dt
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

QA = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(QA.parent / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
os.environ.pop("DEBUG", None)  # a stray shell DEBUG would override backend/.env
os.chdir(QA.parent / "backend")

import django  # noqa: E402

django.setup()

from django.conf import settings  # noqa: E402
from django.utils import timezone  # noqa: E402

from apps.accounts.models import DeviceToken, User  # noqa: E402

PASSWORD = "password123"
LEAD = ("staff.lead@yasante.dev", "Esi Boateng")
HELPER = ("staff.helper@yasante.dev", "Kwame Asante")
STAFF_EMAILS = {LEAD[0], HELPER[0]}
GROUP = "QA moderators"
# What a moderator can do: the looks and review queues, and look people up. Not: show
# hidden personal details, send push notifications, errors, products, stylist checks.
GROUP_PERMS = [
    "looks.view_report", "looks.change_report", "looks.view_look", "looks.change_look",
    "looks.view_lookcomment", "looks.change_lookcomment", "looks.view_appeal", "looks.change_appeal",
    "looks.view_moderationaction", "bookings.view_review", "bookings.change_review",
    "bookings.view_reviewreport", "bookings.change_reviewreport", "bookings.view_booking",
    "accounts.view_user",
]


def fixture_log(line):
    active = QA / "runs" / ".active-web"
    if not active.exists():
        active = QA / "runs" / ".active"
    if active.exists():
        with open(QA / "runs" / active.read_text().strip() / "fixtures.log", "a") as f:
            f.write(f"{dt.datetime.now().isoformat(timespec='seconds')} {line}\n")


def setup():
    from django.contrib.auth.models import Group, Permission

    from apps.staff.models import StaffSecondFactor

    if getattr(settings, "PUSH_DELIVERY", "log") == "expo":
        sys.exit("PUSH_DELIVERY=expo in backend/.env: a test could reach real phones. Remove it first.")
    group, _ = Group.objects.get_or_create(name=GROUP)
    perms = []
    for label in GROUP_PERMS:
        app, code = label.split(".")
        perms.append(Permission.objects.get(content_type__app_label=app, codename=code))
    group.permissions.set(perms)
    for (email, name), superuser in ((LEAD, True), (HELPER, False)):
        user = User.objects.filter(email=email).first() or User(email=email)
        user.name, user.is_staff, user.is_superuser, user.is_active = name, True, superuser, True
        user.email_verified, user.age_confirmed = True, True
        user.set_password(PASSWORD)
        user.save()
        user.groups.set([] if superuser else [group])
        StaffSecondFactor.objects.filter(user=user).delete()
        DeviceToken.objects.filter(user=user).delete()
        print(f"staff: {email} ({name}) {'superuser' if superuser else 'staff in ' + GROUP}; password {PASSWORD}; two-factor not set up")


def totp(email):
    from apps.staff.models import StaffSecondFactor
    from apps.staff.totp import code

    if email.lower() not in STAFF_EMAILS:
        sys.exit("totp: only the test staff accounts (" + ", ".join(sorted(STAFF_EMAILS)) + ")")
    factor = StaffSecondFactor.objects.filter(user__email=email.lower()).first()
    if not factor or not factor.secret:
        sys.exit("totp: no authenticator secret yet. Open the two-factor screen first (sign in with the password).")
    secret = factor.get_secret()
    while True:
        now = time.time()
        step, left = int(now) // 30, 30 - int(now) % 30
        # A code can be used once; one with under 6 s to live may expire before it is typed.
        if step > factor.last_used_step and left >= 6:
            break
        time.sleep(left + 0.2)
        factor.refresh_from_db()
    print(f"code {code(secret, step)}  (valid for {left} more seconds; {'enrolment' if factor.confirmed_at is None else 'sign-in'})")


def audit(args):
    from django.contrib.admin.models import LogEntry

    n = int(args[0]) if args and args[0].isdigit() else 15
    rows = LogEntry.objects.select_related("user", "content_type").order_by("-action_time")
    if "--who" in args:
        rows = rows.filter(user__email=args[args.index("--who") + 1].lower())
    for e in reversed(list(rows[:n])):
        kind = e.content_type.model if e.content_type else "-"
        when = timezone.localtime(e.action_time).strftime("%H:%M:%S")
        print(f"{when}  {e.user.email:28} {kind:18} {e.object_repr[:40]!r:44} {e.get_change_message()[:160]}")


def pushlog(email, n="10"):
    from apps.common.models import NotificationLog

    rows = NotificationLog.objects.filter(user__email=email.lower()).order_by("-created_at")[: int(n)]
    if not rows:
        print(f"no notifications for {email}")
    for r in reversed(list(rows)):
        when = timezone.localtime(r.created_at).strftime("%H:%M:%S")
        print(f"{when}  {r.category:10} {r.status:10} {r.title!r} — {r.body[:100]!r} data={json.dumps(r.data)[:80]}")


def phones(emails):
    for email in emails:
        user = User.objects.filter(email=email.lower()).first()
        if not user:
            sys.exit(f"phones: no account {email}")
        token = f"ExponentPushToken[qa-{user.pk.hex[:12]}]"
        DeviceToken.objects.update_or_create(token=token, defaults={"user": user, "platform": "android"})
        fixture_log(f"phones {email} -> {token}")
        print(f"{email}: pretend Android phone {token}")


def clienterror(message):
    body = json.dumps({"kind": "crash", "message": message, "stack": f"Error: {message}\n    at QaFixture (qa/bin/staff.py:1:1)",
                       "platform": "android", "os_version": "14", "app_version": "qa-1.0.0",
                       "context": {"path": "/qa-fixture", "device": "Pixel 8 (emulator)"}}).encode()
    req = urllib.request.Request("http://127.0.0.1:8000/api/client-errors/", data=body,
                                 headers={"Content-Type": "application/json"}, method="POST")
    status = urllib.request.urlopen(req, timeout=10).status
    fixture_log(f"clienterror {message!r} -> HTTP {status}")
    print(f"reported {message!r}: HTTP {status}")


def main(argv):
    cmd, args = (argv[0], argv[1:]) if argv else ("help", [])
    if cmd == "setup":
        setup()
    elif cmd == "totp" and args:
        totp(args[0])
    elif cmd == "audit":
        audit(args)
    elif cmd == "pushlog" and args:
        pushlog(*args[:2])
    elif cmd == "phones" and args:
        phones(args)
    elif cmd == "clienterror" and args:
        clienterror(args[0])
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
