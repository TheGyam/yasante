"""
Canaries for SEC-01: hostile text planted where people write, so a browser run can show
whether any of it turns into markup or script where others read it. Local database only.

  plant          write the canaries into the local test data (after env-up --reseed);
                 the list goes to qa/runs/<active run>/canaries.json
  hits [<run>]   what the canaries did in a qaweb run: every request the page made to
                 canary.invalid (qaweb aborts and journals it) and every browser pop-up.
                 Read-only; reads the run's journal, which qaweb wrote and hashes.

Each canary carries a code (C01…). A request to canary.invalid/<code><letter> means
that field's text was run as markup (m: an image tag, j: an event handler, a: broke out of
an attribute, s: broke out of a <script>). The text should show as written, nothing more.
"""

import datetime as dt
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

QA = Path(__file__).resolve().parent.parent
RUNS = QA / "runs"


def active_run():
    for name in (".active-web", ".active"):
        f = RUNS / name
        if f.exists():
            return f.read_text().strip()
    return None


def payload(code, limit):
    """As many of the probes as fit the field, each tagged with the code."""
    parts = [
        f"X{code}",
        f"<img src=//canary.invalid/{code}m>",  # short, so 50-character fields get a probe too
        f"<img src=x onerror=fetch('//canary.invalid/{code}j')>",
        f"\"><svg onload=fetch('//canary.invalid/{code}a')>",
        f"</script><script>fetch('//canary.invalid/{code}s')</script>",
        "{{7*7}}${7*7}",
    ]
    out = ""
    for p in parts:
        if len(out) + len(p) + 1 > limit:
            break
        out = f"{out} {p}".strip()
    return out


def post(path, body):
    req = urllib.request.Request(f"http://127.0.0.1:8000{path}", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        return urllib.request.urlopen(req, timeout=10).status
    except urllib.error.HTTPError as e:
        return e.code


def plant():
    sys.path.insert(0, str(QA.parent / "backend"))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    os.chdir(QA.parent / "backend")
    import django

    django.setup()
    from django.conf import settings
    from django.contrib.contenttypes.models import ContentType

    from apps.accounts.models import User
    from apps.bookings.models import Booking, Review
    from apps.looks.models import Appeal, Look, LookComment, ModerationAction, Report
    from apps.shelf.models import Product
    from apps.stylists.models import StylistProfile

    db = settings.DATABASES["default"]
    if db.get("HOST") not in ("127.0.0.1", "localhost") and "sqlite" not in db["ENGINE"]:
        sys.exit(f"refused: database host {db.get('HOST')!r} is not this laptop")
    run = active_run()
    if not run:
        sys.exit("no active run: `qaweb start <run-id>` first")

    efua = User.objects.get(email="client@yasante.dev")
    naomi = User.objects.get(email="naomi.grant@yasante.dev")
    ama = StylistProfile.objects.get(handle="braidsbyama")
    look = Look.objects.get(pk="0c9028cd-f011-52a7-922e-a7a1b917c981")
    review = Review.objects.filter(booking__stylist=ama.account, status="published").order_by("-created_at").first() \
        or Review.objects.filter(booking__stylist=ama.account).order_by("-created_at").first()
    menu = ama.menu_items.order_by("sort_order").first()
    planted = []
    # Positive control: a photo the site loads on purpose. Its request must show up as a
    # C00 hit, or the run can't detect anything and a clean result means nothing.
    StylistProfile.objects.filter(pk=ama.pk).update(avatar_uri="https://canary.invalid/C00m.jpg")
    planted.append({"code": "C00", "what": "stylists.StylistProfile.avatar_uri (control)", "id": str(ama.pk),
                    "text": "https://canary.invalid/C00m.jpg", "where": "site /braidsbyama: MUST hit"})

    def put(code, obj, field, where):
        limit = obj._meta.get_field(field).max_length or 1000
        text = payload(code, limit)
        type(obj).objects.filter(pk=obj.pk).update(**{field: text})
        planted.append({"code": code, "what": f"{obj._meta.label}.{field}", "id": str(obj.pk), "text": text, "where": where})

    put("C01", ama, "display_name", "site /braidsbyama (heading, title, JSON-LD); /looks; staff Stylists")
    put("C02", ama, "bio", "site /braidsbyama; staff Stylists record")
    put("C03", ama, "instagram_handle", "site /braidsbyama (Instagram link); staff Stylists record")
    put("C04", menu, "name", "site /braidsbyama (menu); studio Menu")
    put("C05", menu, "note", "site /braidsbyama (menu)")
    put("C06", look, "caption", "site /looks/<look> (text, meta description); /looks; staff Looks")
    put("C07", efua, "name", "staff People; studio Requests (client name); site look comments")
    put("C08", review, "body", "site /braidsbyama (reviews, JSON-LD); staff Reviews")
    put("C09", review, "author_name", "site /braidsbyama (reviews, JSON-LD); staff Reviews")
    comment = LookComment.objects.create(look=look, author=naomi, body="(canary)")
    Look.objects.filter(pk=look.pk).update(comment_count=look.comment_count + 1)
    put("C10", comment, "body", "site /looks/<look> (comments); staff Comments")
    report = Report.objects.create(reporter=naomi, reason="other", note="(canary)",
                                   content_type=ContentType.objects.get_for_model(Look), object_id=str(look.pk))
    put("C11", report, "note", "staff Reports queue")
    action = ModerationAction.objects.create(action="hide", reason="canary test", author=efua,
                                             content_type=ContentType.objects.get_for_model(Look), object_id=str(look.pk))
    Look.objects.filter(pk=look.pk).update(status="live")  # the action is only there to be appealed
    appeal = Appeal.objects.create(action=action, author=efua, body="(canary)")
    put("C12", appeal, "body", "staff Appeals queue")
    product = Product.objects.create(brand="(canary)", name="(canary)", category="oil", source="community",
                                     status="pending", added_by=efua, link="javascript:fetch('//canary.invalid/C13h')")
    put("C13", product, "name", "staff Products queue (name); its Link is a javascript: URL, code C13h")
    put("C14", product, "description", "staff Products queue / record")
    planted.append({"code": "C13h", "what": "shelf.Product.link", "id": str(product.pk),
                    "text": product.link, "where": "staff Products record: the Link field"})
    # A fresh request from Efua, for Ama's Requests page: a copy of a past booking of theirs.
    booking = Booking.objects.filter(client=efua, stylist=ama.account).order_by("-created_at").first()
    booking.pk, booking.status, booking.scheduled_for, booking.completed_at = None, "requested", None, None
    booking.requested_times = [(dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=5)).replace(
        hour=10, minute=0, second=0, microsecond=0)]
    booking.expires_at = dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=2)
    booking.save()
    put("C15", booking, "notes", "studio /requests/<booking> (Ama); staff Bookings")
    put("C16", booking, "client_name", "studio /requests and /requests/<booking> (Ama)")
    # Through the public endpoints, as anyone on the internet could send them.
    error_text = payload("C17", 480)
    status = post("/api/client-errors/", {"kind": "crash", "message": error_text, "stack": payload("C18", 2000),
                                          "platform": "android", "os_version": "14", "app_version": "qa-1.0.0",
                                          "context": {"path": "/qa-canary"}})
    planted.append({"code": "C17", "what": "client error message (public endpoint)", "id": f"HTTP {status}",
                    "text": error_text, "where": "staff Errors"})
    planted.append({"code": "C18", "what": "client error stack (public endpoint)", "id": f"HTTP {status}",
                    "text": payload("C18", 2000), "where": "staff Errors (the issue's detail)"})
    area = payload("C19", 100)
    status = post("/api/waitlist/", {"email": "qa.canary@yasante.dev", "role": "client", "area": area,
                                     "source": payload("C20", 100), "website": ""})
    planted.append({"code": "C19", "what": "waitlist area (public endpoint)", "id": f"HTTP {status}", "text": area,
                    "where": "staff Waitlist"})

    out = RUNS / run / "canaries.json"
    out.write_text(json.dumps({"planted_at": dt.datetime.now().isoformat(timespec="seconds"), "ids": {
        "look": str(look.pk), "review": str(review.pk), "product": str(product.pk), "appeal": str(appeal.pk),
        "booking": str(booking.pk), "efua": str(efua.pk), "ama": str(ama.account_id),
        "ama_profile": str(ama.pk), "comment": str(comment.pk), "report": str(report.pk)},
        "canaries": planted}, indent=1))
    with open(RUNS / run / "fixtures.log", "a") as f:
        f.write(f"{dt.datetime.now().isoformat(timespec='seconds')} canary plant: {len(planted)} canaries\n")
    for p in planted:
        print(f"{p['code']:5} {p['what']:42} {p['where']}")
    print(f"look {look.pk}\nbooking {booking.pk}\nproduct {product.pk}\nappeal {appeal.pk}\n"
          f"review {review.pk}\nama-profile {ama.pk}\ncomment {comment.pk}")
    print(f"list: {out.relative_to(QA.parent)}")


def hits(run):
    run = run or active_run()
    if not run:
        sys.exit("usage: canary hits <run-id>")
    journal = RUNS / run / "journal.jsonl"
    found = 0
    for line in journal.read_text().splitlines():
        e = json.loads(line)
        url = e.get("url", "")
        if e.get("cmd") == "blocked_request" and "canary.invalid" in url:
            code = re.search(r"canary\.invalid/(C\d+[a-z])", url)
            print(f"HIT    {e.get('host_time', '')} window={e.get('window')} {code.group(1) if code else url}")
            found += 1
        elif e.get("cmd") == "dialog":
            print(f"DIALOG {e.get('host_time', '')} window={e.get('window')} {e.get('type')} {str(e.get('message', ''))[:120]!r}")
            found += 1
    print(f"{found} canary hits and pop-ups in {journal.relative_to(QA.parent)}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["plant"]:
        plant()
    elif args[:1] == ["hits"]:
        hits(args[1] if len(args) > 1 else None)
    else:
        print(__doc__)
