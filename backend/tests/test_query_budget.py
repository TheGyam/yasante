"""
The busiest screens cost the same number of queries however much is on them. A list
that fetches something per row gets slower with every row, and nobody notices until
the rows are real.
"""

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

pytestmark = pytest.mark.django_db


def queries(client, url):
    with CaptureQueriesContext(connection) as ctx:
        response = client.get(url)
    assert response.status_code == 200, (url, response.content[:200])
    return len(ctx)


def fill(me, make_user, make_look, stylist, n):
    """n looks by different people, each liked, commented on and saved into a collection."""
    from apps.looks.models import LookComment, LookLike

    col = me.post("/api/collections/", {"name": f"Set {n}"}).json()
    for _ in range(n):
        author = make_user()
        look = make_look(author, stylist=stylist, caption="Two weeks in")
        LookLike.objects.create(look=look, user=me.user)
        LookComment.objects.create(look=look, author=make_user(), body="Love it")
        me.post(f"/api/collections/{col['id']}/items/", {"kind": "look", "refId": str(look.pk)})
    return col, look


@pytest.mark.parametrize(
    "url",
    [
        "/api/looks/?limit=20",
        "/api/looks/{look}/",
        "/api/looks/{look}/comments/",
        "/api/collections/",
        "/api/collections/{col}/items/",
        "/api/stylists/by-handle/{handle}/",
        "/api/bookings/",
    ],
)
def test_the_busy_screens_do_not_query_per_row(url, api, make_user, make_look, make_stylist):
    stylist = make_stylist()
    me = api(make_user())
    counts = []
    for n in (3, 12):
        col, look = fill(me, make_user, make_look, stylist, n)
        counts.append(queries(me.client, url.format(look=look.pk, col=col["id"], handle=stylist.handle)))
    assert counts[0] == counts[1], f"{url}: {counts[0]} queries with 3 rows, {counts[1]} with 12"


def test_responses_are_gzipped_for_clients_that_ask(api, make_user, make_look):
    for _ in range(5):
        make_look(make_user(), caption="Two weeks in, still neat")
    response = api(make_user()).client.get("/api/looks/", HTTP_ACCEPT_ENCODING="gzip")
    assert response["Content-Encoding"] == "gzip"
