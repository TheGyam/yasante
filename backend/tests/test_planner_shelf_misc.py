"""Collections, care plans, the shelf, uploads, the library and favourites."""

import io

import pytest
from PIL import Image

pytestmark = pytest.mark.django_db


def test_collections_crud_with_counts_and_covers(api, make_user, make_look):
    look = make_look(make_user(), caption="Two weeks in")
    me = api(make_user())
    created = me.post("/api/collections/", {"name": "Holiday hair", "isPrivate": True})
    assert created.status_code == 201
    col = created.json()
    assert col["isPrivate"] is True and col["itemCount"] == 0
    assert me.post("/api/collections/", {"name": ""}).status_code == 400
    item = me.post(f"/api/collections/{col['id']}/items/", {"kind": "look", "refId": str(look.pk)})
    assert item.status_code == 201
    assert item.json()["title"] == "Two weeks in" and item.json()["imageUri"]
    # Saving again returns what's there rather than doubling it.
    assert me.post(f"/api/collections/{col['id']}/items/", {"kind": "look", "refId": str(look.pk)}).status_code == 200
    article = me.post(
        f"/api/collections/{col['id']}/items/",
        {"kind": "content", "refId": "article-7", "title": "Wash day", "imageUri": "https://x.com/c.jpg"},
    )
    assert article.status_code == 201
    listed = me.get("/api/collections/").json()[0]
    assert listed["itemCount"] == 2 and listed["coverUri"]
    items = me.get(f"/api/collections/{col['id']}/items/").json()
    assert {i["kind"] for i in items} == {"look", "content"}
    renamed = me.patch(f"/api/collections/{col['id']}/", {"name": "Summer", "isPrivate": False}).json()
    assert renamed["name"] == "Summer" and renamed["isPrivate"] is False
    look_item = next(i for i in items if i["kind"] == "look")
    assert me.delete(f"/api/collections/{col['id']}/items/{look_item['id']}/").status_code == 204
    assert api(make_user()).get(f"/api/looks/{look.pk}/").json()["saveCount"] == 0
    assert me.delete(f"/api/collections/{col['id']}/").status_code == 204
    assert me.get("/api/collections/").json() == []


def test_a_collection_is_only_its_owners(api, make_user):
    owner = api(make_user())
    col = owner.post("/api/collections/", {"name": "Mine"}).json()
    assert api(make_user()).get(f"/api/collections/{col['id']}/items/").status_code == 404


def test_care_plans_with_steps_and_sessions(api, make_user):
    me = api(make_user())
    draft = {
        "name": "Wash day",
        "frequency": "specific-days",
        "specificDays": [1, 4],
        "timeOfDay": "morning",
        "remindersOn": True,
        "steps": ["Pre-poo", "Cleanse", "Deep condition"],
    }
    plan = me.post("/api/care-plans/", draft)
    assert plan.status_code == 201
    body = plan.json()
    assert [s["text"] for s in body["steps"]] == ["Pre-poo", "Cleanse", "Deep condition"]
    assert body["specificDays"] == [1, 4] and body["remindersOn"] is True
    assert me.post("/api/care-plans/", {**draft, "steps": []}).status_code == 400
    edited = me.patch(f"/api/care-plans/{body['id']}/", {"steps": ["Just rinse"], "frequency": "weekly"}).json()
    assert [s["text"] for s in edited["steps"]] == ["Just rinse"] and "specificDays" not in edited
    session = me.post(f"/api/care-plans/{body['id']}/sessions/", {"notes": "Felt great"})
    assert session.status_code == 201
    assert me.get(f"/api/care-plans/{body['id']}/sessions/").json()[0]["notes"] == "Felt great"
    assert me.get("/api/care-plans/").json()[0]["lastDoneAt"]
    assert me.delete(f"/api/care-plans/{body['id']}/").status_code == 204


def test_shelf_rating_finishing_and_buying_again(api, make_user):
    from apps.shelf.models import Product

    Product.objects.create(brand="Cantu", name="Shea Butter Leave-In", category="leave-in")
    mielle = Product.objects.create(brand="Mielle", name="Rosemary Mint Oil", category="oil")
    user = make_user(texture="coily")
    me = api(user)
    found = me.get("/api/products/", q="rosemary oil").json()
    assert [p["name"] for p in found] == ["Rosemary Mint Oil"]
    item = me.post("/api/shelf/", {"productId": str(mielle.pk)})
    assert item.status_code == 201 and item.json()["status"] == "using" and item.json()["startedAt"]
    assert me.post("/api/shelf/", {"productId": str(mielle.pk)}).status_code == 409
    url = f"/api/shelf/{item.json()['id']}/"
    assert me.patch(url, {"rating": 9}).status_code == 400
    assert me.patch(url, {"rating": 5}).json()["rating"] == 5
    assert me.patch(url, {"status": "repurchased"}).status_code == 409
    finished = me.patch(url, {"status": "finished"}).json()
    assert finished["status"] == "finished" and finished["finishedAt"]
    again = me.patch(url, {"status": "repurchased"}).json()
    assert again["status"] == "repurchased" and again["timesBought"] == 2 and "finishedAt" not in again
    assert me.delete(url).status_code == 204
    assert me.get("/api/shelf/").json() == []


def test_uploads_return_a_photo_a_grid_copy_and_its_shape(api, make_user, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    buffer = io.BytesIO()
    Image.new("RGB", (1200, 1500), "pink").save(buffer, "PNG")
    buffer.seek(0)
    buffer.name = "hair.png"
    client = api(make_user()).client
    response = client.post("/api/uploads/", {"file": buffer}, format="multipart")
    assert response.status_code == 201, response.json()
    body = response.json()
    assert body["uri"].startswith("http") and body["thumbUri"].startswith("http")
    assert body["photoAspect"] == 0.8
    not_a_photo = client.post(
        "/api/uploads/", {"file": io.BytesIO(b"hello")}, format="multipart"
    )
    assert not_a_photo.status_code == 400


def test_library_and_favourites_on_the_apps_paths(api, make_user):
    from apps.content.models import ContentItem

    article = ContentItem.objects.create(
        title="Wash day, simplified",
        slug="wash-day",
        kind="article",
        body="Start with the scalp.\n\nThen the lengths.",
        topic_tags=["care"],
        texture_tags=["coily"],
        published=True,
    )
    ContentItem.objects.create(title="Draft", slug="draft", kind="video", published=False)
    listed = api().get("/api/content/content/").json()
    assert [c["title"] for c in listed] == ["Wash day, simplified"]
    assert listed[0]["topic"] == "care" and listed[0]["description"] == "Start with the scalp."
    assert api().get("/api/content/content/search/", q="scalp").json()[0]["id"] == str(article.pk)
    assert api().get(f"/api/content/content/{article.pk}/").json()["type"] == "article"

    me = api(make_user())
    toggled = me.post("/api/favorites/favorites/toggle/", {"contentId": str(article.pk)}).json()
    assert toggled["isFavorite"] is True and toggled["favorite"]["contentId"] == str(article.pk)
    assert me.get("/api/favorites/favorites/check/", contentId=str(article.pk)).json() == {"isFavorite": True}
    assert len(me.get("/api/favorites/favorites/").json()) == 1
    assert me.post("/api/favorites/favorites/toggle/", {"contentId": str(article.pk)}).json() == {"isFavorite": False}


def test_collections_list_their_newest_pictures_for_the_stack(api, make_user, make_look):
    me = api(make_user())
    collection = me.post("/api/collections/", {"name": "Ideas"}).json()
    author = make_user()
    looks = [make_look(author, caption=f"Look {i}") for i in range(5)]
    for look in looks:
        me.post(f"/api/collections/{collection['id']}/items/", {"kind": "look", "refId": str(look.pk)})
    listed = me.get("/api/collections/").json()[0]
    assert listed["itemCount"] == 5 and len(listed["previewUris"]) == 4
    assert listed["coverUri"] == listed["previewUris"][0]
