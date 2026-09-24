from django.apps import AppConfig


class BookingsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.bookings"
    verbose_name = "Bookings"

    def ready(self):
        from . import audit, notify  # noqa: F401  (booking changes are logged and announced)
