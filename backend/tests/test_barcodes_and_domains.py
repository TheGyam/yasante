"""Barcode scanning onto the shelf, and the domain marker every hair record carries."""

import pytest

pytestmark = pytest.mark.django_db


@pytest.fixture
def product(db):
    from apps.shelf.models import Product

    return Product.objects.create(brand="Cantu", name="Leave-in conditioning cream", category="leave-in", barcode="0817513010034")


def test_a_known_barcode_comes_from_the_catalogue(api, make_user, product, monkeypatch):
    from apps.shelf import barcodes

    monkeypatch.setattr(barcodes, "_fetch", lambda code: pytest.fail("shouldn't look elsewhere"))
    found = api(make_user()).get("/api/products/barcode/0817513010034/")
    assert found.status_code == 200
    assert found.json()["product"]["id"] == str(product.pk) and found.json()["source"] == "catalogue"


def test_an_unknown_barcode_is_looked_up_once_then_kept(api, make_user, monkeypatch):
    from apps.shelf import barcodes
    from apps.shelf.models import Product

    calls = []

    def fake(code):
        calls.append(code)
        return {"status": 1, "product": {"product_name": "Curl Enhancing Smoothie", "brands": "SheaMoisture, Sundial",
                                          "categories_tags": ["en:hair-styling-creams"], "ingredients_text": "Water, shea butter"}}

    monkeypatch.setattr(barcodes, "_fetch", fake)
    me = api(make_user())
    first = me.get("/api/products/barcode/764302290087/").json()
    assert first["source"] == "open_beauty_facts"
    assert first["product"]["brand"] == "SheaMoisture" and first["product"]["category"] == "styler"
    again = me.get("/api/products/barcode/764302290087/").json()
    assert again["source"] == "catalogue" and len(calls) == 1
    assert Product.objects.get(barcode="764302290087").domain == "hair"


def test_nobody_knows_it_or_it_isnt_a_barcode(api, make_user, monkeypatch):
    from apps.shelf import barcodes

    monkeypatch.setattr(barcodes, "_fetch", lambda code: {"status": 0})
    me = api(make_user())
    missing = me.get("/api/products/barcode/5000000000001/")
    assert missing.status_code == 404 and "by name" in missing.json()["message"]
    assert me.get("/api/products/barcode/12ab/").status_code == 400


def test_every_hair_record_says_it_is_about_hair(make_user):
    from apps.bookings.models import CheckIn
    from apps.profiles.models import HairLog, HairProfile, HairProfileSnapshot
    from apps.shelf.models import Product, ShelfItem

    for model in (HairProfile, HairProfileSnapshot, HairLog, Product, ShelfItem, CheckIn):
        field = model._meta.get_field("domain")
        assert field.default == "hair" and ("hair", "Hair") in field.choices, model.__name__
    assert HairProfile.objects.create(user=make_user()).domain == "hair"
