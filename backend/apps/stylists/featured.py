"""Staff-built stylist pages, their private links and the handover to an account."""

import re
import secrets
from datetime import date, timedelta
from hashlib import sha256
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import CharField, Count, Q
from django.db.models.functions import Cast
from django.utils import timezone

from apps.common.identifiers import POLICY, UNAVAILABLE, identifier_problem, normalise
from apps.common.models import Media
from apps.common.uploads import media_url
from apps.looks.models import Look, LookPhoto, Style
from apps.staff.audit import security_event

from .models import FeaturedPage, PageWaitlist, PortfolioPhoto, StylistProfile
from .slots import day_hours

STAND_IN_DOMAIN = "yasante.invalid"
# Yasante's own accounts, where stylists message us (as in the site's footer).
CONTACT = "@yasantebeauty on Instagram or @yasante_beauty on TikTok"
LINK_GONE = f"This link has already been used or has run out. Message {CONTACT} for a new one."
ALREADY_HAS_PAGE = f"You already have a page on Yasante. Message {CONTACT} and we'll put the two together."
# Creating a user creates no related rows automatically in this codebase.
SAFE_AUTOMATIC_RELATIONS = frozenset()


def is_stand_in(user) -> bool:
    """Whether this account exists only to hold a page until it is claimed."""
    return user.email.lower().endswith(f"@{STAND_IN_DOMAIN}")


_SOCIAL = re.compile(r"^[a-z0-9._]{1,30}$")
_SOCIAL_ADDRESS = re.compile(
    r"^(?:https?://)?(?:www\.|m\.)?(?:instagram\.com|tiktok\.com)/@?([^/?#]+)", re.I
)


def social_handle(value):
    """An Instagram or TikTok handle from what staff paste: @name, name or its address."""
    text = str(value or "").strip()
    match = _SOCIAL_ADDRESS.match(text)
    handle = (match.group(1) if match else text).lstrip("@").lower()
    if handle and not _SOCIAL.match(handle):
        raise ValueError("That doesn't look like an Instagram or TikTok handle")
    return handle


def _yasante_handle(instagram, tiktok, current=None):
    """Their address on Yasante: the Instagram handle, or the TikTok one if that's all."""
    from apps.accounts.usernames import name_in_use

    handle = normalise(instagram or tiktok)
    if handle == current:
        return handle
    problem = identifier_problem(handle, max_length=POLICY["handle_max"])
    if problem or name_in_use(handle):
        raise ValueError(problem or UNAVAILABLE)
    return handle


@transaction.atomic
def create_page(
    *,
    display_name,
    base_area,
    added_by,
    instagram_handle="",
    tiktok_handle="",
    avatar_media=None,
    bio="",
):
    """Create a draft page owned by an account that can never sign in."""
    instagram, tiktok = social_handle(instagram_handle), social_handle(tiktok_handle)
    if not (instagram or tiktok):
        raise ValueError("Add their Instagram or TikTok")
    handle = _yasante_handle(instagram, tiktok)
    if not str(display_name).strip() or not str(base_area).strip():
        raise ValueError("Add a name and an area")
    user = get_user_model().objects.create_user(
        email=f"{uuid4().hex}@{STAND_IN_DOMAIN}",
        name=display_name,
        roles=["stylist"],
    )
    avatar = ""
    if avatar_media:
        Media.objects.filter(pk=avatar_media.pk).update(owner=user)
        avatar = media_url(None, avatar_media, avatar_media.full_path)
    try:
        profile = StylistProfile.objects.create(
            account=user,
            display_name=display_name,
            handle=handle,
            instagram_handle=instagram,
            tiktok_handle=tiktok,
            base_area=base_area,
            bio=bio,
            avatar_uri=avatar,
            featured=True,
            published=False,
        )
    except IntegrityError as error:
        raise ValueError(UNAVAILABLE) from error
    return FeaturedPage.objects.create(
        profile=profile, instagram_handle=instagram, tiktok_handle=tiktok, added_by=added_by
    )


def set_socials(page, *, instagram_handle, tiktok_handle):
    """Change where they are before the page is live; their Yasante address follows."""
    instagram, tiktok = social_handle(instagram_handle), social_handle(tiktok_handle)
    if (instagram, tiktok) == (page.instagram_handle, page.tiktok_handle):
        return
    if page.profile.published:
        raise ValueError("Locked while the page is live")
    if not (instagram or tiktok):
        raise ValueError("Add their Instagram or TikTok")
    profile = page.profile
    handle = _yasante_handle(instagram, tiktok, current=profile.handle)
    page.instagram_handle, page.tiktok_handle = instagram, tiktok
    page.save(update_fields=["instagram_handle", "tiktok_handle", "updated_at"])
    profile.instagram_handle, profile.tiktok_handle = instagram, tiktok
    if handle != profile.handle:
        profile.handle = handle
        # Her looks carry the handle for their links, so they move with it.
        Look.objects.filter(stylist_id=str(profile.account_id)).update(stylist_handle=handle)


def _lock_editable(page):
    """Recheck ownership under the same row lock used by claiming."""
    page.refresh_from_db(from_queryset=FeaturedPage.objects.select_for_update())
    if page.claimed_at:
        raise ValueError("This page already belongs to its stylist")


@transaction.atomic
def add_look(page, *, photos, styles, hair_texture="", caption="", request=None):
    """Add one look and its cover to this stylist's portfolio. The request, when there is
    one, makes its photo addresses whole even where PUBLIC_BASE_URL isn't set (locally)."""
    _lock_editable(page)
    profile = page.profile
    if not 1 <= len(photos) <= 5:
        raise ValueError("Add 1 to 5 photos")
    if len({p.pk for p in photos}) != len(photos):
        raise ValueError("That photo is in this look twice")
    if any(
        p.owner_id != profile.account_id or p.visibility != "public" for p in photos
    ):
        raise ValueError("That photo isn't one of yours")
    if not styles:
        raise ValueError("Tag the style")

    def picture(photo):
        """Use the upload itself for every photo size."""
        return {
            "photo_uri": media_url(request, photo, photo.full_path),
            "thumb_uri": media_url(request, photo, photo.thumb_path)
            if photo.thumb_path
            else "",
            "feed_uri": media_url(request, photo, photo.feed_path)
            if photo.feed_path
            else "",
        }

    cover = photos[0]
    look = Look.objects.create(
        author=profile.account,
        **picture(cover),
        photo_aspect=round(cover.width / cover.height, 4) if cover.height else 1,
        stylist_id=str(profile.account_id),
        stylist_name=profile.display_name,
        stylist_handle=profile.handle,
        area=profile.base_area,
        visibility="public",
        hair_texture=str(hair_texture)[:20],
        caption=str(caption).strip()[:1000],
    )
    LookPhoto.objects.bulk_create(
        [
            LookPhoto(
                look=look,
                position=position,
                **picture(photo),
                aspect=round(photo.width / photo.height, 4) if photo.height else 1,
            )
            for position, photo in enumerate(photos)
        ]
    )
    look.styles.set(styles)
    PortfolioPhoto.objects.create(
        stylist=profile, uri=look.photo_uri, thumb_uri=look.thumb_uri, look_id=look.pk
    )
    return look


@transaction.atomic
def remove_look(page, look_id):
    """Remove a staff-added look and its portfolio cover."""
    _lock_editable(page)
    if page.claimed_at:
        raise ValueError("This page already belongs to its stylist")
    page.profile.portfolio_photos.filter(look_id=look_id).delete()
    Look.objects.filter(pk=look_id, author_id=page.profile.account_id).delete()


@transaction.atomic
def record_yes(page, *, note, proof_media=None):
    """Record when and how the stylist agreed to appear on Yasante."""
    _lock_editable(page)
    if proof_media and (
        not proof_media.owner.is_staff or proof_media.visibility != "private"
    ):
        raise ValueError("Upload a private photo of the yes first")
    page.agreed_at, page.agreed_note, page.agreed_proof = (
        timezone.now(),
        str(note)[:300],
        proof_media,
    )
    page.save(update_fields=["agreed_at", "agreed_note", "agreed_proof", "updated_at"])


@transaction.atomic
def put_live(page):
    """Publish only after the stylist agreed and staff added a look."""
    _lock_editable(page)
    if not page.agreed_at:
        raise ValueError("Record the yes before putting the page live")
    if not Look.objects.filter(author_id=page.profile.account_id).exists():
        raise ValueError("Add a look before putting the page live")
    page.profile.published = True
    page.profile.save(update_fields=["published", "updated_at"])
    open_if_ready(page.profile)


@transaction.atomic
def new_link(page) -> str:
    """Replace the current private link with a fresh seven-day link."""
    _lock_editable(page)
    if page.claimed_at:
        raise ValueError(LINK_GONE)
    code = secrets.token_urlsafe(24)
    page.code_hash = sha256(code.encode()).hexdigest()
    page.code_expires_at = timezone.now() + timedelta(days=7)
    page.save(update_fields=["code_hash", "code_expires_at", "updated_at"])
    # Always the site's address: it's pasted into an Instagram message, and the API's
    # address (PUBLIC_BASE_URL, or nothing locally) isn't where the page lives.
    return f"https://yasante.com/claim/{code}"


@transaction.atomic
def take_down(page):
    """Delete everything staff made, only while the stand-in still owns it."""
    _lock_editable(page)
    if page.claimed_at or not is_stand_in(page.profile.account):
        raise ValueError("This page already belongs to its stylist")
    if page.agreed_proof_id:
        page.agreed_proof.delete()
    page.profile.account.delete()


def page_for_code(code):
    """Find a usable private link by its hash alone."""
    return (
        FeaturedPage.objects.select_related("profile", "profile__account")
        .filter(
            code_hash=sha256(code.encode()).hexdigest(),
            claimed_at=None,
            code_expires_at__gt=timezone.now(),
        )
        .first()
    )


@transaction.atomic
def claim(page, user):
    """Move every owned row in one locked transaction, or leave everything untouched."""
    expected_hash = page.code_hash
    page = FeaturedPage.objects.select_for_update().get(pk=page.pk)
    profile = StylistProfile.objects.select_for_update().get(pk=page.profile_id)
    if (
        page.claimed_at
        or not page.code_hash
        or page.code_hash != expected_hash
        or not page.code_expires_at
        or page.code_expires_at <= timezone.now()
    ):
        raise ValueError(LINK_GONE)
    user = get_user_model().objects.select_for_update().get(pk=user.pk)
    if is_stand_in(user):
        raise ValueError("Use your own email address")
    if not (user.email_verified or user.apple_id or user.google_id):
        raise ValueError("Confirm your email first, then open this link again")
    if StylistProfile.objects.filter(account=user).exists():
        raise ValueError(ALREADY_HAS_PAGE)
    stand_in = profile.account
    if not is_stand_in(stand_in):
        raise ValueError(LINK_GONE)
    Look.objects.filter(author=stand_in).update(author=user)
    Look.objects.filter(stylist_id=str(stand_in.pk)).update(stylist_id=str(user.pk))
    Media.objects.filter(owner=stand_in).update(owner=user)
    StylistProfile.objects.filter(pk=profile.pk).update(account=user, published=True)
    profile.account = user
    profile.published = True
    PageWaitlist.objects.filter(stylist=profile, client=user).delete()
    user.roles = list(dict.fromkeys([*(user.roles or []), "stylist"]))
    user.save(update_fields=["roles", "updated_at"])
    page.claimed_at, page.claimed_by = timezone.now(), user
    page.code_hash, page.code_expires_at = "", None
    page.save(
        update_fields=[
            "claimed_at",
            "claimed_by",
            "code_hash",
            "code_expires_at",
            "updated_at",
        ]
    )
    meta = get_user_model()._meta
    # Hidden reverse FKs include permission memberships and related_name="+" facts.
    relations = (
        *meta.related_objects,
        *(
            r
            for r in meta.get_fields(include_hidden=True)
            if r.auto_created and not r.concrete and getattr(r, "hidden", False)
        ),
    )
    for relation in relations:
        key = f"{relation.related_model._meta.label_lower}.{relation.field.name}"
        if (
            key not in SAFE_AUTOMATIC_RELATIONS
            and relation.related_model._base_manager.filter(
                **{relation.field.name: stand_in}
            ).count()
        ):
            raise ValueError(
                f"We couldn't move everything safely. Message {CONTACT} for help."
            )
    stand_in.delete()
    security_event(None, "featured_page_claimed", user=user)
    open_if_ready(profile)
    return user


def _hours_set(profile):
    """Whether an explicitly saved week has a working day."""
    week = (profile.availability or {}).get("week")
    if not isinstance(week, list) or len(week) != 7:
        return False
    # Read the saved week through the same helper as the free-times picker.
    monday = date(2024, 1, 1)
    return any(
        isinstance(hours, tuple) and hours[1] > hours[0]
        for hours in (day_hours(profile, monday + timedelta(days=i)) for i in range(7))
    )


def takes_bookings(profile) -> bool:
    """Whether this published, owned page has a menu and working hours."""
    return (
        profile.published
        and not is_stand_in(profile.account)
        and profile.menu_items.exists()
        and _hours_set(profile)
    )


def open_if_ready(profile):
    """Open a ready page once and tell its waitlist only after commit."""
    if not profile.featured:
        return
    from .tasks import tell_waitlist

    with transaction.atomic():
        # Menu and hours saves can arrive together; read the latest row after the lock.
        profile.refresh_from_db(
            from_queryset=StylistProfile.objects.select_for_update(no_key=True)
        )
        if profile.featured and takes_bookings(profile):
            changed = StylistProfile.objects.filter(
                pk=profile.pk, featured=True
            ).update(featured=False)
            profile.featured = False
            if changed:
                transaction.on_commit(lambda: tell_waitlist.delay(profile.pk))


def finish_state(profile):
    """Build the three-part checklist from styles on the work staff added."""
    page = profile.featured_page
    owned = Q(
        looks__author_id=profile.account_id,
        looks__created_at__lt=page.claimed_at,
        looks__pk__in=profile.portfolio_photos.values("look_id"),
    )
    rows = list(
        Style.objects.filter(owned)
        .annotate(
            photo_count=Count("looks__photos", distinct=True),
            unpriced=Count(
                "looks",
                filter=~Q(
                    looks__service_id__in=profile.menu_items.annotate(
                        text_id=Cast("id", CharField())
                    ).values("text_id")
                ),
                distinct=True,
            ),
        )
        .order_by("-photo_count", "name")
        .values("slug", "name", "photo_count", "unpriced")
    )
    styles = [
        {
            "slug": r["slug"],
            "name": r["name"],
            "photo_count": r["photo_count"],
            "priced": r["unpriced"] == 0,
        }
        for r in rows
    ]
    hours, tags = _hours_set(profile), bool(page.tags_checked_at)
    return {
        "styles": styles,
        "hours_set": hours,
        "tags_checked": tags,
        "done": all(s["priced"] for s in styles) and hours and tags,
    }


def not_booking_message(profile):
    """Explain how clients can hear when this stylist starts taking bookings."""
    return f"{profile.display_name} isn't taking bookings on Yasante yet. Join the waitlist and we'll let you know."
