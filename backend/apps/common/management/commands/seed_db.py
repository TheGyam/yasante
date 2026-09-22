"""
Load seed.json — the app's own mock data — into the database.

`python manage.py seed_db` wipes the app's tables and loads everything: accounts
and hair profiles, stylists with menus, hours, payment details and portfolios,
looks with styles, likes, threaded comments and comment likes, collections,
bookings in every state, reviews, the waitlist, shelves and care plans.

Mock ids ("acc_client", "look_c_7") become stable UUIDs, so a re-seed gives the
same ids every time. Every account's password is `password123`.
"""

import json
import os
import uuid

from dateutil import parser
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

NAMESPACE = uuid.uuid5(uuid.NAMESPACE_DNS, "yasante.dev")
PASSWORD = "password123"


def uid(mock_id):
    return uuid.uuid5(NAMESPACE, str(mock_id)) if mock_id else None


def when(value):
    return parser.isoparse(value) if value else None


SNAKE = {
    "noticeHours": "notice_hours",
    "depositType": "deposit_type",
    "depositAmount": "deposit_amount",
    "rescheduleFreeOnce": "reschedule_free_once",
    "scheduledFor": "scheduled_for",
}


def snake(d):
    if isinstance(d, dict):
        return {SNAKE.get(k, k): snake(v) for k, v in d.items()}
    return d


def thumb(uri):
    return uri.replace("w=800", "w=400") if uri and "unsplash.com" in uri else ""


class Command(BaseCommand):
    help = "Wipe the app's tables and load backend/seed.json."

    def handle(self, *args, **options):
        from apps.accounts.models import Invite, User
        from apps.bookings.models import Booking, Review, SlotInterest
        from apps.looks.models import CommentLike, Look, LookComment, LookLike, Style
        from apps.planner.models import (
            CarePlan,
            CarePlanSession,
            CarePlanStep,
            Collection,
            CollectionItem,
        )
        from apps.profiles.models import HairProfile
        from apps.shelf.models import Product, ShelfItem
        from apps.stylists.models import (
            MenuItem,
            PageView,
            PaymentMethod,
            PortfolioPhoto,
            StylistProfile,
        )
        from apps.stylists.numbers import recompute_public_stats

        path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", "seed.json"
        )
        with open(os.path.normpath(path), encoding="utf-8") as f:
            data = json.load(f)

        password = make_password(PASSWORD)
        now = timezone.now()

        with transaction.atomic():
            for model in (
                CommentLike, LookComment, LookLike, CollectionItem, Collection,
                CarePlanSession, CarePlanStep, CarePlan, ShelfItem, Product, Review,
                SlotInterest, Booking, PageView, PortfolioPhoto, MenuItem, PaymentMethod,
                Look, Style, StylistProfile, HairProfile, Invite,
            ):
                model.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()

            # Accounts and hair profiles.
            users = {}
            emails = set()
            for acc in data["accounts"]:
                # Two generated people can share a name; emails must stay unique.
                email = acc["email"].lower()
                local, domain = email.split("@")
                n = 2
                while email in emails:
                    email = f"{local}{n}@{domain}"
                    n += 1
                emails.add(email)
                user = User.objects.create(
                    id=uid(acc["id"]),
                    email=email,
                    name=acc["name"],
                    password=password,
                    phone=acc.get("phone", ""),
                    phone_verified=acc.get("phoneVerified", False),
                    roles=acc.get("roles", ["client"]),
                    avatar_uri=acc.get("avatarUri", ""),
                    age_confirmed=True,
                    policy_version="seed",
                )
                users[acc["id"]] = user
                hp = acc.get("hairProfile")
                if hp:
                    HairProfile.objects.create(
                        user=user,
                        **{
                            field: hp.get(key, default)
                            for field, key, default in (
                                ("texture", "texture", ""),
                                ("length", "length", ""),
                                ("shrunk_length", "shrunkLength", ""),
                                ("density", "density", ""),
                                ("porosity", "porosity", ""),
                                ("goals", "goals", []),
                                ("scalp", "scalp", []),
                                ("chemicals", "chemicals", []),
                                ("area", "area", ""),
                                ("budget", "budget", ""),
                            )
                        },
                        length_measured_at=when(hp.get("lengthMeasuredAt")),
                        completed_at=when(hp.get("completedAt")),
                    )

            # Stylists, payment details, menus, portfolios.
            profiles = {}
            for s in data["stylists"]:
                pol = s.get("policies", {})
                profile = StylistProfile.objects.create(
                    id=uid(s["id"]),
                    account=users[s["accountId"]],
                    display_name=s["displayName"],
                    handle=s["handle"],
                    bio=s.get("bio", ""),
                    avatar_uri=s.get("avatarUri", ""),
                    service_models=s.get("serviceModels", []),
                    base_area=s.get("baseArea", ""),
                    address=f"12 Bellenden Road, {s.get('baseArea', '')}",
                    travel_radius_miles=s.get("travelRadiusMiles"),
                    instagram_handle=s.get("instagramHandle", ""),
                    notice_hours=pol.get("noticeHours", 24),
                    deposit_type=pol.get("depositType", "none"),
                    deposit_amount=pol.get("depositAmount"),
                    reschedule_free_once=pol.get("rescheduleFreeOnce", True),
                    availability=s.get("availability") or {},
                    verification_tier=s.get("verificationTier", 0),
                    published=s.get("published", False),
                )
                profiles[s["accountId"]] = profile
                for m in s.get("paymentMethods") or []:
                    PaymentMethod.objects.create(
                        stylist=profile, label=m["label"], details=m["details"]
                    )

            for menu in data["menus"]:
                profile = profiles.get(menu["accountId"])
                for order, item in enumerate(menu["items"] if profile else []):
                    MenuItem.objects.create(
                        id=uid(item["id"]),
                        stylist=profile,
                        name=item["name"],
                        price=item["price"],
                        from_price=item.get("fromPrice", False),
                        duration_minutes=item.get("durationMinutes"),
                        note=item.get("note", ""),
                        hair_included=item.get("hairIncluded", False),
                        options=item.get("options", []),
                        sort_order=order,
                    )

            for port in data.get("portfolios", []):
                profile = profiles.get(port["accountId"])
                for photo in port["photos"] if profile else []:
                    PortfolioPhoto.objects.create(
                        id=uid(photo["id"]),
                        stylist=profile,
                        uri=photo["uri"],
                        thumb_uri=thumb(photo["uri"]),
                        service_id=uid(photo.get("serviceId")),
                    )

            # The taxonomy and the catalogue.
            styles = {}
            for order, st in enumerate(data["styles"]):
                styles[st["id"]] = Style.objects.create(slug=st["id"], name=st["name"], sort_order=order)
            products = {}
            for p in data["products"]:
                products[p["id"]] = Product.objects.create(
                    id=uid(p["id"]), brand=p["brand"], name=p["name"], category=p["category"]
                )

            # Looks, then likes, comments and comment likes, with their counts.
            looks = {}
            for lk in data["looks"]:
                author = users.get(lk["authorId"])
                if author is None:
                    continue
                stylist = profiles.get(lk.get("stylistId"))
                look = Look.objects.create(
                    id=uid(lk["id"]),
                    author=author,
                    photo_uri=lk["photoUri"],
                    thumb_uri=thumb(lk["photoUri"]),
                    photo_aspect=0,
                    caption=lk.get("caption") or "",
                    visibility=lk.get("visibility", "public"),
                    hair_texture=lk.get("hairTexture") or "",
                    stylist_id=str(stylist.account_id) if stylist else "",
                    stylist_name=stylist.display_name if stylist else "",
                    stylist_handle=stylist.handle if stylist else "",
                    service_id=str(uid(lk["serviceId"])) if lk.get("serviceId") else "",
                    service_name=lk.get("serviceName") or "",
                    price=lk.get("price"),
                    from_price=bool(lk.get("fromPrice")),
                    area=stylist.base_area if stylist else "",
                )
                Look.objects.filter(pk=look.pk).update(created_at=when(lk["createdAt"]))
                look.styles.set([styles[s] for s in lk.get("styles", []) if s in styles])
                look.products.set(
                    [products[p] for p in lk.get("productIds") or [] if p in products]
                )
                looks[lk["id"]] = look

            like_rows = []
            like_counts = {}
            for entry in data["likes"]:
                look = looks.get(entry["lookId"])
                for user_id in entry["userIds"] if look else []:
                    if user_id in users:
                        like_rows.append(LookLike(user=users[user_id], look=look))
                        like_counts[look.pk] = like_counts.get(look.pk, 0) + 1
            LookLike.objects.bulk_create(like_rows, ignore_conflicts=True)

            comments = {}
            names = {k: (profiles[k].display_name if k in profiles else u.name) for k, u in users.items()}
            by_id = {c["id"]: c for c in data["comments"]}
            comment_rows = []
            comment_counts = {}
            for c in data["comments"]:
                look = looks.get(c["lookId"])
                if look is None or c["authorId"] not in users:
                    continue
                answered = by_id.get(c.get("replyToId"))
                row = LookComment(
                    id=uid(c["id"]),
                    look=look,
                    author=users[c["authorId"]],
                    body=c["body"],
                    parent_id=uid(c.get("parentId")),
                    reply_to_id=uid(c.get("replyToId")),
                    reply_to_name=names.get(answered["authorId"], "") if answered else "",
                )
                comment_rows.append((row, when(c["createdAt"])))
                comment_counts[look.pk] = comment_counts.get(look.pk, 0) + 1
                comments[c["id"]] = row
            # Parents first, so a reply never points at a row that isn't there yet.
            comment_rows.sort(key=lambda r: (r[0].parent_id is not None, r[1]))
            LookComment.objects.bulk_create([r for r, _ in comment_rows])
            for row, created in comment_rows:
                row.created_at = created
            LookComment.objects.bulk_update([r for r, _ in comment_rows], ["created_at"])

            comment_like_rows = []
            comment_like_counts = {}
            for entry in data["commentLikes"]:
                comment = comments.get(entry["commentId"])
                for user_id in entry["userIds"] if comment else []:
                    if user_id in users:
                        comment_like_rows.append(CommentLike(user=users[user_id], comment=comment))
                        comment_like_counts[comment.pk] = comment_like_counts.get(comment.pk, 0) + 1
            CommentLike.objects.bulk_create(comment_like_rows, ignore_conflicts=True)
            for pk, n in comment_like_counts.items():
                LookComment.objects.filter(pk=pk).update(like_count=n)

            # Collections and the save counts they give looks.
            savers = {}
            for entry in data["collections"]:
                owner = users.get(entry["accountId"])
                for col in entry["collections"] if owner else []:
                    collection = Collection.objects.create(
                        id=uid(col["id"]),
                        user=owner,
                        name=col["name"],
                        is_private=col.get("isPrivate", True),
                    )
                    for item in col.get("items", []):
                        look = looks.get(item["refId"]) if item["kind"] == "look" else None
                        CollectionItem.objects.get_or_create(
                            collection=collection,
                            kind=item["kind"],
                            ref_id=str(look.pk) if look else item["refId"],
                            defaults={
                                "photo_uri": item.get("imageUri") or "",
                                "thumb_uri": thumb(item.get("imageUri") or ""),
                                "title": (item.get("title") or "")[:150],
                            },
                        )
                        if look:
                            savers.setdefault(look.pk, set()).add(owner.pk)

            for look in looks.values():
                Look.objects.filter(pk=look.pk).update(
                    like_count=like_counts.get(look.pk, 0),
                    comment_count=comment_counts.get(look.pk, 0),
                    save_count=len(savers.get(look.pk, ())),
                )

            # Bookings in every state, then reviews and the waitlist.
            for bk in data["bookings"]:
                client, stylist = users.get(bk["clientId"]), users.get(bk["stylistId"])
                profile = profiles.get(bk["stylistId"])
                if not (client and stylist and profile):
                    continue
                deposit = bk.get("deposit") or {}
                timing = bk.get("timing") or {}
                booking = Booking.objects.create(
                    id=uid(bk["id"]),
                    status=bk["status"],
                    client=client,
                    client_name=bk["clientName"],
                    stylist=stylist,
                    stylist_profile=profile,
                    stylist_name=bk["stylistName"],
                    stylist_handle=bk.get("stylistHandle", ""),
                    service_id=uid(bk["serviceId"]),
                    service_name=bk["serviceName"],
                    option_labels=bk.get("optionLabels") or [],
                    price=bk["price"],
                    from_price=bk.get("fromPrice", False),
                    duration_minutes=bk.get("durationMinutes"),
                    bringing_own_hair=bk.get("bringingOwnHair", False),
                    hair_included=bk.get("hairIncluded", False),
                    notes=bk.get("notes") or "",
                    requested_times=[when(t) for t in bk.get("requestedTimes", [])],
                    scheduled_for=when(bk.get("scheduledFor")),
                    expires_at=when(bk.get("expiresAt")),
                    proposal=snake(bk.get("proposal")),
                    attendance_confirmed_at=when(bk.get("attendanceConfirmedAt")),
                    moves=bk.get("moves", 0),
                    move_request=snake(bk.get("moveRequest")),
                    deposit_amount=deposit.get("amount"),
                    deposit_method=deposit.get("method", ""),
                    deposit_status=deposit.get("status", ""),
                    area=bk.get("area", ""),
                    address=bk.get("address", ""),
                    policy=snake(bk.get("policy") or {}),
                    policy_version=bk.get("policyVersion", "seed"),
                    reason=bk.get("reason") or "",
                    completed_at=when(bk.get("completedAt")),
                    actual_price=bk.get("actualPrice"),
                    timing_outcome=timing.get("outcome", ""),
                    timing_bucket=timing.get("bucket") or "",
                    timing_reason=timing.get("reason") or "",
                    started_on_time=bk.get("startedOnTime"),
                    responded_at=(
                        when(bk.get("createdAt"))
                        if bk["status"] not in ("requested", "expired")
                        else None
                    ),
                )
                Booking.objects.filter(pk=booking.pk).update(created_at=when(bk["createdAt"]))

            for rv in data["reviews"]:
                booking = Booking.objects.filter(pk=uid(rv["bookingId"])).first()
                if booking:
                    review = Review.objects.create(
                        id=uid(rv["id"]),
                        booking=booking,
                        rating=rv["rating"],
                        body=rv.get("body") or "",
                        status=rv.get("status", "published"),
                        author_name=rv.get("authorName", ""),
                        service_name=rv.get("serviceName", ""),
                    )
                    Review.objects.filter(pk=review.pk).update(created_at=when(rv["createdAt"]))

            for si in data.get("slotInterests", []):
                if si["clientId"] in users and si["stylistId"] in profiles:
                    profile = profiles[si["stylistId"]]
                    SlotInterest.objects.create(
                        id=uid(si["id"]),
                        client=users[si["clientId"]],
                        stylist=profile.account,
                        stylist_name=profile.display_name,
                        stylist_handle=profile.handle,
                        from_date=when(si["from"]).date(),
                        to_date=when(si["to"]).date(),
                        opened_on=when(si["openedOn"]).date() if si.get("openedOn") else None,
                    )

            # Shelves and care plans.
            for shelf in data.get("shelves", []):
                owner = users.get(shelf["accountId"])
                for item in shelf["items"] if owner else []:
                    product = products.get(item["product"]["id"])
                    if product:
                        row = ShelfItem.objects.create(
                            id=uid(item["id"]),
                            user=owner,
                            product=product,
                            status=item["status"],
                            rating=item.get("rating"),
                            times_bought=item.get("timesBought", 1),
                            finished_at=when(item.get("finishedAt")),
                        )
                        ShelfItem.objects.filter(pk=row.pk).update(created_at=when(item["startedAt"]))

            for entry in data.get("carePlans", []):
                owner = users.get(entry["accountId"])
                for plan in entry["plans"] if owner else []:
                    row = CarePlan.objects.create(
                        id=uid(plan["id"] + entry["accountId"]),
                        user=owner,
                        name=plan["name"],
                        frequency=plan["frequency"],
                        specific_days=plan.get("specificDays") or [],
                        time_of_day=plan["timeOfDay"],
                        reminders_on=plan.get("remindersOn", False),
                        last_done_at=when(plan.get("lastDoneAt")),
                    )
                    for order, step in enumerate(plan.get("steps", [])):
                        CarePlanStep.objects.create(plan=row, text=step["text"], sort_order=order)
                    for session in plan.get("sessions", []):
                        CarePlanSession.objects.create(
                            plan=row,
                            user=owner,
                            completed_at=when(session["completedAt"]),
                            notes=session.get("notes") or "",
                        )

            for inv in data.get("invites", []):
                Invite.objects.create(
                    code=inv["code"],
                    role=inv.get("role", "stylist"),
                    invited_by=inv.get("invitedBy", "Yasante"),
                    expires_at=now + timezone.timedelta(days=365),
                    redeemed_by=users.get(inv.get("redeemedBy")),
                )

            for v in data.get("pageViews", []):
                if v["stylistId"] in profiles:
                    view = PageView.objects.create(stylist=profiles[v["stylistId"]])
                    PageView.objects.filter(pk=view.pk).update(viewed_at=when(v["at"]))

            for profile in profiles.values():
                recompute_public_stats(profile)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {User.objects.count()} accounts, {Look.objects.count()} looks, "
                f"{LookComment.objects.count()} comments, {Booking.objects.count()} bookings. "
                f"Every password is {PASSWORD}."
            )
        )
