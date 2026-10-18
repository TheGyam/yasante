"""
Saving in the staff workspace, the way the live site runs it: outside a test
transaction, so anything that needs one (a locked read before saving) must open its own.
"""

import pytest
from django.contrib import admin
from django.test import override_settings

from .test_staff import staff_client
from .test_staff_forms import body_for

# The live site has no transaction around a request; nor do these tests.
pytestmark = pytest.mark.django_db(transaction=True)


def _save(client, model, pk, change=None):
    path = f"/data/forms/{model._meta.app_label}/{model._meta.model_name}/{pk}/"
    body = body_for(client.get(path).json())
    body.update(change or {})
    return client.post(path, body)


def test_every_kind_of_record_saves(make_user, make_stylist, book):
    from apps.features.models import Switch

    client, _ = staff_client(make_user, True)
    book(make_user(), make_stylist())
    Switch.objects.get_or_create(key="multi-photo")
    failed = []
    with override_settings(ROOT_URLCONF="apps.staff.urls_host"):
        for model in admin.site._registry:
            obj = model._default_manager.first()
            if obj is None:
                continue
            path = f"/data/forms/{model._meta.app_label}/{model._meta.model_name}/{obj.pk}/"
            if not client.get(path).json().get("editable", True):
                continue
            saved = _save(client, model, obj.pk)
            if saved.status_code != 200 or not saved.json().get("saved"):
                failed.append((model._meta.label, saved.status_code))
    assert not failed


def test_making_someone_staff_and_opening_a_feature_to_them(make_user):
    from apps.accounts.models import User
    from apps.features.models import Switch

    client, _ = staff_client(make_user, True)
    person = make_user()
    switch, _ = Switch.objects.get_or_create(key="multi-photo")
    with override_settings(ROOT_URLCONF="apps.staff.urls_host"):
        assert _save(client, User, person.pk, {"is_staff": "on"}).json()["saved"]
        assert _save(client, Switch, switch.pk, {"mode": "listed", "users": [str(person.pk)]}).json()["saved"]
    person.refresh_from_db()
    switch.refresh_from_db()
    assert person.is_staff
    assert switch.mode == "listed" and list(switch.users.all()) == [person]
