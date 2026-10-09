"""Test settings — fast and isolated: local cache, tasks run inline, no rate limits."""

from .development import *  # noqa: F401, F403

INSTALLED_APPS = [a for a in INSTALLED_APPS if a != "debug_toolbar"]  # noqa: F405
MIDDLEWARE = [m for m in MIDDLEWARE if "debug_toolbar" not in m]  # noqa: F405
CSP_REPORT_ONLY = False  # no toolbar here: enforce it, as production does

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
CELERY_TASK_ALWAYS_EAGER = True
REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_THROTTLE_CLASSES": []}  # noqa: F405
LOGGING = {"version": 1, "disable_existing_loggers": True}
MEDIA_ROOT = BASE_DIR / "test-media"  # noqa: F405
