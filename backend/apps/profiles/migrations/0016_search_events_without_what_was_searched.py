"""Search events recorded before this kept the words typed and the filters' values. Drop them."""

from django.db import migrations

KEEP = {"surface", "filter", "filters", "results"}


def forget(apps, schema_editor):
    AnalyticsEvent = apps.get_model("profiles", "AnalyticsEvent")
    for event in AnalyticsEvent.objects.filter(name="search").iterator():
        kept = {k: v for k, v in event.properties.items() if k in KEEP}
        if kept != event.properties:
            AnalyticsEvent.objects.filter(pk=event.pk).update(properties=kept)


class Migration(migrations.Migration):
    dependencies = [("profiles", "0015_next_style_wishlist")]
    operations = [migrations.RunPython(forget, migrations.RunPython.noop)]
