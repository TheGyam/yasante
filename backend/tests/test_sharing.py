"""Sharing collections and care plans: links, tagging along, making it yours (docs/SHARING_PLAN.md)."""

from datetime import timedelta

import pytest
from django.utils import timezone

pytestmark = pytest.mark.django_db


@pytest.fixture
def ama(make_user):
    return make_user(name="Ama Owusu", username="braidsbyama")


def _collection(client, name="Winter braids", looks=()):
    col = client.post("/api/collections/", {"name": name}).json()
    for look in looks:
        assert client.post(f"/api/collections/{col['id']}/items/", {"kind": "look", "refId": str(look.pk)}).status_code == 201
    return col


def _share(client, kind, row_id):
    shared = client.post(f"/api/{kind}/{row_id}/share/")
    assert shared.status_code == 200, shared.json()
    return shared.json()


PLAN = {
    "name": "Gentle wash day",
    "frequency": "weekly",
    "timeOfDay": "evening",
    "steps": ["Pre-poo", "Cleanse", "Deep condition"],
}


def test_sharing_a_collection_makes_a_random_link_and_stopping_kills_it(api, ama, make_user, make_look):
    me = api(ama)
    col = _collection(me, looks=[make_look(make_user())])
    assert col["sharing"] == "private" and "shareUrl" not in col

    shared = _share(me, "collections", col["id"])
    code = shared["shareUrl"].rsplit("/", 1)[1]
    assert shared["sharing"] == "link" and shared["isPrivate"] is False
    assert shared["shareUrl"] == f"https://yasante.com/c/{code}" and len(code) >= 22
    assert shared["followers"] == 0 and shared["madeItTheirs"] == 0
    # Sharing again keeps the same link.
    assert _share(me, "collections", col["id"])["shareUrl"] == shared["shareUrl"]

    page = api().get(f"/api/shared/collections/{code}/")
    assert page.status_code == 200
    body = page.json()
    assert body["name"] == "Winter braids" and body["itemCount"] == 1
    assert body["author"] == {"name": "Ama Owusu", "username": "braidsbyama"}
    # Nothing else of hers.
    assert "email" not in str(body) and ama.email not in str(body)

    stopped = me.delete(f"/api/collections/{col['id']}/share/").json()
    assert stopped["sharing"] == "private" and "shareUrl" not in stopped
    assert api().get(f"/api/shared/collections/{code}/").status_code == 404
    # A new link each time it's shared.
    assert _share(me, "collections", col["id"])["shareUrl"] != shared["shareUrl"]


def test_sharing_needs_a_username(api, make_user):
    me = api(make_user())
    col = _collection(me)
    answer = me.post(f"/api/collections/{col['id']}/share/")
    assert answer.status_code == 400 and answer.json()["code"] == "username_required"


def test_only_its_owner_can_share_or_stop_it(api, ama, make_user):
    col = _collection(api(ama))
    other = api(make_user())
    assert other.post(f"/api/collections/{col['id']}/share/").status_code == 404
    assert other.delete(f"/api/collections/{col['id']}/share/").status_code == 404


def test_a_shared_collection_never_shows_private_hidden_removed_or_blocked_looks(api, ama, make_user, make_look):
    from apps.looks.models import Block

    me = api(ama)
    stranger = make_user()
    public = make_look(make_user())
    hers_private = make_look(ama, visibility="private")
    hidden = make_look(make_user(), status="hidden")
    blocked_author = make_user()
    by_blocked = make_look(blocked_author)
    col = _collection(me, looks=[public, hers_private, by_blocked])
    # Saved before it was hidden.
    from apps.planner.models import CollectionItem

    CollectionItem.objects.create(collection_id=col["id"], kind="look", ref_id=str(hidden.pk), photo_uri="https://e.com/h.jpg")
    code = _share(me, "collections", col["id"])["shareUrl"].rsplit("/", 1)[1]
    Block.objects.create(blocker=stranger, blocked=blocked_author)

    seen = api(stranger).get(f"/api/shared/collections/{code}/").json()
    assert [i["refId"] for i in seen["items"]] == [str(public.pk)]
    assert seen["itemCount"] == 1
    # Her own page is hers in full.
    assert len(me.get(f"/api/collections/{col['id']}/items/").json()) == 4


def test_blocking_either_way_hides_the_link(api, ama, make_user):
    from apps.looks.models import Block

    col = _collection(api(ama))
    code = _share(api(ama), "collections", col["id"])["shareUrl"].rsplit("/", 1)[1]
    blocked = make_user()
    Block.objects.create(blocker=ama, blocked=blocked)
    assert api(blocked).get(f"/api/shared/collections/{code}/").status_code == 404
    assert api(blocked).post(f"/api/shared/collections/{code}/follow/").status_code == 404


def test_a_made_up_code_finds_nothing(api):
    assert api().get("/api/shared/collections/not-a-real-code/").status_code == 404
    assert api().get("/api/shared/care-plans/not-a-real-code/").status_code == 404


def test_tagging_along_keeps_it_up_to_date_and_not_hers_to_change(api, ama, make_user, make_look):
    me = api(ama)
    col = _collection(me, looks=[make_look(make_user())])
    code = _share(me, "collections", col["id"])["shareUrl"].rsplit("/", 1)[1]
    efua = api(make_user(name="Efua Mensah"))

    tagged = efua.post(f"/api/shared/collections/{code}/follow/")
    assert tagged.status_code == 201
    row = tagged.json()
    assert row["name"] == "Winter braids" and row["itemCount"] == 1
    assert row["following"]["author"]["name"] == "Ama Owusu" and row["following"]["code"] == code
    # Twice is still once.
    again = efua.post(f"/api/shared/collections/{code}/follow/")
    assert again.status_code == 200 and again.json()["id"] == row["id"]
    page = efua.get(f"/api/shared/collections/{code}/").json()
    assert page["followingId"] == row["id"] and not page.get("ownId")

    # Ama adds a look: Efua sees it.
    newer = make_look(make_user())
    me.post(f"/api/collections/{col['id']}/items/", {"kind": "look", "refId": str(newer.pk)})
    assert len(efua.get(f"/api/collections/{row['id']}/items/").json()) == 2
    listed = next(c for c in efua.get("/api/collections/").json() if c["id"] == row["id"])
    assert listed["itemCount"] == 2 and listed["following"]

    # Efua can't change it.
    assert efua.patch(f"/api/collections/{row['id']}/", {"name": "Mine now"}).status_code == 403
    assert efua.post(f"/api/collections/{row['id']}/items/", {"kind": "look", "refId": str(newer.pk)}).status_code == 403
    assert efua.post(f"/api/collections/{row['id']}/share/").status_code == 403

    # Ama sees a count, never who.
    owner = me.get(f"/api/collections/{col['id']}/").json()
    assert owner["followers"] == 1 and "Efua" not in str(owner)

    # Stopping sharing takes it out of Efua's Planner.
    me.delete(f"/api/collections/{col['id']}/share/")
    assert all(c["id"] != row["id"] for c in efua.get("/api/collections/").json())


def test_her_own_link_is_hers(api, ama):
    me = api(ama)
    col = _collection(me)
    code = _share(me, "collections", col["id"])["shareUrl"].rsplit("/", 1)[1]
    assert me.get(f"/api/shared/collections/{code}/").json()["ownId"] == col["id"]
    assert me.post(f"/api/shared/collections/{code}/follow/").status_code == 400
    assert me.post(f"/api/shared/collections/{code}/make-mine/", {}).status_code == 400


def test_signed_out_people_can_look_but_not_tag_along(api, ama):
    col = _collection(api(ama))
    code = _share(api(ama), "collections", col["id"])["shareUrl"].rsplit("/", 1)[1]
    assert api().get(f"/api/shared/collections/{code}/").status_code == 200
    assert api().post(f"/api/shared/collections/{code}/follow/").status_code == 401
    assert api().post(f"/api/shared/collections/{code}/make-mine/", {}).status_code == 401


def test_making_it_yours_copies_it_with_credit_and_cuts_it_off(api, ama, make_user, make_look):
    me = api(ama)
    first, private = make_look(make_user()), make_look(ama, visibility="private")
    col = _collection(me, looks=[first, private])
    code = _share(me, "collections", col["id"])["shareUrl"].rsplit("/", 1)[1]
    efua_user = make_user()
    efua = api(efua_user)
    _collection(efua, name="Winter braids")

    made = efua.post(f"/api/shared/collections/{code}/make-mine/", {})
    assert made.status_code == 201
    mine = made.json()
    # She already had one called that.
    assert mine["name"] == "Winter braids 2" and mine["sharing"] == "private"
    assert mine["basedOn"] == {"name": "Winter braids", "authorName": "Ama Owusu", "code": code}
    # Only what she could see came with it.
    assert mine["itemCount"] == 1 and "following" not in mine
    assert efua.patch(f"/api/collections/{mine['id']}/", {"name": "My winter"}).status_code == 200
    assert me.get(f"/api/collections/{col['id']}/").json()["madeItTheirs"] == 1

    # Ama's changes don't reach it.
    me.post(f"/api/collections/{col['id']}/items/", {"kind": "look", "refId": str(make_look(make_user()).pk)})
    assert len(efua.get(f"/api/collections/{mine['id']}/items/").json()) == 1

    # When Ama's account goes, Efua's stays, without Ama's name.
    ama.delete()
    kept = efua.get(f"/api/collections/{mine['id']}/").json()
    assert kept["basedOn"] == {"name": "Winter braids"}


def test_making_one_she_tags_along_with_hers_swaps_it(api, ama, make_user, make_look):
    me = api(ama)
    col = _collection(me, looks=[make_look(make_user())])
    code = _share(me, "collections", col["id"])["shareUrl"].rsplit("/", 1)[1]
    efua = api(make_user())
    row = efua.post(f"/api/shared/collections/{code}/follow/").json()

    mine = efua.post(f"/api/collections/{row['id']}/make-mine/", {"name": "Mine"}).json()
    assert mine["name"] == "Mine" and mine["basedOn"]["name"] == "Winter braids" and "following" not in mine
    ids = [c["id"] for c in efua.get("/api/collections/").json()]
    assert ids == [mine["id"]]
    assert efua.post(f"/api/collections/{mine['id']}/make-mine/", {}).status_code == 400


def test_deleting_a_shared_collection_takes_it_from_everyone_tagging_along(api, ama, make_user):
    me = api(ama)
    col = _collection(me)
    code = _share(me, "collections", col["id"])["shareUrl"].rsplit("/", 1)[1]
    efua = api(make_user())
    efua.post(f"/api/shared/collections/{code}/follow/")
    me.delete(f"/api/collections/{col['id']}/")
    assert efua.get("/api/collections/").json() == []


def test_leaving_one_she_tags_along_with_leaves_the_authors_alone(api, ama, make_user):
    me = api(ama)
    col = _collection(me)
    code = _share(me, "collections", col["id"])["shareUrl"].rsplit("/", 1)[1]
    efua = api(make_user())
    row = efua.post(f"/api/shared/collections/{code}/follow/").json()
    assert efua.delete(f"/api/collections/{row['id']}/").status_code == 204
    assert me.get(f"/api/collections/{col['id']}/").json()["followers"] == 0


def test_tagging_along_with_a_plan_keeps_her_own_schedule(api, ama, make_user):
    me = api(ama)
    plan = me.post("/api/care-plans/", PLAN).json()
    shared = _share(me, "care-plans", plan["id"])
    code = shared["shareUrl"].rsplit("/", 1)[1]
    assert shared["shareUrl"] == f"https://yasante.com/p/{code}"

    page = api().get(f"/api/shared/care-plans/{code}/").json()
    assert page["name"] == "Gentle wash day" and [s["text"] for s in page["steps"]] == PLAN["steps"]
    assert page["frequency"] == "weekly" and page["timeOfDay"] == "evening"

    efua = api(make_user())
    tagged = efua.post(
        f"/api/shared/care-plans/{code}/follow/",
        {"frequency": "specific-days", "specificDays": [0, 3], "timeOfDay": "morning", "remindersOn": True},
    )
    assert tagged.status_code == 201
    row = tagged.json()
    assert row["name"] == "Gentle wash day" and len(row["steps"]) == 3
    assert row["frequency"] == "specific-days" and row["specificDays"] == [0, 3] and row["remindersOn"] is True
    assert row["following"]["author"]["username"] == "braidsbyama"

    # Her schedule is hers to change; the name and steps aren't.
    assert efua.patch(f"/api/care-plans/{row['id']}/", {"timeOfDay": "night"}).json()["timeOfDay"] == "night"
    assert efua.patch(f"/api/care-plans/{row['id']}/", {"steps": ["Mine"]}).status_code == 403
    assert efua.patch(f"/api/care-plans/{row['id']}/", {"name": "Mine"}).status_code == 403
    # Her own record of doing it.
    assert efua.post(f"/api/care-plans/{row['id']}/sessions/", {}).status_code == 201

    # Ama changes the steps: Efua's follow along.
    me.patch(f"/api/care-plans/{plan['id']}/", {"steps": ["Pre-poo", "Cleanse", "Mask", "Seal"]})
    assert len(efua.get(f"/api/care-plans/{row['id']}/").json()["steps"]) == 4


def test_a_plan_made_yours_keeps_her_schedule_and_history(api, ama, make_user):
    me = api(ama)
    plan = me.post("/api/care-plans/", PLAN).json()
    code = _share(me, "care-plans", plan["id"])["shareUrl"].rsplit("/", 1)[1]
    efua = api(make_user())
    row = efua.post(f"/api/shared/care-plans/{code}/follow/", {"timeOfDay": "morning"}).json()
    efua.post(f"/api/care-plans/{row['id']}/sessions/", {})

    mine = efua.post(f"/api/care-plans/{row['id']}/make-mine/", {}).json()
    assert mine["id"] == row["id"] and mine["timeOfDay"] == "morning" and "following" not in mine
    assert mine["basedOn"]["authorName"] == "Ama Owusu"
    assert len(efua.get(f"/api/care-plans/{row['id']}/sessions/").json()) == 1
    # Now hers to change, and Ama's changes don't reach it.
    assert efua.patch(f"/api/care-plans/{row['id']}/", {"steps": ["Only this"]}).status_code == 200
    me.patch(f"/api/care-plans/{plan['id']}/", {"steps": ["Different"]})
    assert [s["text"] for s in efua.get(f"/api/care-plans/{row['id']}/").json()["steps"]] == ["Only this"]

    # Straight from the link too.
    copy = efua.post(f"/api/shared/care-plans/{code}/make-mine/", {}).json()
    # She already has one called that now.
    assert copy["name"] == "Gentle wash day 2" and copy["basedOn"]["code"] == code


def test_she_hears_once_a_day_when_what_she_tags_along_with_changes(api, ama, make_user, make_look):
    from apps.common.models import NotificationLog
    from apps.planner.tasks import tell_people_tagging_along

    me = api(ama)
    col = _collection(me)
    code = _share(me, "collections", col["id"])["shareUrl"].rsplit("/", 1)[1]
    efua_user = make_user()
    api(efua_user).post(f"/api/shared/collections/{code}/follow/")

    tell_people_tagging_along()
    assert not NotificationLog.objects.filter(user=efua_user).exists()

    me.post(f"/api/collections/{col['id']}/items/", {"kind": "look", "refId": str(make_look(make_user()).pk)})
    tell_people_tagging_along()
    tell_people_tagging_along()
    notes = NotificationLog.objects.filter(user=efua_user, category="tagging_along")
    assert notes.count() == 1 and notes.first().title == "Ama updated Winter braids"

    # Nothing new: nothing tomorrow either.
    tell_people_tagging_along(now=timezone.now() + timedelta(days=1))
    assert notes.count() == 1


def test_the_counts_are_hers_alone(api, ama, make_user):
    me = api(ama)
    col = _collection(me)
    code = _share(me, "collections", col["id"])["shareUrl"].rsplit("/", 1)[1]
    for _ in range(3):
        api(make_user()).post(f"/api/shared/collections/{code}/follow/")
    page = api(make_user()).get(f"/api/shared/collections/{code}/").json()
    assert "followers" not in page and "madeItTheirs" not in page
    assert me.get("/api/collections/").json()[0]["followers"] == 3


def test_the_policies_say_what_sharing_shows_and_keeps(api):
    privacy = api().get("/api/policies/privacy/").json()
    assert privacy["version"] == "2026-10-24"
    assert "anyone with its link can see its name and what's in it" in privacy["body"]
    assert "never who" in privacy["body"] and "Care plan reminders are set on your phone itself" in privacy["body"]
    terms = api().get("/api/policies/terms/").json()["body"]
    assert "If you share a collection or a care plan, you let others with the link view it" in terms
    guidelines = api().get("/api/policies/guidelines/").json()["body"]
    assert "Care plans you share must be safe to follow." in guidelines
