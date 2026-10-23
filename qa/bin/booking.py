"""
bookings <email>                      every booking this account is in (as client or stylist)
bookings <email> <booking-id>         that booking as each side's app receives it
timewarp <booking-id> <field> <hours> set one of its clocks to now + hours (negative = past)
                                      fields: expires_at, scheduled_for, completed_at

Local test database only. `bookings` reads; `timewarp` is the one sanctioned write, for
time-based rules (48 h lapse, no-show after the start, check-ins two weeks on). Every
timewarp is logged to qa/runs/<active run>/timewarp.log.
"""

import json
import os
import sys
from datetime import timedelta
from pathlib import Path

QA = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(QA.parent / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
os.environ.pop("DEBUG", None)  # a stray shell DEBUG would override backend/.env
os.chdir(QA.parent / "backend")

import django  # noqa: E402

django.setup()

from django.db.models import Q  # noqa: E402
from django.utils import timezone  # noqa: E402

from apps.accounts.models import User  # noqa: E402
from apps.bookings.held import sweep  # noqa: E402
from apps.bookings.models import Booking  # noqa: E402
from apps.bookings.serializers import present_booking  # noqa: E402

# What each side must (or must not) be sent, shown for both.
SHOWN = ["status", "scheduled_for", "requested_times", "expires_at", "proposal", "move_request",
         "moves", "deposit", "price", "address", "calendar_url", "client_record", "client_hair",
         "attendance_confirmed_at", "reason", "timing", "contested", "review", "check_in_due",
         "completed_at", "actual_price", "started_on_time"]


def when(v):
    return v.strftime("%a %d %b %H:%M UTC") if v else "-"


def list_for(email):
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        print(f"no account with email {email}")
        return 1
    qs = Booking.objects.filter(Q(client=user) | Q(stylist=user))
    sweep(qs)  # the same lapses the app would see applied
    for b in qs.order_by("-created_at"):
        side = "client" if b.client_id == user.pk else "stylist"
        print(f"{b.pk} | as {side} | {b.status} | {b.service_name} | with "
              f"{b.stylist_name if side == 'client' else b.client_name} | "
              f"at {when(b.scheduled_for or (b.requested_times or [None])[0])} | "
              f"expires {when(b.expires_at)} | moves {b.moves}")
    print(f"{qs.count()} booking(s)")
    return 0


def show(email, pk):
    user = User.objects.filter(email__iexact=email).first()
    b = Booking.objects.filter(pk=pk).first()
    if not user or not b:
        print("no such account or booking")
        return 1
    sweep(Booking.objects.filter(pk=pk))
    b.refresh_from_db()
    for label, viewer in (("CLIENT sees", b.client), ("STYLIST sees", b.stylist)):
        data = present_booking(b, viewer)
        print(f"── {label} ({viewer.email})")
        for k in SHOWN:
            print(f"   {k}: {json.dumps(data.get(k), default=str)}")
    return 0


def timewarp(pk, field, hours):
    if field not in ("expires_at", "scheduled_for", "completed_at"):
        print("field must be expires_at, scheduled_for or completed_at")
        return 2
    b = Booking.objects.filter(pk=pk).first()
    if not b:
        print("no such booking")
        return 1
    before = getattr(b, field)
    after = timezone.now() + timedelta(hours=float(hours))
    setattr(b, field, after)
    b.save(update_fields=[field, "updated_at"])
    line = f"{timezone.now().isoformat()} timewarp {pk} {field}: {before} -> {after} (now {float(hours):+g} h)"
    active = QA / "runs" / ".active"
    if active.exists():
        with open(QA / "runs" / active.read_text().strip() / "timewarp.log", "a") as f:
            f.write(line + "\n")
    print(line)
    return 0


def main(tool, argv):
    if tool == "timewarp" and len(argv) == 3:
        return timewarp(*argv)
    if tool == "bookings" and len(argv) == 1:
        return list_for(argv[0])
    if tool == "bookings" and len(argv) == 2:
        return show(*argv)
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2:]))
