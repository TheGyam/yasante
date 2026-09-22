# Yasante backend config package.
# Load the Celery app with Django so @shared_task uses its settings (broker,
# eager mode in development and tests) instead of Celery's defaults.
from .celery import app as celery_app

__all__ = ("celery_app",)
