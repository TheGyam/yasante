import json
from functools import lru_cache
from pathlib import Path
from django.conf import settings
from django.contrib import admin
from django.contrib.admin.sites import AdminSite
from django.http import HttpResponse
from django.shortcuts import redirect, render
from django.templatetags.static import static
from django.urls import include, path, re_path

from apps.common.client_errors import ClientErrorView

admin.site.site_header = settings.ADMIN_SITE_HEADER
admin.site.site_title = settings.ADMIN_SITE_TITLE
admin.site.index_title = "Emergency administration"


def admin_permission(request):
    from .views.session import verified
    return AdminSite.has_permission(admin.site, request) and verified(request)


admin.site.has_permission = admin_permission


def read_assets():
    try:
        manifest = json.loads((Path(settings.BASE_DIR) / "apps/web/static/site/.vite/manifest.json").read_text())
        entry = manifest["staff.html"]
        styles = list(entry.get("css", []))
        seen = set()
        def shared(key):
            if key in seen:
                return
            seen.add(key)
            item = manifest[key]
            styles.extend(item.get("css", []))
            for child in item.get("imports", []):
                shared(child)
        for key in entry.get("imports", []):
            shared(key)
        return {"script": static(f"site/{entry['file']}"), "styles": [static(f"site/{css}") for css in dict.fromkeys(styles)]}
    except (OSError, ValueError, KeyError):
        return None


cached_assets = lru_cache(maxsize=1)(read_assets)


def shell(request, **kwargs):
    return render(request, "staff/index.html", {"assets": read_assets() if settings.DEBUG else cached_assets()})


urlpatterns = [
    path("robots.txt", lambda request: HttpResponse("User-agent: *\nDisallow: /", content_type="text/plain")),
    # The staff app reports its own errors here: its CSP only allows its own origin.
    path("data/client-errors/", ClientErrorView.as_view()),
    path("data/", include("apps.staff.urls")),
    # Admin shares workspace 2FA. Break glass via the server shell:
    # manage.py reset_staff_2fa / manage.py changepassword after identity verification.
    path("django-admin/login/", lambda request: redirect("/")),
    path("django-admin/", admin.site.urls),
    re_path(r"^.*$", shell),
]
