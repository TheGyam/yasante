"""Prices are always in the stylist's country's currency, wherever the viewer is."""

import pytest

from apps.common.countries import COUNTRIES, currency_of, money, money_list, totals

pytestmark = pytest.mark.django_db


def test_every_country_has_a_currency_and_units():
    assert len(COUNTRIES) > 240
    codes = {c["code"] for c in COUNTRIES}
    assert {"GB", "GH", "NG", "US", "CA", "DE", "ES", "AT"} <= codes
    assert all(len(c["currency"]) == 3 and c["units"] in {"km", "mi"} for c in COUNTRIES)
    assert currency_of("GH") == "GHS" and currency_of("NG") == "NGN"
    assert currency_of("DE") == "EUR" and currency_of("XX") == "GBP"


def test_money_is_written_in_its_own_currency():
    assert money(45, "GBP") == "£45"
    assert money(12.5, "GBP") == "£12.50"
    assert money(240000, "NGN") == "₦240,000"
    assert money(120, "GHS") == "GH₵120"
    assert money(1500, "XOF") == "1,500 XOF"
    assert money(None, "GBP") == ""


def test_the_country_list_is_public_and_cached(api):
    response = api().get("/api/countries/")
    assert response.status_code == 200
    ghana = next(c for c in response.json() if c["code"] == "GH")
    assert ghana == {"code": "GH", "name": "Ghana", "currency": "GHS", "units": "km"}
    assert "max-age=86400" in response["Cache-Control"]


def test_a_stylist_prices_in_her_countrys_currency(api, make_stylist):
    profile = make_stylist()
    assert profile.currency == "GBP"
    me = api(profile.account)
    assert me.patch("/api/stylists/me/", {"country": "gh"}).status_code == 200
    profile.refresh_from_db()
    assert profile.country == "GH" and profile.currency == "GHS"
    page = api().get(f"/api/stylists/by-handle/{profile.handle}/").json()
    assert page["profile"]["country"] == "GH" and page["profile"]["currency"] == "GHS"


def test_an_unknown_country_is_refused(api, make_stylist):
    profile = make_stylist()
    response = api(profile.account).patch("/api/stylists/me/", {"country": "ZZ"})
    assert response.status_code == 400
    assert response.json()["message"] == "Pick the country you work in"


def test_looks_and_search_carry_the_stylists_currency(api, make_stylist, make_look, make_user):
    profile = make_stylist(country="NG")
    service = profile.menu_items.get(name="Knotless braids")
    make_look(profile.account, stylist=profile, service_id=str(service.pk), price=service.price)
    look = api().get("/api/looks/").json()["data"][0]
    assert look["currency"] == "NGN"
    found = api(make_user()).get("/api/stylists/", q=profile.handle).json()
    assert found[0]["currency"] == "NGN"


def test_a_booking_keeps_the_currency_it_was_made_in(make_stylist, make_user, book):
    from apps.bookings.models import Booking

    profile = make_stylist(country="GH")
    made = book(make_user(), profile)
    assert made["currency"] == "GHS"
    # Moving country later doesn't change what an existing booking costs.
    profile.country = "NG"
    profile.save(update_fields=["country"])
    assert Booking.objects.get(pk=made["id"]).currency == "GHS"


def test_totals_keep_each_currency_apart():
    amounts = [("USD", 60), ("EUR", 45), ("GHS", 300), ("EUR", None), (None, 5)]
    assert totals(amounts) == [
        {"currency": "EUR", "amount": 45.0},
        {"currency": "GHS", "amount": 300.0},
        {"currency": "USD", "amount": 60.0},
    ]
    assert money_list(totals([("USD", 60), ("USD", 1), ("GHS", 300)])) == "$61 · GH₵300"


def test_staff_money_lists_every_currency_and_charts_one(make_user, make_stylist, book):
    from django.utils import timezone

    from apps.bookings.models import Booking
    from tests.test_staff import staff_client

    client, _ = staff_client(make_user, superuser=True)
    for country, price in (("GB", 80), ("GB", 20), ("GH", 300)):
        made = book(make_user(), make_stylist(country=country))
        Booking.objects.filter(pk=made["id"]).update(status="completed", price=price, scheduled_for=timezone.now())
    data = client.get("/data/insights/money/").json()
    assert data["meta"]["currencies"] == [{"currency": "GBP", "amount": 100.0}, {"currency": "GHS", "amount": 300.0}]
    assert data["meta"]["currency"] == "GBP" and data["meta"]["total"] == 100
    ghana = client.get("/data/insights/money/?currency=GHS").json()
    assert ghana["meta"]["currency"] == "GHS" and ghana["meta"]["total"] == 300
