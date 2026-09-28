"""Stylists placed by area name before London was preferred are placed again, on their next search."""

from django.db import migrations


def clear(apps, schema_editor):
    apps.get_model("stylists", "StylistProfile").objects.update(latitude=None, longitude=None)


class Migration(migrations.Migration):
    dependencies = [("stylists", "0006_where_on_the_map")]
    operations = [migrations.RunPython(clear, migrations.RunPython.noop)]
