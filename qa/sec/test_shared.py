"""
Shared links (/api/shared/...): what a stranger with the code gets.

Upstream's tests/test_sharing.py covers the rules (random codes, stopping kills the link,
blocks, private looks, signed-out tagging along). These pin the exact fields a signed-out
visitor may receive (null ones are left out), so a field added later can't carry the author's email, phone, notes or
history out through a link, and check that a closed account takes its links with it.
"""

import pytest
from rest_framework.test import APIClient

AUTHOR = {"id", "name", "username", "avatarUri"}
COLLECTION = {"code", "name", "author", "itemCount", "updatedAt", "previewUris", "items", "ownId", "followingId"}
ITEM = {"id", "kind", "refId", "imageUri", "title", "addedAt"}
PLAN = {"code", "name", "author", "frequency", "specificDays", "timeOfDay", "steps", "updatedAt", "ownId", "followingId"}


@pytest.fixture
def shared(make_user, make_look):
    from django.utils import timezone

    from apps.planner.models import CarePlan, CarePlanSession, Collection, CollectionItem

    efua = make_user(name="Efua Owner", username="efua")
    look = make_look(efua)
    collection = Collection.objects.create(user=efua, name="Winter braids")
    CollectionItem.objects.create(collection=collection, kind="look", ref_id=str(look.pk), photo_uri=look.photo_uri)
    collection.share()
    plan = CarePlan.objects.create(user=efua, name="Wash day")
    plan.steps.create(text="Pre-poo")
    CarePlanSession.objects.create(plan=plan, user=efua, completed_at=timezone.now(), notes="PRIVATE-NOTE scalp sore")
    plan.share()
    return {"efua": efua, "collection": collection, "plan": plan}


def test_a_stranger_gets_only_the_shared_fields(shared):
    efua = shared["efua"]
    c = APIClient().get(f"/api/shared/collections/{shared['collection'].share_code}/")
    p = APIClient().get(f"/api/shared/care-plans/{shared['plan'].share_code}/")
    assert c.status_code == 200 and p.status_code == 200
    c, p = c.json(), p.json()
    assert {"code", "name", "items"} <= set(c) <= COLLECTION and set(c["author"]) <= AUTHOR
    assert c["items"] and all(set(i) <= ITEM for i in c["items"])
    assert {"code", "name", "steps"} <= set(p) <= PLAN and set(p["author"]) <= AUTHOR
    assert p["steps"] and all(set(s) <= {"id", "text"} for s in p["steps"])
    for body in (str(c), str(p)):
        assert efua.email not in body and efua.phone not in body
        assert "PRIVATE-NOTE" not in body


def test_a_closed_account_takes_its_links_with_it(shared):
    type(shared["efua"]).objects.filter(pk=shared["efua"].pk).update(is_active=False)
    for kind, row in (("collections", shared["collection"]), ("care-plans", shared["plan"])):
        assert APIClient().get(f"/api/shared/{kind}/{row.share_code}/").status_code == 404
