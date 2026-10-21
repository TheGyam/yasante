from django.db import migrations


def seed(apps, schema_editor):
    apps.get_model("features", "Switch").objects.get_or_create(
        key="ranked_feed",
        defaults={"mode": "off", "description": "The ranked feed, and recording what people see and open in it"},
    )


def unseed(apps, schema_editor):
    apps.get_model("features", "Switch").objects.filter(key="ranked_feed").delete()


class Migration(migrations.Migration):
    dependencies = [("feed", "0001_initial"), ("features", "0002_seed_switches")]
    operations = [migrations.RunPython(seed, unseed)]
