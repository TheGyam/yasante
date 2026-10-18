from django.db import migrations


def seed(apps, schema_editor):
    Switch = apps.get_model("features", "Switch")
    Switch.objects.create(
        key="multi_photo_looks", mode="staff", description="Post up to 5 photos in one look"
    )
    Switch.objects.create(key="video_posts", mode="off", description="Post videos")


def unseed(apps, schema_editor):
    apps.get_model("features", "Switch").objects.filter(
        key__in=["multi_photo_looks", "video_posts"]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("features", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
