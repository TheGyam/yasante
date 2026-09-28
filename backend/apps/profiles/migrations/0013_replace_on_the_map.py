"""Clients placed by area name before London was preferred are placed again when next asked."""

from django.db import migrations


def clear(apps, schema_editor):
    apps.get_model("profiles", "HairProfile").objects.filter(postcode="").update(latitude=None, longitude=None)


class Migration(migrations.Migration):
    dependencies = [("profiles", "0012_where_on_the_map")]
    operations = [migrations.RunPython(clear, migrations.RunPython.noop)]
