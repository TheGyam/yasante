"""
Existing data, once: menus and bookings get style tags, and each booking gets a
starting audit entry. Backfilled entries say so in their data, so they're never
mistaken for history that was recorded as it happened.
"""

from django.db import migrations


def backfill(apps, schema_editor):
    from apps.stylists.pricing import guess_styles

    Style = apps.get_model("looks", "Style")
    MenuItem = apps.get_model("stylists", "MenuItem")
    Booking = apps.get_model("bookings", "Booking")
    BookingEvent = apps.get_model("bookings", "BookingEvent")
    styles = list(Style.objects.values_list("slug", "name"))

    for item in MenuItem.objects.filter(styles=[]):
        item.styles = guess_styles(item.name, styles)
        item.save(update_fields=["styles"])

    menu = dict(MenuItem.objects.values_list("id", "styles"))
    events = []
    for booking in Booking.objects.all():
        if not booking.styles:
            booking.styles = menu.get(booking.service_id) or guess_styles(booking.service_name, styles)
            booking.save(update_fields=["styles"])
        if BookingEvent.objects.filter(booking=booking).exists():
            continue
        events.append(
            BookingEvent(
                booking=booking,
                action="created",
                to_status="requested",
                actor_id=booking.client_id,
                actor_role="client",
                data={"backfilled": True},
                at=booking.created_at,
            )
        )
        if booking.status != "requested":
            events.append(
                BookingEvent(
                    booking=booking,
                    action="status",
                    from_status="requested",
                    to_status=booking.status,
                    actor_role="unknown",
                    data={"backfilled": True, "note": "Only the latest status was known"},
                    at=booking.completed_at or booking.updated_at,
                )
            )
    BookingEvent.objects.bulk_create(events)


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0003_booking_styles_checkin_still_in_bookingevent"),
        ("stylists", "0005_menuitem_styles"),
        ("looks", "0006_report_not_hair"),
    ]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
