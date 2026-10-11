"""Reservation policy is identical at lookup, write and staff boundaries."""

import pytest
from django.core.exceptions import ValidationError
from django.forms import modelform_factory

from apps.accounts.admin import UserForm
from apps.accounts.models import User
from apps.common.identifiers import POLICY, UNAVAILABLE, identifier_problem, is_reserved, normalise
from apps.stylists.models import StylistProfile


@pytest.mark.parametrize("value", [
    "ADMIN", "@Admin", "a.d.m.i.n", "admin123", "adm1n", "admln", "officia1", "adrnin", "support_team",
    "official.support", "support.london", "r00t", "postmaster", "billing", "mailer_daemon",
    "no.reply", "trust_and_safety", "yasante", "yasantebeauty", "yasante_support",
    "the.yasante.team", "y4s4nte", "y.a.s.a.n.t.e", "kalon", "webmaster", "autodiscover",
    "llms.txt", "links", "payment_methods", "delete.account", "undefined", "deleted_user",
])
def test_reserved_variants(value):
    assert is_reserved(value)
    assert identifier_problem(normalise(value), max_length=30) == UNAVAILABLE


@pytest.mark.parametrize("value", [
    "yasmin", "beautybyama", "rootedbeauty", "supportivecurls", "admina", "officiallybraids",
    "ama.braids", "ama_braids", "braids123", "a" * 24,
])
def test_does_not_block_ordinary_names(value):
    assert identifier_problem(value, max_length=24) is None


@pytest.mark.parametrize("value", [
    "a", "ab", "a" * 31, "two..dots", "two__underscores", "mixed._dots", ".start", "end_",
    "space inside", "аdmin", "ａｄｍｉｎ", "ad\u200bmin", "ad\u202emin", "Kate", "a\nb",
    "@@ama", "<script>", "../admin", "ama%2ebraid", "braids/ama", "💇🏾",
])
def test_syntax_rejects_ambiguous_or_unsafe_input(value):
    assert identifier_problem(normalise(value), max_length=30)


def test_lengths_and_normalisation():
    assert normalise(" @Ama.Braids ") == "ama.braids"
    assert identifier_problem("a" * 30, max_length=30) is None
    assert identifier_problem("a" * 25, max_length=24)


def test_all_configured_names_are_reserved():
    for name in POLICY["routes"] + POLICY["reserved"]:
        assert is_reserved(name)


@pytest.mark.django_db
def test_legacy_audit_is_read_only(make_user):
    from io import StringIO
    from django.core.management import call_command

    user = make_user()
    User.objects.filter(pk=user.pk).update(username="support")
    output = StringIO()
    call_command("audit_reserved_names", stdout=output)
    assert "'support'" in output.getvalue()
    assert "1 name(s) need review" in output.getvalue()
    assert user.email not in output.getvalue()
    user.refresh_from_db()
    assert user.username == "support"


def test_static_website_routes_are_reserved():
    from apps.web.urls import urlpatterns

    for pattern in urlpatterns:
        route = getattr(pattern.pattern, "_route", "")
        root = route.split("/")[0]
        if root and "<" not in root and len(root) <= 30:
            assert is_reserved(root), f"Reserve the new site route: {root}"


@pytest.mark.django_db
@pytest.mark.parametrize("value", ["a.d.m.i.n", "yasante_support", "adm1n", "billing", "two..dots", "аdmin"])
def test_lookup_and_all_public_writes_reject_the_same_names(value, api, make_user, make_stylist):
    user = make_user()
    stylist = make_stylist()
    assert api(user).get("/api/users/username-check/", username=value).json()["available"] is False
    assert api().get("/api/stylists/handle-available/", handle=value).json() == {
        "handle": normalise(value), "available": False, "suggestions": [],
    }
    assert api(user).patch(f"/api/users/{user.pk}/", {"username": value}).status_code == 400
    assert api(user).post("/api/stylists/", {
        "displayName": "Braids", "handle": value, "serviceModels": ["home"], "baseArea": "Peckham",
    }).status_code == 400
    original = stylist.handle
    assert api(stylist.account).patch("/api/stylists/me/", {"handle": value}).status_code == 400
    stylist.refresh_from_db()
    assert stylist.handle == original
    user.refresh_from_db()
    assert user.username is None


@pytest.mark.django_db
def test_normal_model_writes_cannot_bypass_reservations(make_user, make_stylist):
    with pytest.raises(ValidationError):
        make_user(username="yasante_support")
    user = make_user()
    user.username = "admin123"
    with pytest.raises(ValidationError):
        user.save(update_fields=["username"])
    stylist = make_stylist()
    stylist.handle = "official.support"
    with pytest.raises(ValidationError):
        stylist.save(update_fields=["handle"])
    user.username = "@Ama.Braids"
    user.save(update_fields=["username"])
    user.refresh_from_db()
    assert user.username == "ama.braids"


@pytest.mark.django_db
def test_admin_forms_apply_the_policy(make_user, make_stylist):
    user = make_user()
    # UserForm's model clean is also used by the React staff workspace.
    form = UserForm(data={"email": user.email, "name": user.name, "username": "a.d.m.i.n"}, instance=user)
    assert not form.is_valid() and "username" in form.errors
    form_type = modelform_factory(StylistProfile, fields=["handle"])
    form = form_type(data={"handle": "yasante_support"}, instance=make_stylist())
    assert not form.is_valid() and "handle" in form.errors


@pytest.mark.django_db
def test_existing_names_are_not_silently_renamed_or_locked_out(api, make_user, make_stylist):
    user = make_user()
    stylist = make_stylist()
    # Deliberately simulate rows predating this policy; bulk SQL is an explicit bypass.
    User.objects.filter(pk=user.pk).update(username="support")
    StylistProfile.objects.filter(pk=stylist.pk).update(handle="admin")
    user.refresh_from_db()
    stylist.refresh_from_db()
    assert api(user).patch(f"/api/users/{user.pk}/", {"username": "support", "name": "New name"}).status_code == 200
    assert api(stylist.account).patch("/api/stylists/me/", {"handle": "admin", "bio": "Updated"}).status_code == 200
    assert api(stylist.account).get("/api/stylists/handle-available/", handle="admin").json()["available"] is True
    assert api().get("/api/stylists/handle-available/", handle="admin").json()["available"] is False
    assert api(user).patch(f"/api/users/{user.pk}/", {"username": "security"}).status_code == 400


@pytest.mark.django_db
def test_legacy_case_differences_are_still_taken(api, make_user, make_stylist):
    other = make_user()
    User.objects.filter(pk=other.pk).update(username="AmaBraids")
    me = make_user()
    assert api(me).get("/api/users/username-check/", username="amabraids").json()["available"] is False
    assert api().get("/api/stylists/handle-available/", handle="amabraids").json()["available"] is False
    stylist = make_stylist()
    assert api(stylist.account).patch("/api/stylists/me/", {"handle": "amabraids"}).status_code == 409
    StylistProfile.objects.filter(pk=stylist.pk).update(handle="EfuaBraids")
    assert api(me).post("/api/stylists/", {
        "displayName": "Braids", "handle": "efuabraids", "serviceModels": ["home"], "baseArea": "Peckham",
    }).status_code == 409


@pytest.mark.django_db
def test_suggestions_are_valid_and_within_the_handle_limit(api, make_stylist):
    stylist = make_stylist()
    result = api().get("/api/stylists/handle-available/", handle=stylist.handle).json()
    assert result["suggestions"]
    for suggestion in result["suggestions"]:
        assert identifier_problem(suggestion, max_length=POLICY["handle_max"]) is None
        assert api().get("/api/stylists/handle-available/", handle=suggestion).json()["available"] is True


@pytest.mark.parametrize("value", [
    # Companies and brands, as they are and as someone posing as them would write them.
    "instagram_braids", "realtiktokhair", "g00gle", "paypa1", "apple", "apple_support",
    "officialdove", "apple1", "amazon.uk", "metaofficial", "x_official", "onlyfans.ama",
    # The platform, misspelled.
    "yassante", "yasantee", "the.yasante.hq",
    # Abuse, with separators and lookalikes.
    "f.u.c.k", "sh1t", "sex.braids", "n1gga", "porn.star", "hitler88", "ama.cunt",
    # Pages a social app has or will have.
    "inbox", "reels", "trending", "nhs",
])
def test_brands_companies_and_abuse_are_reserved(value):
    assert is_reserved(value)


@pytest.mark.parametrize("value", [
    # Ordinary names that contain a brand, a company or a rude word.
    "scunthorpe.hair", "essexbraids", "sussex.curls", "peacockhair", "therapist.ama",
    "analysa", "grapevinebraids", "applepiebraids", "amazonianbeauty", "metallicbraids",
    "visagebeauty", "nikeshabraids", "freshairbraids", "openairbeauty", "revolutionhair",
    "philanthropic", "kikelomo", "isis.braids", "nazir", "dickensbraids", "cumbriacurls",
    "sirius", "elle.braids", "bootsandbraids",
])
def test_ordinary_names_with_brands_or_rude_words_inside_are_fine(value):
    assert not is_reserved(value)


@pytest.mark.django_db
def test_a_name_given_up_is_held_for_its_owner(api, make_user, make_stylist, settings):
    from django.utils import timezone

    from apps.accounts.models import ReleasedName

    ama, someone = make_user(), make_user()
    assert api(ama).patch(f"/api/users/{ama.pk}/", {"username": "amabraids"}).status_code == 200
    assert api(ama).patch(f"/api/users/{ama.pk}/", {"username": "ama.new"}).status_code == 200
    # Nobody else can take the old one straight away, by any route.
    assert api(someone).get("/api/users/username-check/", username="amabraids").json()["available"] is False
    assert api(someone).patch(f"/api/users/{someone.pk}/", {"username": "amabraids"}).status_code == 400
    assert api().get("/api/stylists/handle-available/", handle="amabraids").json()["available"] is False
    # Its owner can have it back.
    assert api(ama).patch(f"/api/users/{ama.pk}/", {"username": "amabraids"}).status_code == 200

    # A handle given up, and a deleted account's names, are held the same way.
    stylist = make_stylist()
    old = stylist.handle
    assert api(stylist.account).patch("/api/stylists/me/", {"handle": "efua.braids"}).status_code == 200
    assert api(someone).patch(f"/api/users/{someone.pk}/", {"username": old}).status_code == 400
    ama.delete()
    assert api(someone).patch(f"/api/users/{someone.pk}/", {"username": "amabraids"}).status_code == 400

    # Once the hold is over, it's anyone's.
    ReleasedName.objects.update(released_at=timezone.now() - timezone.timedelta(days=settings.NAME_HOLD_DAYS + 1))
    assert api(someone).patch(f"/api/users/{someone.pk}/", {"username": "amabraids"}).status_code == 200
    from apps.common.tasks import enforce_retention

    assert enforce_retention()["name_holds_deleted"] >= 2
