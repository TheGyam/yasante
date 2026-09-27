"""The product catalogue grows: Open Beauty Facts when we have little, members' additions, a weekly import."""

import pytest

pytestmark = pytest.mark.django_db

SMOOTHIE = {"code": "0764302290087", "product_name": "Curl Enhancing Smoothie", "brands": "SheaMoisture",
            "categories_tags": ["en:hair-care", "en:hair-styling-creams"]}


def test_a_thin_search_asks_open_beauty_facts_and_keeps_what_it_finds(api, make_user, monkeypatch):
    from apps.shelf import openbeauty
    from apps.shelf.models import Product

    asked = []
    monkeypatch.setattr(openbeauty, "search", lambda q: asked.append(q) or [SMOOTHIE])
    found = api(make_user()).get("/api/products/", q="smoothie").json()
    assert [p["name"] for p in found] == ["Curl Enhancing Smoothie"] and found[0]["category"] == "styler"
    assert Product.objects.get(barcode="0764302290087").source == "open_beauty_facts"
    # Now it's ours: plenty here, so nobody else is asked.
    Product.objects.bulk_create([Product(brand="SheaMoisture", name=f"Smoothie {i}", category="styler") for i in range(5)])
    api(make_user()).get("/api/products/", q="smoothie")
    assert asked == ["smoothie"]


def test_a_member_adds_a_product_only_they_see_until_approved(api, make_user):
    from apps.shelf.models import Product

    me, other = make_user(), make_user()
    added = api(me).post("/api/products/", {"brand": "Mielle", "name": "Rosemary Mint Oil", "category": "oil"})
    assert added.status_code == 201 and added.json()["pending"] is True
    assert [p["name"] for p in api(me).get("/api/products/", q="rosemary").json()] == ["Rosemary Mint Oil"]
    assert api(me).post("/api/shelf/", {"productId": added.json()["id"]}).status_code == 201
    assert api(other).get("/api/products/", q="rosemary mint mielle").json() == []
    assert api(other).post("/api/shelf/", {"productId": added.json()["id"]}).status_code == 404

    Product.objects.filter(pk=added.json()["id"]).update(status="live")
    seen = api(other).get("/api/products/", q="rosemary").json()
    assert seen[0]["name"] == "Rosemary Mint Oil" and "pending" not in seen[0]


def test_adding_what_already_exists_returns_it_instead_of_a_copy(api, make_user):
    from apps.shelf.models import Product

    live = Product.objects.create(brand="Cantu", name="Coconut Curling Cream", category="styler")
    again = api(make_user()).post("/api/products/", {"brand": "cantu", "name": "coconut curling cream", "category": "styler"})
    assert again.status_code == 200 and again.json()["id"] == str(live.pk)
    assert Product.objects.count() == 1


def test_the_weekly_import_adds_new_and_refreshes_only_its_own(monkeypatch):
    from apps.shelf import openbeauty, tasks
    from apps.shelf.models import Product

    ours = Product.objects.create(brand="Yasante pick", name="Kept as we wrote it", category="oil", barcode="0000000011111")
    pages = [[SMOOTHIE, {"code": "0000000011111", "product_name": "Renamed upstream", "brands": "X", "categories_tags": ["en:hair-care"]},
              {"code": "123", "product_name": "Not a barcode", "brands": "Y", "categories_tags": ["en:hair-care"]},
              {"code": "5000000000002", "product_name": "Lipstick", "brands": "Z", "categories_tags": ["en:lipsticks"]}]]
    monkeypatch.setattr(openbeauty, "hair_pages", lambda max_pages: iter(pages))
    assert tasks.import_hair_products() == (1, 0)
    ours.refresh_from_db()
    assert ours.name == "Kept as we wrote it"
    assert Product.objects.filter(source="open_beauty_facts").count() == 1


def test_only_real_hair_products_for_our_shelf_come_in():
    from apps.shelf import openbeauty

    dye = {"product_name": "ColorSilk 3-65", "brands": "Revlon", "categories_tags": ["en:hair-care", "en:hair-dyes"]}
    defaced = {"product_name": "Ballsack", "brands": "L'Oréal Paris", "categories_tags": ["en:hair-care"]}
    nameless_brand = {"product_name": "Leave-in cream", "brands": "", "categories_tags": ["en:hair-care"]}
    assert not openbeauty.is_hair(dye)
    assert openbeauty.fields(defaced) is None and openbeauty.fields(nameless_brand) is None
    pet = {"product_name": "Fox Poo Dog Shampoo", "brands": "Animology", "categories_tags": ["en:shampoos"]}
    generic = {"product_name": "Shampoo", "brands": "Tresemmé", "categories_tags": ["en:shampoos"]}
    assert openbeauty.fields(pet) is None and openbeauty.fields(generic) is None
    assert openbeauty.fields(SMOOTHIE)["brand"] == "SheaMoisture"
