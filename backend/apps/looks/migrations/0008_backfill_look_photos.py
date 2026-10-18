from django.db import migrations


def forwards(apps, schema_editor):
    Look = apps.get_model("looks", "Look")
    LookPhoto = apps.get_model("looks", "LookPhoto")
    alias = schema_editor.connection.alias
    batch = []
    for look in Look.objects.using(alias).all().iterator(chunk_size=1000):
        batch.append(LookPhoto(
            look_id=look.pk, position=0, photo_uri=look.photo_uri,
            thumb_uri=look.thumb_uri, feed_uri=look.feed_uri, aspect=look.photo_aspect,
        ))
        if len(batch) == 1000:
            LookPhoto.objects.using(alias).bulk_create(batch, batch_size=1000)
            batch = []
    if batch:
        LookPhoto.objects.using(alias).bulk_create(batch, batch_size=1000)


def backwards(apps, schema_editor):
    apps.get_model("looks", "LookPhoto").objects.using(schema_editor.connection.alias).all().delete()


class Migration(migrations.Migration):
    dependencies = [("looks", "0007_lookphoto")]
    operations = [migrations.RunPython(forwards, backwards)]
