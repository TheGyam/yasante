import re
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse

from decouple import Csv, config

"""
Yasante Backend — Base Settings

Shared across all environments.  Every secret is loaded from environment
variables via python-decouple so nothing sensitive is ever committed.
"""


# ──────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/

# ──────────────────────────────────────────────
# Core
# ──────────────────────────────────────────────
SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())
STAFF_HOST = config("STAFF_HOST", default="admin.localhost")
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", default="", cast=Csv())
# The OpenAPI schema and docs pages: on with DEBUG, off in production unless asked for.
SHOW_API_DOCS = config("SHOW_API_DOCS", default=DEBUG, cast=bool)

# ──────────────────────────────────────────────
# Installed apps
# ──────────────────────────────────────────────
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "django_celery_beat",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.staff.apps.StaffConfig",
    "apps.common",
    "apps.accounts",
    "apps.profiles",
    "apps.stylists",
    "apps.bookings",
    "apps.looks",
    "apps.planner",
    "apps.shelf",
    "apps.content",
    "apps.web",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ──────────────────────────────────────────────
# Middleware
# ──────────────────────────────────────────────
MIDDLEWARE = [
    "apps.common.middleware.SecurityHeadersMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "csp.middleware.CSPMiddleware",
    "apps.staff.middleware.StaffHostMiddleware",
    # JSON shrinks to a fraction gzipped: a feed page is ~17KB plain. Bearer tokens
    # travel in headers, not bodies next to reflected input, so BREACH doesn't apply.
    "django.middleware.gzip.GZipMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.common.middleware.RequestIDMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ──────────────────────────────────────────────
# Database — PostgreSQL
# ──────────────────────────────────────────────
_db_url = config(
    "DATABASE_URL", default="postgres://postgres:postgres@localhost:5432/yasante"
)


# Parse DATABASE_URL manually to avoid dj-database-url dependency
def _parse_db_url(url: str) -> dict:
    """Parse a postgres:// URL into Django DATABASES dict."""

    parsed = urlparse(url)
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/"),
        "USER": parsed.username or "postgres",
        "PASSWORD": parsed.password or "postgres",
        "HOST": parsed.hostname or "localhost",
        "PORT": str(parsed.port or 5432),
        "CONN_MAX_AGE": 600,
        "OPTIONS": {
            "connect_timeout": 5,
        },
    }


DATABASES = {"default": _parse_db_url(_db_url)}

# ──────────────────────────────────────────────
# Cache — Redis
# ──────────────────────────────────────────────
REDIS_URL = config("REDIS_URL", default="redis://localhost:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "db": 0,
        },
    }
}

# ──────────────────────────────────────────────
# Auth
# ──────────────────────────────────────────────
AUTH_USER_MODEL = "accounts.User"

# Argon2id — OWASP-recommended, memory-hard, GPU/ASIC resistant
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.ScryptPasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ──────────────────────────────────────────────
# Django REST Framework
# ──────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "apps.common.renderers.CamelCaseJSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "apps.common.parsers.CamelCaseJSONParser",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.CursorPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "login": "5/min",
        "signup": "3/min",
        "phone_code": "2/min",
        "posting": "30/hour",
        "commenting": "60/hour",
        "reviewing": "20/day",
        "booking": "20/day",
        "reporting": "10/hour",
        "waitlist": "10/hour",
        "client_error": "30/hour",
        "default": "100/min",
    },
    "EXCEPTION_HANDLER": "apps.common.exceptions.custom_exception_handler",
    "NON_FIELD_ERRORS_KEY": "message",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # Money goes out as numbers: the app adds option prices to the base.
    "COERCE_DECIMAL_TO_STRING": False,
}

# ──────────────────────────────────────────────
# Spectacular (Swagger/OpenAPI)
# ──────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    "TITLE": "Yasante API",
    "DESCRIPTION": "Backend APIs for Yasante.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    # Readable names where the same field name has different choices in different places.
    "ENUM_NAME_OVERRIDES": {
        "CollectionKindEnum": ["look", "content"],
        "TimingOutcomeEnum": ["early", "on_time", "over"],
        "ServiceModelEnum": ["salon", "home", "mobile"],
        "ReviewStatusEnum": ["pending", "published", "removed"],
        "ShelfStatusEnum": ["using", "finished", "repurchased"],
        "CheckInWeekEnum": [(2, "Week 2"), (4, "Week 4")],
    },
    "POSTPROCESSING_HOOKS": [
        "drf_spectacular.hooks.postprocess_schema_enums",
        "apps.common.schema.camelize_schema",
    ],
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
        "displayOperationId": True,
    },
}

# ──────────────────────────────────────────────
# SimpleJWT
# ──────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=15, cast=int)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7, cast=int)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# ──────────────────────────────────────────────
# CORS
# ──────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:8081,http://localhost:19006",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True

# ──────────────────────────────────────────────
# Security headers
# ──────────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# CSP (django-csp). The staff host sends its own (apps/staff/middleware.py).
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'",)
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
# blob: for the preview of a photo before it's uploaded (the stylist studio).
CSP_IMG_SRC = ("'self'", "data:", "blob:", "https:")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com")
CSP_OBJECT_SRC = ("'none'",)
CSP_BASE_URI = ("'none'",)
CSP_FORM_ACTION = ("'self'",)
CSP_FRAME_ANCESTORS = ("'none'",)
# The API docs (development only) load Swagger and Redoc from a CDN.
CSP_EXCLUDE_URL_PREFIXES = ("/api/docs/",)

# ──────────────────────────────────────────────
# Internationalisation
# ──────────────────────────────────────────────
LANGUAGE_CODE = "en-gb"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ──────────────────────────────────────────────
# Static & Media
# ──────────────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"


def _immutable_static(path, url):
    """Cached for good: files named by their content. Django's hashed names, and the
    website's build (web/), whose Vite names every file under site/assets/ that way."""
    return url.startswith(f"{STATIC_URL}site/assets/") or bool(
        re.match(r"^.+\.[0-9a-f]{12}\..+$", url)
    )


WHITENOISE_IMMUTABLE_FILE_TEST = _immutable_static

MEDIA_URL = "/media/"
# Where uploaded photos are linked from, whichever address the upload came in on.
# Empty (tests, local) means the request's own address.
PUBLIC_BASE_URL = config("PUBLIC_BASE_URL", default="")
MEDIA_ROOT = BASE_DIR / "mediafiles"
# Private photos are handed to nginx (X-Accel-Redirect to its internal /protected/)
# in production; locally Django streams them itself.
PRIVATE_MEDIA_ACCEL = config("PRIVATE_MEDIA_ACCEL", default=False, cast=bool)
# "expo" sends through Expo's push service; anything else only logs (dev, tests).
PUSH_DELIVERY = config("PUSH_DELIVERY", default="log")

_media_backend = config("MEDIA_STORAGE_BACKEND", default="local")
if _media_backend == "s3":
    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID", default="")
    AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY", default="")
    AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME", default="")
    AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="eu-west-2")
    AWS_S3_FILE_OVERWRITE = False
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False

# ──────────────────────────────────────────────
# Celery
# ──────────────────────────────────────────────
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

# ──────────────────────────────────────────────
# Email — console by default, override per environment
# ──────────────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
# A reset link works for an hour (Django's default is three days).
PASSWORD_RESET_TIMEOUT = 60 * 60

# Search. IndexNow's key is public by design (served at /<key>.txt); pings go out only
# where INDEXNOW_ENABLED is on (production). The verification codes come from Google
# Search Console and Bing Webmaster Tools when the site is added there.
INDEXNOW_KEY = config("INDEXNOW_KEY", default="0a27ecf24379b996538b2cd494f109af")
INDEXNOW_ENABLED = config("INDEXNOW_ENABLED", default=False, cast=bool)
GOOGLE_SITE_VERIFICATION = config("GOOGLE_SITE_VERIFICATION", default="")
BING_SITE_VERIFICATION = config("BING_SITE_VERIFICATION", default="")
DEFAULT_FROM_EMAIL = config(
    "DEFAULT_FROM_EMAIL", default="Yasante <noreply@yasante.com>"
)

# ──────────────────────────────────────────────
# SMS — pluggable, console stub by default
# ──────────────────────────────────────────────
TWILIO_ACCOUNT_SID = config("TWILIO_ACCOUNT_SID", default="")
TWILIO_AUTH_TOKEN = config("TWILIO_AUTH_TOKEN", default="")
TWILIO_PHONE_NUMBER = config("TWILIO_PHONE_NUMBER", default="")

# ──────────────────────────────────────────────
# Application defaults
# ──────────────────────────────────────────────
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Stylists set their hours as local wall-clock times ("09:00") in this zone.
STYLIST_TIME_ZONE = "Europe/London"

# A username or handle someone gives up is held this long before anyone else can take it.
NAME_HOLD_DAYS = 14

# Booking timing
BOOKING_REQUEST_LAPSE_HOURS = 48
BOOKING_DEPOSIT_LAPSE_HOURS = 24
BOOKING_AUTO_COMPLETE_HOURS = 24
# What an older app sees when it asks for free times without saying which days.
BOOKING_SLOT_LOOKAHEAD_DAYS = 28
# The most days one call for free times covers: two months side by side.
BOOKING_SLOT_WINDOW_MAX_DAYS = 62
# The notice a stylist needs before an appointment: one of these, or her own number of
# hours up to the most, a day unless she says otherwise.
BOOKING_NOTICE_CHOICES = (3, 12, 24, 48, 72)
BOOKING_NOTICE_DEFAULT_HOURS = 24
BOOKING_NOTICE_MAX_HOURS = 30 * 24
# Requests and deposits lapse this long before the start.
BOOKING_ANSWER_BEFORE_START_HOURS = 2
# How far ahead clients can book her, in days (4, 8 or 12 weeks, or 6 months).
BOOKING_AHEAD_CHOICES = (28, 56, 84, 182)
BOOKING_AHEAD_DEFAULT_DAYS = 84
# A gap she keeps between clients: to tidy up, or to travel to the next one.
BOOKING_GAP_CHOICES = (0, 15, 30, 45, 60)
# Unanswered requests one client can have with one stylist at a time, so nobody can
# hold her diary with asks they won't keep.
BOOKING_OPEN_REQUESTS_PER_STYLIST = 2

# Phone verification
VERIFICATION_CODE_LENGTH = 6
VERIFICATION_CODE_EXPIRY_SECONDS = 600
VERIFICATION_CODE_RESEND_SECONDS = 30
VERIFICATION_CODE_MAX_ATTEMPTS = 5

# Upload limits
MAX_PORTFOLIO_BATCH = 20
MAX_LOOK_STYLES = 3
MAX_LOOK_PRODUCTS = 5
MAX_PAYMENT_METHODS = 5
MAX_COMMENT_LENGTH = 500

# Admin site
ADMIN_SITE_HEADER = "Yasante Admin"
ADMIN_SITE_TITLE = "Yasante Administration"

# The public site's app-link files: the app's id, and what proves it's ours.
APP_ID = "com.yasante.app"
# SHA-256 of the Android signing certificate(s), comma-separated (eas credentials shows it).
ANDROID_CERT_SHA256 = config("ANDROID_CERT_SHA256", default="")
APPLE_TEAM_ID = config("APPLE_TEAM_ID", default="BLJM94S6TR")
# Sign in with Apple and Google: whose tokens we accept. Apple's is the app's bundle id;
# Google's are the OAuth client ids from Google Cloud (web, iOS and Android), comma-separated.
APPLE_SIGN_IN_AUDIENCES = config("APPLE_SIGN_IN_AUDIENCES", default="com.yasante.app", cast=Csv())
# Client ids aren't secrets (they're in every copy of the app), so they live here.
GOOGLE_CLIENT_IDS = config(
    "GOOGLE_CLIENT_IDS",
    default="961915522127-7p2qoh7kl2ftlhbf7c6fol9knteu0go9.apps.googleusercontent.com,"
    "961915522127-unbtbgps806s9l5rm04kbfce9bfob3gv.apps.googleusercontent.com,"
    "961915522127-1vgtg70neub2520v1soisnvrs8pitmmu.apps.googleusercontent.com",
    cast=Csv(),
)
# A Sign in with Apple key (developer.apple.com, Keys), to revoke Apple's link when
# an account is deleted: the .p8 file's contents, its line breaks written as \n.
APPLE_SIGN_IN_KEY_ID = config("APPLE_SIGN_IN_KEY_ID", default="")
APPLE_SIGN_IN_PRIVATE_KEY = config("APPLE_SIGN_IN_PRIVATE_KEY", default="").replace("\\n", "\n")
