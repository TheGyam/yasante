from django.contrib.postgres.operations import AddIndexConcurrently
from django.db import migrations, models
from django.db.models.functions import Upper


class Migration(migrations.Migration):
    atomic = False

    dependencies = [("stylists", "0008_time_zones")]

    operations = [
        AddIndexConcurrently(
            model_name="stylistprofile",
            index=models.Index(Upper("handle"), name="stylist_handle_ci_idx"),
        ),
    ]
