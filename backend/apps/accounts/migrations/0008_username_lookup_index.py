from django.contrib.postgres.operations import AddIndexConcurrently
from django.db import migrations, models
from django.db.models.functions import Upper


class Migration(migrations.Migration):
    atomic = False

    dependencies = [("accounts", "0007_admin_labels")]

    operations = [
        AddIndexConcurrently(
            model_name="user",
            index=models.Index(Upper("username"), name="account_username_ci_idx"),
        ),
    ]
