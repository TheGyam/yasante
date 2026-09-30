from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.common"
    verbose_name = "Common"

    def ready(self):
        from . import signals  # noqa: F401  (media files follow their owners)
        import logging
        from .error_reporting import ErrorHandler
        logger = logging.getLogger("django.request")
        if not any(isinstance(handler, ErrorHandler) for handler in logger.handlers):
            logger.addHandler(ErrorHandler(level=logging.ERROR))
