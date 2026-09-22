"""Her page, handle, menu, payment details, portfolio, free times, numbers, summary."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from django.utils import timezone

from .conftest import WEEK_9_TO_6

pytestmark = pytest.mark.django_db
LONDON = ZoneInfo("Europe/London")


def test_handle_check_suggests_alternatives(api, make_stylist):
    profile = make_stylist()
    free = api().get("/api/stylists/handle-available/", handle="brandnewhandle").json()
    assert free == {"handle": "brandnewhandle", "available": True}
    taken = api().get("/api/stylists/handle-available/", handle=profile.handle).json()
    assert taken["available"] is False and taken["suggestions"]
    assert api().get("/api/stylists/handle-available/", handle="admin").json()["available"] is False


def test_create_a_draft_page_and_publish_it(api, make_user):
    user = make_user(verified=False)
    draft = {
        "displayName": "Braids by Ama",
        "handle": "braidsbyama",
        "serviceModels": ["home"],
        "baseArea": "Peckham",
        "policies": {"noticeHours": 48, "depositType": "fixed", "depositAmount": 20, "rescheduleFreeOnce": True},
        "availability": WEEK_9_TO_6,
        "paymentMethods": [{"label": "Monzo", "details": "monzo.me/ama"}],
    }
    created = api(user).post("/api/stylists/", draft)
    assert created.status_code == 201, created.json()
    body = created.json()
    assert body["published"] is False and body["verificationTier"] == 0
    assert body["policies"]["depositAmount"] == 20  # a number, not "20.00"
    assert body["paymentMethods"][0]["label"] == "Monzo"
    user.refresh_from_db()
    assert "stylist" in user.roles
    # Publishing needs a verified phone.
    assert api(user).post("/api/stylists/me/publish/").status_code == 403
    user.phone_verified = True
    user.save()
    assert api(user).post("/api/stylists/me/publish/").json()["published"] is True
    assert api(user).post("/api/stylists/", draft).status_code == 400


def test_handles_follow_the_apps_rules(api, make_user):
    for bad in ("admin", "a..b", "ends.", "has space", "Hy-phen"):
        body = {"displayName": "x", "handle": bad, "serviceModels": ["home"], "baseArea": "Peckham"}
        assert api(make_user()).post("/api/stylists/", body).status_code == 400, bad


def test_me_is_404_without_a_page(api, make_user):
    assert api(make_user()).get("/api/stylists/me/").status_code == 404


def test_payment_methods_are_private_and_capped(api, make_stylist):
    profile = make_stylist()
    me = api(profile.account)
    saved = me.patch(
        "/api/stylists/me/",
        {"paymentMethods": [{"label": "Monzo", "details": " monzo.me/ama "}, {"label": "Bank", "details": ""}]},
    )
    assert saved.status_code == 200
    assert [m["details"] for m in saved.json()["paymentMethods"]] == ["monzo.me/ama"]
    six = [{"label": f"W{i}", "details": "x"} for i in range(6)]
    assert me.patch("/api/stylists/me/", {"paymentMethods": six}).status_code == 400
    page = api().get(f"/api/stylists/by-handle/{profile.handle}/").json()
    assert "paymentMethods" not in page["profile"]
    assert "address" not in page["profile"]
    assert "proofPhotoUri" not in page["profile"]


def test_public_page_hides_drafts_and_blocked_people(api, make_stylist, make_user):
    from apps.looks.models import Block

    draft = make_stylist(published=False)
    assert api().get(f"/api/stylists/by-handle/{draft.handle}/").status_code == 404
    live = make_stylist()
    page = api().get(f"/api/stylists/by-handle/{live.handle}/")
    assert page.status_code == 200
    assert {"profile", "menu", "photos", "confirmedStyles", "reviews"} <= set(page.json())
    assert page.json()["menu"][0]["price"] == 120
    viewer = make_user()
    Block.objects.create(blocker=live.account, blocked=viewer)
    assert api(viewer).get(f"/api/stylists/by-handle/{live.handle}/").status_code == 404


def test_menu_crud_and_import(api, make_stylist):
    profile = make_stylist()
    me = api(profile.account)
    assert len(me.get("/api/stylists/me/menu/").json()) == 2
    bad = me.post("/api/stylists/me/menu/", {"name": "", "price": 10})
    assert bad.status_code == 400 and bad.json()["message"] == "A service needs a name and a price"
    item = me.post(
        "/api/stylists/me/menu/",
        {
            "name": "Twists",
            "price": 90,
            "fromPrice": True,
            "durationMinutes": 240,
            "options": [
                {"group": "length", "label": "Shoulder", "add": 0},
                {"group": "length", "label": "Waist", "add": 40, "addMinutes": 120},
                {"group": "colour", "label": "Bad", "add": 5},
            ],
        },
    ).json()
    assert item["price"] == 90 and len(item["options"]) == 2 and item["options"][1]["addMinutes"] == 120
    edited = me.patch(f"/api/stylists/me/menu/{item['id']}/", {"price": 95})
    assert edited.json()["price"] == 95 and edited.json()["name"] == "Twists"
    assert me.delete(f"/api/stylists/me/menu/{item['id']}/").status_code == 204
    imported = me.post(
        "/api/stylists/me/menu/import/",
        {"items": [{"name": "Wash", "price": 30}, {"name": "Silk press", "price": 55, "durationMinutes": 120}]},
    )
    assert imported.status_code == 201 and len(imported.json()) == 2


def test_portfolio_posts_tagged_photos_to_looks(api, make_stylist, styles):
    from apps.looks.models import Look

    profile = make_stylist()
    knotless = profile.menu_items.get(name="Knotless braids")
    me = api(profile.account)
    added = me.post(
        "/api/stylists/me/portfolio/",
        {
            "postAsLooks": True,
            "photos": [
                {"uri": "https://example.com/a.jpg", "serviceId": str(knotless.pk)},
                {"uri": "https://example.com/b.jpg"},
            ],
        },
    )
    assert added.status_code == 201
    first, second = added.json()
    assert first["lookId"] and "lookId" not in second
    look = api().get(f"/api/looks/{first['lookId']}/").json()
    assert look["styles"] == ["knotless"] and look["price"] == 120
    assert look["stylist"]["id"] == str(profile.account_id)

    before = Look.objects.count()
    quiet = me.post(
        "/api/stylists/me/portfolio/",
        {"postAsLooks": False, "photos": [{"uri": "https://example.com/c.jpg", "serviceId": str(knotless.pk)}]},
    )
    assert "lookId" not in quiet.json()[0] and Look.objects.count() == before

    photo_id = second["id"]
    retag = me.patch(f"/api/stylists/me/portfolio/{photo_id}/", {"serviceId": str(knotless.pk)})
    assert retag.json()["serviceId"] == str(knotless.pk)
    assert me.delete(f"/api/stylists/me/portfolio/{photo_id}/").status_code == 204
    assert len(me.get("/api/stylists/me/portfolio/").json()) == 2


def test_a_draft_page_shares_nothing(api, make_stylist, styles):
    profile = make_stylist(published=False)
    knotless = profile.menu_items.get(name="Knotless braids")
    added = api(profile.account).post(
        "/api/stylists/me/portfolio/",
        {"postAsLooks": True, "photos": [{"uri": "https://example.com/a.jpg", "serviceId": str(knotless.pk)}]},
    )
    assert "lookId" not in added.json()[0]


def test_free_times_are_in_her_local_hours_and_fit_the_job(api, make_stylist):
    profile = make_stylist()
    cornrows = profile.menu_items.get(name="Cornrows")
    url = f"/api/stylists/by-handle/{profile.handle}/slots/"
    quick = api().get(url, service=str(cornrows.pk), options="big").json()
    longer = api().get(url, service=str(cornrows.pk), options="small").json()
    assert quick["minutes"] == 120 and longer["minutes"] == 180
    for day in longer["days"]:
        local = [datetime.fromisoformat(t.replace("Z", "+00:00")).astimezone(LONDON) for t in day["times"]]
        assert local[0].hour >= 9
        # A three-hour job finishes by six: the last start is 15:00 local.
        assert (local[-1].hour, local[-1].minute) <= (15, 0)
        assert local[-1].weekday() != 6  # Sundays off
    assert api().get(url, service="nope").status_code == 400


def test_a_taken_time_stops_being_offered(api, make_stylist, make_user, book):
    profile = make_stylist()
    service = profile.menu_items.get(name="Knotless braids")
    url = f"/api/stylists/by-handle/{profile.handle}/slots/"
    first = api().get(url, service=str(service.pk)).json()["days"][0]["times"][0]
    book(make_user(), profile, service, time=first)
    again = api().get(url, service=str(service.pk)).json()
    assert first not in [t for d in again["days"] for t in d["times"]]


def test_every_day_off_means_no_slots(api, make_stylist):
    profile = make_stylist(availability={"week": [None] * 7, "blocked": []})
    service = profile.menu_items.first()
    days = api().get(f"/api/stylists/by-handle/{profile.handle}/slots/", service=str(service.pk)).json()["days"]
    assert days == []


def test_numbers_and_summary(api, make_stylist, make_user, book):
    profile = make_stylist()
    book(make_user(), profile)
    numbers = api(profile.account).get("/api/stylists/me/numbers/").json()
    assert set(numbers) == {"weekOf", "thisWeek", "lastWeek", "timing"}
    assert numbers["thisWeek"]["requests"] == 1
    summary = api(profile.account).get("/api/stylists/me/summary/").json()
    assert summary == {"pendingRequests": 1, "appointmentsToday": 0}


def test_timing_label_needs_ten_and_sixty_percent(api, make_stylist, make_user):
    from apps.bookings.models import Booking

    profile = make_stylist()
    client = make_user()
    for i in range(10):
        Booking.objects.create(
            status="completed",
            client=client,
            client_name=client.name,
            stylist=profile.account,
            stylist_profile=profile,
            stylist_name=profile.display_name,
            service_id=profile.menu_items.first().pk,
            service_name="Knotless braids",
            price=120,
            area="Peckham",
            policy=profile.policies,
            policy_version="v1",
            completed_at=timezone.now() - timedelta(days=i + 1),
            timing_outcome="on_time" if i < 7 else "over",
            timing_bucket="" if i < 7 else "30_60",
        )
    page = api().get(f"/api/stylists/by-handle/{profile.handle}/").json()
    assert page["timingLabel"] == {"outcome": "on_time", "count": 7, "sample": 10}
