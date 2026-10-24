"""The hair trends report keeps to the research rules."""

from datetime import timedelta

import pytest
from django.utils import timezone

pytestmark = pytest.mark.django_db


def test_trends_show_only_groups_of_twenty_and_hair_only_from_research_volunteers(make_user, make_stylist, styles, consent):
    from apps.bookings.models import Booking
    from apps.common.models import SearchLog
    from apps.looks.models import Look
    from apps.staff.insights import UK, Median
    from apps.staff.trends import hair_trends

    stylist = make_stylist()

    def booked(client, style, n):
        for _ in range(n):
            Booking.objects.create(
                status="completed", client=client, client_name="x", stylist=stylist.account, stylist_profile=stylist,
                stylist_name="x", service_id=stylist.menu_items.first().pk, service_name="x", price=100, currency="GBP",
                area="SE15", policy={}, policy_version="2026-10-20", styles=[style],
            )

    # Twenty different people: the minimum group counts people, not bookings.
    volunteers, declined = [make_user(texture="coily") for _ in range(20)], make_user(texture="coily")
    for volunteer in volunteers:
        consent(volunteer, "research")
        booked(volunteer, "knotless", 1)
    consent(declined, "research", granted=False)
    booked(declined, "knotless", 25)
    booked(declined, "twists", 5)

    now = timezone.now()
    rows, meta = hair_trends(Booking.objects.all(), Look.objects.all(), SearchLog.objects.all(), now - timedelta(days=1), now + timedelta(days=1), UK, Median)
    # Knotless is big enough; twists isn't, and alone it's too small even as "Other".
    assert [row["label"].split(" · ")[:2] for row in rows] == [["Knotless braids", stylist.base_area]]
    assert rows[0]["values"][0] == 45 and rows[0]["values"][3] == 100 and rows[0]["currency"] == "GBP"
    # Her area, never the client's postcode district.
    assert "SE15" not in rows[0]["label"]
    # By hair: only the volunteer's 20, never the 25 from someone who said no.
    assert meta["byHair"] == [{"style": "Knotless braids", "hair": "coily", "bookings": 20}]
