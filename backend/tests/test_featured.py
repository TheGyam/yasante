"""Featured stylist pages: ownership, private drafts, permissions and opening bookings."""

import io
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from hashlib import sha256
from threading import Barrier
from unittest.mock import patch
from uuid import uuid4

import pytest
from django.contrib.admin.models import LogEntry
from django.contrib.auth.models import Permission
from django.db import close_old_connections, connection
from django.test import Client
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.common.models import Media, NotificationLog
from apps.common.uploads import store_image
from apps.looks.models import Look
from apps.stylists import featured
from apps.stylists.models import (
    FeaturedPage,
    MenuItem,
    PageView,
    PageWaitlist,
    PortfolioPhoto,
    StylistProfile,
)
from apps.stylists.tasks import tell_waitlist

from .conftest import WEEK_9_TO_6
from .test_staff import staff_client

pytestmark = pytest.mark.django_db


def image_file():
    buf = io.BytesIO()
    Image.new("RGB", (120, 180), (50, 100, 150)).save(buf, "JPEG")
    buf.seek(0)
    buf.name = "braids.jpg"
    from django.core.files.uploadedfile import SimpleUploadedFile

    return SimpleUploadedFile("braids.jpg", buf.getvalue(), content_type="image/jpeg")


class CheckedClient(APIClient):
    def request(self, **kwargs):
        from .schema_check import check_response

        response = super().request(**kwargs)
        check_response(kwargs["REQUEST_METHOD"].lower(), kwargs["PATH_INFO"], response)
        return response


def signed(user=None):
    client = CheckedClient()
    client.default_format = "json"
    if user:
        client.force_authenticate(user)
    return client


@pytest.fixture
def page(make_user):
    return featured.create_page(
        display_name="Ama's braids",
        instagram_handle="ama.braids",
        base_area="Peckham",
        added_by=make_user(is_staff=True),
    )


@pytest.fixture
def work(page, styles, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path

    def add(style="knotless", count=1):
        photos = []
        for _ in range(count):
            media, error = store_image(
                image_file(),
                owner=page.profile.account,
                kind="look",
                source="instagram",
                private=False,
            )
            assert error is None
            photos.append(media)
        return featured.add_look(
            page, photos=photos, styles=[styles[style]], caption="Work in Peckham"
        )

    return add


def live(page, work):
    look = work()
    featured.record_yes(page, note="Said yes on Instagram")
    featured.put_live(page)
    return look


def claim_page(page, user):
    url = featured.new_link(page)
    claimed = featured.claim(featured.page_for_code(url.rsplit("/", 1)[-1]), user)
    page.refresh_from_db()
    page.profile.refresh_from_db()
    return claimed


def test_staff_lifecycle_and_audit(make_user, styles, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    client, actor = staff_client(make_user, superuser=True)
    root = "/data/featured/"
    response = client.post(
        root,
        {
            "display_name": "Ama",
            "instagram_handle": "@Ama.Braids",
            "base_area": "Peckham",
            "avatar": image_file(),
        },
    )
    assert response.status_code == 201, response.content
    pk = response.json()["id"]
    item = root + pk + "/"
    page = FeaturedPage.objects.get(pk=pk)
    assert page.instagram_handle == page.profile.handle == "ama.braids"
    assert page.profile.featured and not page.profile.published
    assert not page.profile.account.has_usable_password()
    assert client.post(item + "live/").status_code == 400
    assert (
        client.post(
            item + "yes/", {"note": "Said yes on Instagram", "proof": image_file()}
        ).status_code
        == 200
    )
    assert client.post(item + "live/").status_code == 400
    upload = client.post(
        item + "looks/", {"files": [image_file(), image_file()], "styles": ["knotless"]}
    )
    assert upload.status_code == 201, upload.content
    look = Look.objects.get(pk=upload.json()["id"])
    assert look.photos.count() == 2
    assert look.price is None and not look.service_id
    assert list(look.styles.values_list("slug", flat=True)) == ["knotless"]
    assert PortfolioPhoto.objects.get(look_id=look.pk).uri == look.photo_uri
    assert client.post(item + "live/").status_code == 200
    assert (
        client.patch(
            item,
            data={"instagram_handle": "someone.else"},
            content_type="application/json",
        ).status_code
        == 400
    )
    assert (
        client.patch(
            item, data={"bio": "Braids in Peckham"}, content_type="application/json"
        ).status_code
        == 200
    )
    link = client.post(item + "link/")
    assert link.status_code == 200 and "/claim/" in link.json()["url"]
    assert client.get(item).json()["looks"][0]["id"] == str(look.pk)
    assert client.get(root).json()["items"][0]["look_count"] == 1
    assert client.delete(item + f"looks/{look.pk}/").status_code == 200
    assert not Look.objects.filter(pk=look.pk).exists()
    assert client.post(item + "take-down/", {"handle": "wrong"}).status_code == 400
    paths = list(
        Media.objects.filter(owner=page.profile.account).values_list(
            "full_path", "feed_path", "thumb_path"
        )
    )
    owner_id = page.profile.account_id
    PageWaitlist.objects.create(stylist=page.profile, client=make_user())
    assert client.post(item + "take-down/", {"handle": "ama.braids"}).status_code == 200
    assert not User.objects.filter(pk=owner_id).exists()
    assert not PageWaitlist.objects.exists()
    from django.core.files.storage import default_storage

    assert all(not default_storage.exists(p) for sizes in paths for p in sizes)
    events = list(
        LogEntry.objects.filter(user=actor).values_list("change_message", flat=True)
    )
    for event in (
        "featured_page_created",
        "featured_page_yes",
        "featured_look_added",
        "featured_page_live",
        "featured_page_updated",
        "featured_page_link",
        "featured_look_removed",
        "featured_page_take_down",
    ):
        assert any(event in entry for entry in events)


@pytest.mark.parametrize("count", [1, 5])
def test_photo_order_and_limits(page, work, count):
    look = work(count=count)
    photos = list(look.photos.all())
    assert [p.position for p in photos] == list(range(count))
    assert photos[0].photo_uri == look.photo_uri
    with pytest.raises(ValueError, match="1 to 5"):
        featured.add_look(page, photos=[], styles=[])
    with pytest.raises(ValueError, match="1 to 5"):
        featured.add_look(page, photos=[None] * 6, styles=[])


def test_staff_validation_and_bad_upload_roll_back(
    page, work, make_user, styles, settings, tmp_path
):
    settings.MEDIA_ROOT = tmp_path
    client, _ = staff_client(make_user, superuser=True)
    item = f"/data/featured/{page.pk}/"
    assert client.post(item + "looks/", {"files": image_file()}).status_code == 400
    before = Media.objects.count()
    bad = io.BytesIO(b"broken")
    bad.name = "bad.jpg"
    assert (
        client.post(
            item + "looks/", {"files": [image_file(), bad], "styles": "knotless"}
        ).status_code
        == 400
    )
    assert Media.objects.count() == before
    with pytest.raises(ValueError, match="Tag the style"):
        featured.add_look(
            page,
            photos=[
                store_image(
                    image_file(),
                    owner=page.profile.account,
                    kind="look",
                    source="instagram",
                    private=False,
                )[0]
            ],
            styles=[],
        )
    other, _ = store_image(
        image_file(), owner=make_user(), kind="look", source="instagram", private=False
    )
    with pytest.raises(ValueError, match="isn't one of yours"):
        featured.add_look(page, photos=[other], styles=[styles["knotless"]])


@pytest.mark.parametrize("role", ["client", "staff", "view"])
def test_every_staff_endpoint_checks_permissions(page, make_user, role):
    if role == "client":
        client = Client(HTTP_HOST="admin.localhost")
        client.force_login(make_user())
    else:
        client, user = staff_client(make_user)
        if role == "view":
            user.user_permissions.add(
                Permission.objects.get(codename="view_featuredpage")
            )
    item = f"/data/featured/{page.pk}/"
    for method, path in [
        ("post", "/data/featured/"),
        ("patch", item),
        ("post", item + "looks/"),
        ("delete", item + f"looks/{uuid4()}/"),
    ] + [("post", item + a + "/") for a in ("yes", "live", "link", "take-down")]:
        assert getattr(client, method)(path).status_code == 403, (method, path)
    for path in ("/data/featured/", item):
        assert client.get(path).status_code == (200 if role == "view" else 403)


def test_staff_change_permission_and_csrf(page, make_user):
    client, user = staff_client(make_user)
    user.user_permissions.add(Permission.objects.get(codename="change_featuredpage"))
    assert client.post(f"/data/featured/{page.pk}/link/").status_code == 200
    strict = Client(HTTP_HOST="admin.localhost", enforce_csrf_checks=True)
    strict.cookies = client.cookies
    item = f"/data/featured/{page.pk}/"
    for method, path in [
        ("post", "/data/featured/"),
        ("patch", item),
        ("post", item + "looks/"),
        ("delete", item + f"looks/{uuid4()}/"),
    ] + [("post", item + a + "/") for a in ("yes", "live", "link", "take-down")]:
        assert getattr(strict, method)(path).status_code == 403


def test_stand_in_auth_and_reserved_email_changes(page, make_user, monkeypatch):
    sent = []
    monkeypatch.setattr(
        "apps.accounts.views.send_password_reset", lambda *args: sent.append(args)
    )
    client = signed()
    email = page.profile.account.email
    assert (
        client.post(
            "/api/auth/login/", {"email": email, "password": "anything"}
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/auth/signup/",
            {
                "email": "new@yasante.invalid",
                "name": "Ama",
                "password": "long-password123!",
                "passwordConfirm": "long-password123!",
                "role": "client",
                "ageConfirmed": True,
                "policyVersion": "1",
            },
            format="json",
        ).status_code
        == 400
    )
    assert (
        client.post("/api/auth/forgot-password/", {"email": email}).data
        == client.post("/api/auth/forgot-password/", {"email": "unknown@test.dev"}).data
    )
    assert not sent
    assert (
        signed(page.profile.account)
        .post("/api/auth/email/start/", {}, format="json")
        .status_code
        == 400
    )
    user = make_user()
    client = signed(user)
    assert (
        client.post(
            "/api/auth/email/start/", {"email": "new@yasante.invalid"}, format="json"
        ).status_code
        == 400
    )
    response = client.patch(
        f"/api/users/{user.pk}/", {"email": "new@yasante.invalid"}, format="json"
    )
    assert response.status_code == 400
    assert "Use your own email address" in response.data["message"]
    user.refresh_from_db()
    assert not user.email.endswith("@yasante.invalid")


def test_link_hash_rotation_expiry_and_preview(
    page, work, make_user, django_assert_max_num_queries
):
    covers = [work() for _ in range(7)]
    first = featured.new_link(page).rsplit("/", 1)[-1]
    assert len(first) == 32 and page.code_hash == sha256(first.encode()).hexdigest()
    assert abs(page.code_expires_at - timezone.now() - timedelta(days=7)) < timedelta(
        seconds=2
    )
    second = featured.new_link(page).rsplit("/", 1)[-1]
    assert featured.page_for_code(first) is None
    client = signed()
    assert client.get(f"/api/featured/claim/{first}/").status_code == 410
    assert client.get("/api/featured/claim/wrong/").status_code == 410
    with django_assert_max_num_queries(4):
        response = client.get(f"/api/featured/claim/{second}/")
    assert response.status_code == 200
    assert (
        response["Referrer-Policy"] == "no-referrer"
        and response["Cache-Control"] == "no-store"
    )
    assert response.data["look_count"] == 7 and not response.data["live"]
    assert len(response.data["photos"]) == 6
    assert response.data["photos"][0]["uri"] == covers[-1].photo_uri
    page.code_expires_at = timezone.now() - timedelta(seconds=1)
    page.save()
    assert client.get(f"/api/featured/claim/{second}/").status_code == 410


def test_claim_moves_everything_and_keeps_client_data(page, work, make_user):
    from apps.planner.models import Collection
    from apps.profiles.models import HairProfile

    look = live(page, work)
    old_id = page.profile.account_id
    for kind in ("avatar", "proof"):
        media, error = store_image(
            image_file(),
            owner=page.added_by if kind == "proof" else page.profile.account,
            kind=kind,
            source="instagram",
            private=kind == "proof",
        )
        assert error is None
        if kind == "proof":
            featured.record_yes(page, note="Said yes", proof_media=media)
    user = make_user(email_verified=True)
    hair = HairProfile.objects.create(user=user, texture="4c")
    collection = Collection.objects.create(user=user, name="My ideas")
    credited = Look.objects.create(
        author=make_user(), stylist_id=str(old_id), photo_uri=look.photo_uri
    )
    PageWaitlist.objects.create(stylist=page.profile, client=user)
    code = featured.new_link(page).rsplit("/", 1)[-1]
    response = signed(user).post(f"/api/featured/claim/{code}/")
    assert response.status_code == 200, response.data
    assert "stylist" in response.data["roles"]
    page.refresh_from_db()
    look.refresh_from_db()
    credited.refresh_from_db()
    assert page.claimed_by_id == user.pk and page.claimed_at
    assert not page.code_hash and page.code_expires_at is None
    assert page.profile.account_id == user.pk and page.profile.featured
    assert look.author_id == user.pk and look.stylist_id == str(user.pk)
    assert credited.stylist_id == str(user.pk)
    assert PortfolioPhoto.objects.get(look_id=look.pk).stylist.account_id == user.pk
    assert (
        not Media.objects.exclude(owner=user).exclude(pk=page.agreed_proof_id).exists()
    )
    assert page.agreed_proof.owner_id == page.added_by_id
    assert page.agreed_proof.visibility == "private"
    assert not User.objects.filter(pk=old_id).exists()
    assert HairProfile.objects.get(pk=hair.pk).user_id == user.pk
    assert Collection.objects.get(pk=collection.pk).user_id == user.pk
    assert not page.profile.waitlist.exists()
    assert signed(user).post(f"/api/featured/claim/{code}/").status_code == 410
    assert LogEntry.objects.filter(
        change_message__contains="featured_page_claimed"
    ).exists()
    with pytest.raises(ValueError):
        featured.take_down(page)


def test_unexpected_reverse_relation_rolls_back_everything(page, work, make_user):
    from apps.planner.models import Collection

    look = work()
    old = page.profile.account
    extra = Collection.objects.create(user=old, name="Unexpected data")
    user = make_user(email_verified=True)
    code = featured.new_link(page).rsplit("/", 1)[-1]
    assert signed(user).post(f"/api/featured/claim/{code}/").status_code == 409
    page.refresh_from_db()
    look.refresh_from_db()
    user.refresh_from_db()
    assert page.profile.account_id == old.pk and look.author_id == old.pk
    assert all(m.owner_id == old.pk for m in Media.objects.all())
    assert (
        page.code_hash == sha256(code.encode()).hexdigest() and page.claimed_at is None
    )
    assert "stylist" not in user.roles
    assert Collection.objects.filter(pk=extra.pk, user=old).exists()
    assert User.objects.filter(pk=old.pk).exists()


@pytest.mark.parametrize(
    "who", ["unverified", "has-page", "stand-in", "apple", "google"]
)
def test_claim_account_requirements(page, make_user, make_stylist, who):
    if who == "stand-in":
        user = page.profile.account
    elif who == "has-page":
        user = make_stylist().account
        user.email_verified = True
        user.save()
    else:
        user = make_user(
            **({who + "_id": str(uuid4())} if who in ("apple", "google") else {})
        )
    code = featured.new_link(page).rsplit("/", 1)[-1]
    response = signed(user).post(f"/api/featured/claim/{code}/")
    assert response.status_code == (200 if who in ("apple", "google") else 409), (
        response.data
    )
    if who == "has-page":
        assert response.data["message"] == featured.ALREADY_HAS_PAGE


@pytest.mark.django_db(transaction=True)
def test_only_one_concurrent_claim_succeeds(make_user):
    page = featured.create_page(
        display_name="Ama",
        instagram_handle="ama.concurrent",
        base_area="Peckham",
        added_by=make_user(),
    )
    users = [make_user(email_verified=True), make_user(email_verified=True)]
    code = featured.new_link(page).rsplit("/", 1)[-1]
    ready = Barrier(2)

    def attempt(user):
        close_old_connections()
        try:
            candidate = featured.page_for_code(code)
            ready.wait(timeout=10)
            try:
                return str(featured.claim(candidate, user).pk)
            except ValueError as error:
                return str(error)
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, users))
    assert sum(r in {str(u.pk) for u in users} for r in results) == 1
    assert results.count(featured.LINK_GONE) == 1
    assert not User.objects.filter(email__endswith="@yasante.invalid").exists()


def test_waitlist_and_public_page_state(page, work, make_user, make_stylist):
    live(page, work)
    user = make_user(email_verified=True)
    url = f"/api/stylists/by-handle/{page.profile.handle}/waitlist/"
    assert signed().put(url).status_code == 401
    client = signed(user)
    for _ in range(2):
        assert client.put(url).data == {"joined": True}
    assert page.profile.waitlist.count() == 1
    data = client.get(url.removesuffix("waitlist/")).data
    assert (
        data["profile"]["featured"]
        and data["profile"]["claimable"]
        and data["waitlist_joined"]
    )
    assert "waiting" not in data and "waiting" not in data["profile"]
    assert "waitlistJoined" not in signed().get(url.removesuffix("waitlist/")).json()
    for _ in range(2):
        response = client.delete(url)
        assert response.status_code == 200 and response.data == {"joined": False}
    assert signed(page.profile.account).put(url).status_code == 400
    normal = make_stylist()
    assert (
        client.put(f"/api/stylists/by-handle/{normal.handle}/waitlist/").status_code
        == 400
    )
    claim_page(page, user)
    MenuItem.objects.create(stylist=page.profile, name="Braids", price=50)
    page.profile.availability = WEEK_9_TO_6
    page.profile.save()
    assert signed(make_user()).put(url).status_code == 400


def test_featured_booking_free_times_and_slot_waitlist_refused(page, work, make_user):
    live(page, work)
    client = signed(make_user())
    expected = {"message": featured.not_booking_message(page.profile)}
    assert (
        client.post(
            "/api/bookings/", {"stylistId": str(page.profile.account_id)}, format="json"
        ).data
        == expected
    )
    assert (
        client.get(f"/api/stylists/by-handle/{page.profile.handle}/slots/").data
        == expected
    )
    response = client.post(
        "/api/slot-interests/",
        {"stylistId": str(page.profile.account_id)},
        format="json",
    )
    assert response.status_code == 400 and response.data == expected


def test_price_style_links_only_unpriced_work_and_finishes(page, work, make_user):
    first = live(page, work)
    second = work(count=2)
    other = work("cornrows")
    user = make_user(email_verified=True)
    claim_page(page, user)
    client = signed(user)
    state = client.get("/api/stylists/me/finish/")
    assert state.status_code == 200, state.data
    assert state.data["styles"][0]["photo_count"] == 3
    assert not state.data["done"]
    assert (
        client.post(
            "/api/stylists/me/finish/price/",
            {"style": "knotless", "price": 0},
            format="json",
        ).status_code
        == 400
    )
    result = client.post(
        "/api/stylists/me/finish/price/",
        {"style": "knotless", "price": 125, "fromPrice": True, "durationMinutes": 180},
        format="json",
    )
    assert result.status_code == 200, result.data
    service = page.profile.menu_items.get()
    assert service.name == "Knotless braids" and service.duration_minutes == 180
    for look in (first, second):
        look.refresh_from_db()
        assert (
            look.service_id == str(service.pk) and look.price == 125 and look.from_price
        )
        assert PortfolioPhoto.objects.get(look_id=look.pk).service_id == service.pk
    other.refresh_from_db()
    assert not other.service_id and other.price is None
    assert result.data["styles"][0]["priced"]
    client.post(
        "/api/stylists/me/finish/price/",
        {"style": "cornrows", "price": 40},
        format="json",
    )
    assert client.post("/api/stylists/me/finish/tags-checked/").data["tags_checked"]
    with patch("apps.stylists.tasks.tell_waitlist.delay") as queued:
        response = client.patch(
            "/api/stylists/me/", {"availability": WEEK_9_TO_6}, format="json"
        )
        assert response.status_code == 200
        assert not response.data["featured"]
        assert not queued.called  # transaction has not committed inside this test
    assert client.get("/api/stylists/me/finish/").data["done"]
    assert signed(make_user()).get("/api/stylists/me/finish/").status_code == 404


@pytest.mark.parametrize("last", ["price", "menu", "import", "hours"])
def test_opening_queues_once_after_commit(
    page, work, make_user, django_capture_on_commit_callbacks, last
):
    live(page, work)
    user = make_user(email_verified=True)
    claim_page(page, user)
    client = signed(user)
    if last != "hours":
        page.profile.availability = WEEK_9_TO_6
        page.profile.save()
    else:
        MenuItem.objects.create(stylist=page.profile, name="Braids", price=50)
    with patch("apps.stylists.tasks.tell_waitlist.delay") as queued:
        with django_capture_on_commit_callbacks(execute=True):
            if last == "price":
                response = client.post(
                    "/api/stylists/me/finish/price/",
                    {"style": "knotless", "price": 100},
                    format="json",
                )
            elif last == "menu":
                response = client.post(
                    "/api/stylists/me/menu/",
                    {"name": "Braids", "price": 100},
                    format="json",
                )
            elif last == "import":
                response = client.post(
                    "/api/stylists/me/menu/import/",
                    {"items": [{"name": "Braids", "price": 100}]},
                    format="json",
                )
            else:
                response = client.patch(
                    "/api/stylists/me/", {"availability": WEEK_9_TO_6}, format="json"
                )
            assert response.status_code in (200, 201), response.data
            assert not queued.called
        queued.assert_called_once_with(page.profile.pk)
        with django_capture_on_commit_callbacks(execute=True):
            page.profile.refresh_from_db()
            featured.open_if_ready(page.profile)
        queued.assert_called_once()


def test_tell_waitlist_is_once_and_rechecks_readiness(page, work, make_user):
    live(page, work)
    users = [make_user(), make_user()]
    for user in users:
        PageWaitlist.objects.create(stylist=page.profile, client=user)
    tell_waitlist(page.profile.pk)
    assert PageWaitlist.objects.count() == 2 and not NotificationLog.objects.exists()
    owner = make_user(email_verified=True)
    claim_page(page, owner)
    page.profile.availability = WEEK_9_TO_6
    page.profile.save()
    MenuItem.objects.create(stylist=page.profile, name="Braids", price=50)
    tell_waitlist(page.profile.pk)
    tell_waitlist(page.profile.pk)
    assert not PageWaitlist.objects.exists()
    logs = NotificationLog.objects.filter(category="waitlist")
    assert logs.count() == 2
    for log in logs:
        assert log.event_key == f"page-open:{page.profile.pk}:{log.user_id}"
        assert log.title == f"{page.profile.display_name} is taking bookings."
        assert (
            log.body
            == f"You joined the waitlist for {page.profile.display_name}. Book now on Yasante."
        )
        assert log.data == {"url": f"/{page.profile.handle}", "mode": "client"}


def test_draft_looks_stay_private_on_all_public_paths(page, work, make_user):
    from apps.planner.models import Collection

    look = work()
    client = signed(make_user())
    assert not client.get("/api/looks/").data["data"]
    assert client.get(f"/api/looks/{look.pk}/").status_code == 404
    assert client.get(f"/api/looks/{look.pk}/comments/").status_code == 404
    assert client.post(f"/api/looks/{look.pk}/like/").status_code == 404
    assert (
        client.get(f"/api/stylists/by-handle/{page.profile.handle}/").status_code == 404
    )
    collection = Collection.objects.create(
        user=client.handler._force_user, name="Ideas"
    )
    assert (
        client.post(
            f"/api/collections/{collection.pk}/items/",
            {"kind": "look", "refId": str(look.pk)},
            format="json",
        ).status_code
        == 404
    )
    web = Client()
    assert web.get(f"/looks/{look.pk}").status_code == 404
    assert look.thumb_uri not in web.get("/styles/knotless").content.decode()
    assert look.photo_uri not in web.get("/looks").content.decode()
    assert look.photo_uri not in web.get("/sitemap.xml").content.decode()
    featured.record_yes(page, note="Said yes")
    featured.put_live(page)
    assert client.get(f"/api/looks/{look.pk}/").status_code == 200
    assert look.thumb_uri in web.get("/styles/knotless").content.decode()


def test_look_tag_edit_is_owner_only(page, work, make_user):
    look = live(page, work)
    owner = make_user(email_verified=True)
    claim_page(page, owner)
    client = signed(owner)
    url = f"/api/looks/{look.pk}/"
    assert (
        signed(make_user())
        .patch(url, {"styles": ["cornrows"]}, format="json")
        .status_code
        == 403
    )
    assert client.patch(url, {"styles": []}, format="json").status_code == 400
    assert client.patch(url, {"caption": "Changed"}, format="json").status_code == 400
    response = client.patch(
        url, {"styles": ["cornrows"], "hairTexture": "coily"}, format="json"
    )
    assert response.status_code == 200 and response.data["styles"] == ["cornrows"]
    assert response.data["hair_texture"] == "coily"


def test_feed_adds_at_most_one_query_and_search_orders_featured_last(
    page, work, make_stylist, django_assert_max_num_queries
):
    from apps.looks.serializers import present_looks
    from apps.looks.views import _looks

    live(page, work)
    with CaptureQueriesContext(connection) as baseline:
        rows = list(_looks(None))
        original = present_looks(rows, None)
    featured_queries = [
        q
        for q in baseline
        if '"stylists_profile"."featured"' in q["sql"] and "IN (" in q["sql"]
    ]
    assert original[0]["stylist_featured"]
    assert (
        len(featured_queries) <= 2
    )  # visibility subquery plus the single batched flag lookup
    from apps.common.people import load_people

    with CaptureQueriesContext(connection) as before:
        load_people([row.author_id for row in rows] + [row.stylist_id for row in rows])
    with django_assert_max_num_queries(len(before) + 1):
        present_looks(rows, None)
    for _ in range(4):
        work()
    with django_assert_max_num_queries(len(baseline)):
        data = signed().get("/api/looks/")
    assert all(item["stylist_featured"] for item in data.data["data"])
    normal = make_stylist()
    normal.display_name = "Zzz braids"
    normal.save()
    result = signed().get("/api/stylists/", {"q": "braids"}).data
    assert result[0]["handle"] == normal.handle


def test_staff_list_query_count_is_constant(
    page, make_user, django_assert_max_num_queries
):
    client, _ = staff_client(make_user, superuser=True)
    # Warm permission caches and session handling before measuring both requests.
    client.get("/data/featured/")
    with CaptureQueriesContext(connection) as first:
        assert client.get("/data/featured/").status_code == 200
    for n in range(6):
        featured.create_page(
            display_name=f"Ama {n}",
            instagram_handle=f"ama.query{n}",
            base_area="Peckham",
            added_by=None,
        )
    with django_assert_max_num_queries(len(first)):
        response = client.get("/data/featured/")
    assert response.json()["count"] == 7


def test_featured_noindex_and_link_shell(page, work):
    live(page, work)
    client = Client()
    assert b"noindex" in client.get(f"/{page.profile.handle}").content
    assert page.profile.handle not in client.get("/sitemap.xml").content.decode()
    assert page.profile.handle not in client.get("/llms-full.txt").content.decode()
    from apps.web import seo

    content, _ = seo.area("Peckham", StylistProfile.objects.filter(featured=False), [])
    assert not content["stylists"]
    response = client.get("/areas/peckham")
    assert f'href="/{page.profile.handle}"' not in response.content.decode()
    response = client.get("/claim/private-code")
    assert response.status_code == 200 and b"noindex" in response.content
    assert response["Referrer-Policy"] == "no-referrer"
    assert response["Cache-Control"] == "no-store"
    assert b"ama.braids" not in response.content
    assert client.get("/finish").status_code == 200


def test_metrics_exclude_featured(page, work, make_stylist):
    from apps.common.metrics import activated_stylists, response_median

    live(page, work)
    page.profile.response_hours = 1
    page.profile.verification_tier = 1
    page.profile.save()
    MenuItem.objects.create(stylist=page.profile, name="Braids", price=50)
    for _ in range(5):
        PortfolioPhoto.objects.create(
            stylist=page.profile, uri="https://yasante.com/photo.jpg"
        )
    PageView.objects.create(stylist=page.profile, source="web")
    assert activated_stylists() == 0 and response_median() == "–"


def test_insights_exclude_featured(page, work, make_user):
    from apps.profiles.models import HairProfile
    from apps.staff.insights import calculate

    live(page, work)
    user = make_user()
    HairProfile.objects.create(user=user, area="Peckham")
    now = timezone.now()
    sources = {
        "accounts.user": User.objects.all(),
        "stylists.stylistprofile": StylistProfile.objects.all(),
        "profiles.hairprofile": HairProfile.objects.all(),
    }
    assert (
        calculate("growth", sources, now - timedelta(days=1), now + timedelta(days=1))[
            "rows"
        ][0]["values"][1]
        == 0
    )
    assert (
        calculate("areas", sources, now - timedelta(days=1), now + timedelta(days=1))[
            "rows"
        ][0]["values"][1]
        == 0
    )


def test_digests_and_stats_exclude_featured(page, work):
    from apps.stylists.tasks import monthly_recap, nightly_stats

    live(page, work)
    with (
        patch("apps.stylists.tasks.recompute_public_stats") as stats,
        patch("apps.stylists.tasks.count_week") as counts,
    ):
        nightly_stats()
        monthly_recap()
    stats.assert_not_called()
    counts.assert_not_called()


@pytest.mark.parametrize("provider", ["apple", "google"])
def test_social_sign_in_cannot_adopt_a_stand_in(page, monkeypatch, provider):
    monkeypatch.setattr(
        "apps.accounts.views.social.verify",
        lambda *args: {
            "sub": "provider-person",
            "email": page.profile.account.email,
            "email_verified": True,
            "name": "Ama",
            "aud": "test",
        },
    )
    response = signed().post(
        "/api/auth/social/",
        {"provider": provider, "idToken": "verified-token"},
        format="json",
    )
    assert response.status_code == 400
    assert response.data["message"] == "Use your own email address"
    page.profile.account.refresh_from_db()
    assert getattr(page.profile.account, provider + "_id") is None


def test_pricing_keeps_existing_services_and_other_accounts(page, work, make_user):
    first = live(page, work)
    priced = work()
    service = MenuItem.objects.create(
        stylist=page.profile, name="Existing braids", price=80
    )
    priced.service_id = str(service.pk)
    priced.service_name = service.name
    priced.price = 80
    priced.save()
    PortfolioPhoto.objects.filter(look_id=priced.pk).update(service=service)
    outsider = Look.objects.create(
        author=make_user(), photo_uri="https://yasante.com/other.jpg"
    )
    outsider.styles.set(first.styles.all())
    owner = make_user(email_verified=True)
    claim_page(page, owner)
    response = signed(owner).post(
        "/api/stylists/me/finish/price/",
        {"style": "knotless", "price": 125},
        format="json",
    )
    assert response.status_code == 200
    priced.refresh_from_db()
    outsider.refresh_from_db()
    first.refresh_from_db()
    assert priced.service_id == str(service.pk) and priced.price == 80
    assert PortfolioPhoto.objects.get(look_id=priced.pk).service_id == service.pk
    assert not outsider.service_id and outsider.price is None
    assert first.service_id != str(service.pk) and first.price == 125


def test_old_link_cannot_win_after_staff_makes_a_new_one(page, make_user):
    old = featured.new_link(page).rsplit("/", 1)[-1]
    candidate = featured.page_for_code(old)
    featured.new_link(page)
    with pytest.raises(ValueError, match="already been used"):
        featured.claim(candidate, make_user(email_verified=True))
    page.refresh_from_db()
    assert (
        page.claimed_at is None
        and User.objects.filter(pk=page.profile.account_id).exists()
    )


def test_top_stylist_insight_ignores_featured_profiles(page, make_user):
    from apps.bookings.models import Booking
    from apps.staff.insights import calculate

    Booking.objects.create(
        client=make_user(),
        stylist=page.profile.account,
        stylist_profile=page.profile,
        service_id=uuid4(),
        price=100,
        status="completed",
    )
    now = timezone.now()
    sources = {
        "bookings.booking": Booking.objects.all(),
        "stylists.stylistprofile": StylistProfile.objects.all(),
    }
    assert not calculate(
        "top-stylists", sources, now - timedelta(days=1), now + timedelta(days=1)
    )["rows"]


def test_finish_and_staff_reads_keep_existing_client_looks_separate(
    page, work, make_user
):
    inherited = live(page, work)
    owner = make_user(email_verified=True)
    personal = Look.objects.create(
        author=owner, photo_uri="https://yasante.com/client.jpg", visibility="private"
    )
    personal.styles.set(inherited.styles.all())
    claim_page(page, owner)
    state = signed(owner).get("/api/stylists/me/finish/").data
    assert state["styles"][0]["photo_count"] == 1
    response = signed(owner).post(
        "/api/stylists/me/finish/price/",
        {"style": "knotless", "price": 100},
        format="json",
    )
    assert response.status_code == 200
    personal.refresh_from_db()
    assert (
        personal.visibility == "private"
        and not personal.service_id
        and personal.price is None
    )
    client, _ = staff_client(make_user, superuser=True)
    data = client.get(f"/data/featured/{page.pk}/").json()
    assert data["look_count"] == 1
    assert [look["id"] for look in data["looks"]] == [str(inherited.pk)]


@pytest.mark.parametrize("handle", ["admin", "@Ama.Braids"])
def test_create_page_uses_existing_handle_validation(page, handle):
    from apps.common.identifiers import UNAVAILABLE

    with pytest.raises(ValueError, match=UNAVAILABLE):
        featured.create_page(
            display_name="Ama",
            instagram_handle=handle,
            base_area="Peckham",
            added_by=None,
        )
    assert User.objects.filter(email__endswith="@yasante.invalid").count() == 1


def test_owner_can_fix_tags_after_unpublishing(page, work, make_user):
    look = work()
    owner = make_user(email_verified=True)
    claim_page(page, owner)
    page.profile.published = False
    page.profile.save(update_fields=["published"])
    response = signed(owner).patch(
        f"/api/looks/{look.pk}/", {"styles": ["cornrows"]}, format="json"
    )
    assert response.status_code == 200 and response.data["styles"] == ["cornrows"]
    assert signed().get(f"/api/looks/{look.pk}/").status_code == 404


def test_readiness_uses_the_latest_menu_and_hours(
    page, work, make_user, django_capture_on_commit_callbacks
):
    live(page, work)
    claim_page(page, make_user(email_verified=True))
    stale = StylistProfile.objects.get(pk=page.profile_id)
    StylistProfile.objects.filter(pk=stale.pk).update(availability=WEEK_9_TO_6)
    MenuItem.objects.create(stylist=stale, name="Braids", price=100)
    with patch("apps.stylists.tasks.tell_waitlist.delay") as queued:
        with django_capture_on_commit_callbacks(execute=True):
            featured.open_if_ready(stale)
        assert stale.featured is False
        queued.assert_called_once_with(stale.pk)


@pytest.mark.parametrize("relation", ["group", "hidden-fk"])
def test_hidden_related_data_also_prevents_deleting_the_stand_in(
    page, make_user, relation
):
    old = page.profile.account
    if relation == "group":
        from django.contrib.auth.models import Group

        old.groups.add(Group.objects.create(name="Unexpected membership"))
    else:
        FeaturedPage.objects.filter(pk=page.pk).update(added_by=old)
    user = make_user(email_verified=True)
    code = featured.new_link(page).rsplit("/", 1)[-1]
    assert signed(user).post(f"/api/featured/claim/{code}/").status_code == 409
    page.refresh_from_db()
    assert page.claimed_at is None and page.profile.account_id == old.pk
    assert User.objects.filter(pk=old.pk).exists()


def test_claiming_a_draft_publishes_it(page, work, make_user):
    look = work()
    assert not page.profile.published and page.agreed_at is None
    owner = make_user(email_verified=True)
    claim_page(page, owner)
    assert page.profile.published and page.profile.featured
    assert (
        signed().get(f"/api/stylists/by-handle/{page.profile.handle}/").status_code
        == 200
    )
    assert signed().get(f"/api/looks/{look.pk}/").status_code == 200


def test_staff_can_correct_a_draft_handle_but_not_a_live_one(page, work, make_user):
    client, _ = staff_client(make_user, superuser=True)
    item = f"/data/featured/{page.pk}/"

    def change(handle):
        return client.patch(
            item, {"instagram_handle": handle}, content_type="application/json"
        )

    for invalid in ("admin", "bad handle"):
        assert change(invalid).status_code == 400
        page.refresh_from_db()
        assert (
            page.instagram_handle
            == page.profile.handle
            == page.profile.instagram_handle
            == "ama.braids"
        )
    featured.create_page(
        display_name="Other",
        instagram_handle="taken",
        base_area="Peckham",
        added_by=page.added_by,
    )
    assert change("taken").status_code == 400
    assert change("@Ama.Corrected").status_code == 200
    page.refresh_from_db()
    assert (
        page.instagram_handle
        == page.profile.handle
        == page.profile.instagram_handle
        == "ama.corrected"
    )
    live(page, work)
    response = change("another.handle")
    assert response.status_code == 400
    assert response.json()["message"] == "Locked while the page is live"
    page.refresh_from_db()
    assert (
        page.instagram_handle
        == page.profile.handle
        == page.profile.instagram_handle
        == "ama.corrected"
    )


def test_claimed_stylist_can_edit_instagram(page, make_user):
    owner = make_user(email_verified=True)
    claim_page(page, owner)
    response = signed(owner).patch("/api/stylists/me/", {"instagram_handle": "ama.new"})
    assert response.status_code == 200, response.data
    page.profile.refresh_from_db()
    assert page.profile.instagram_handle == "ama.new"


def test_waitlist_deletes_in_batches_without_profile_locks(page, make_user):
    owner = make_user(email_verified=True)
    claim_page(page, owner)
    page.profile.availability = WEEK_9_TO_6
    page.profile.save()
    MenuItem.objects.create(stylist=page.profile, name="Braids", price=50)
    users = User.objects.bulk_create(
        [User(email=f"waiting{i}@test.dev") for i in range(1001)]
    )
    PageWaitlist.objects.bulk_create(
        [PageWaitlist(stylist=page.profile, client=user) for user in users]
    )
    with (
        patch("apps.common.notifications.notify_once") as notify,
        CaptureQueriesContext(connection) as queries,
    ):
        tell_waitlist(page.profile.pk)
        tell_waitlist(page.profile.pk)
    assert notify.call_count == 1001
    sql = [q["sql"] for q in queries]
    assert not any("FOR UPDATE" in q or "FOR NO KEY UPDATE" in q for q in sql)
    deletes = [
        q for q in sql if q.startswith("DELETE") and "stylists_pagewaitlist" in q
    ]
    assert len(deletes) == 3
    assert not PageWaitlist.objects.exists()


def test_public_waitlist_state_is_only_sent_to_signed_in_viewers(page, work, make_user):
    live(page, work)
    path = f"/api/stylists/by-handle/{page.profile.handle}/"
    assert "waitlistJoined" not in signed().get(path).json()
    viewer = make_user()
    assert signed(viewer).get(path).json()["waitlistJoined"] is False
    PageWaitlist.objects.create(stylist=page.profile, client=viewer)
    assert signed(viewer).get(path).json()["waitlistJoined"] is True
    html = Client().get(f"/{page.profile.handle}").content.decode()
    assert "waitlistJoined" not in html


def test_jest_website_exclusion_is_rooted_and_portable():
    import subprocess
    from pathlib import Path

    root = Path(__file__).resolve().parents[2]
    script = r"""
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const vm = require('node:vm');
    const source = fs.readFileSync('./jest.config.js', 'utf8');
    for (const root of ['/work/web/yasante', String.raw`C:\work\web\.codex\yasante`]) {
      const context = { __dirname: root, module: { exports: {} } };
      vm.runInNewContext(source, context);
      const pattern = context.module.exports.testPathIgnorePatterns[1];
      const re = new RegExp(pattern);
      for (const slash of ['/', '\\']) {
        assert(re.test(root + slash + 'web' + slash + 'example.test.ts'));
        assert(!re.test(root + slash + 'src' + slash + 'example.test.ts'));
      }
    }
    """
    subprocess.run(
        ["node", "-e", script], cwd=root, check=True, capture_output=True, text=True
    )


def test_normal_stylist_readiness_does_not_lock_or_query(
    make_stylist, django_assert_num_queries
):
    profile = make_stylist()
    assert not profile.featured
    with (
        django_assert_num_queries(0),
        patch("apps.stylists.tasks.tell_waitlist.delay") as queued,
    ):
        featured.open_if_ready(profile)
    queued.assert_not_called()


def test_too_many_styles_are_refused_without_changes(page, work, make_user):
    client, _ = staff_client(make_user, superuser=True)
    wanted = ["knotless", "cornrows", "twists", "locs"]
    before = Media.objects.count()
    response = client.post(
        f"/data/featured/{page.pk}/looks/", {"styles": wanted, "files": image_file()}
    )
    assert response.status_code == 400
    assert response.json()["message"] == "Pick up to 3 styles"
    assert Media.objects.count() == before and not Look.objects.exists()
    look = work()
    owner = make_user(email_verified=True)
    claim_page(page, owner)
    response = signed(owner).patch(
        f"/api/looks/{look.pk}/", {"styles": wanted, "hair_texture": "4c"}
    )
    assert response.status_code == 400
    assert response.data["message"] == "Pick up to 3 styles"
    look.refresh_from_db()
    assert list(look.styles.values_list("slug", flat=True)) == ["knotless"]
    assert look.hair_texture == ""


def test_yes_record_belongs_to_uploader_and_is_deleted_on_take_down(
    page, make_user, settings, tmp_path
):
    from django.core.files.storage import default_storage

    settings.MEDIA_ROOT = tmp_path
    client, uploader = staff_client(make_user, superuser=True)
    assert uploader.pk != page.added_by_id
    item = f"/data/featured/{page.pk}/"
    assert client.post(item + "yes/", {"proof": image_file()}).status_code == 200
    page.refresh_from_db()
    proof = page.agreed_proof
    assert proof.owner_id == uploader.pk and proof.visibility == "private"
    paths = proof.paths()
    assert all(default_storage.exists(path) for path in paths)
    assert (
        client.post(item + "take-down/", {"handle": page.profile.handle}).status_code
        == 200
    )
    assert not Media.objects.filter(pk=proof.pk).exists()
    assert all(not default_storage.exists(path) for path in paths)
    assert User.objects.filter(pk=uploader.pk).exists()
