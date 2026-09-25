"""
The public site at yasante.com: the pages a shared link opens when the app isn't
installed (her page, a look), the waitlist, policies, and the files search engines
and phones ask for. Plain HTML, no JavaScript, so it's fast on any connection.
When the app is installed, the same links open it instead (App Links / Universal Links).
"""

from django.conf import settings
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.utils.text import slugify
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_http_methods

from apps.looks.models import Look, Style
from apps.profiles.models import PolicyDocument
from apps.stylists.models import PageView, StylistProfile

from .models import WaitlistEntry

public = cache_control(public=True, max_age=300)


@require_http_methods(["GET", "POST"])
def home(request):
    joined = False
    error = ""
    if request.method == "POST":
        # Bots fill every field; people never see this one.
        if request.POST.get("website"):
            return render(request, "web/home.html", {"joined": True})
        email = (request.POST.get("email") or "").strip().lower()
        role = request.POST.get("role") if request.POST.get("role") in ("client", "stylist") else "client"
        if "@" not in email or len(email) > 254:
            error = "That email doesn’t look right."
        else:
            # Already on it: same answer, so nobody learns who signed up.
            WaitlistEntry.objects.get_or_create(
                email=email,
                defaults={
                    "role": role,
                    "area": (request.POST.get("area") or "").strip()[:100],
                    "source": (request.GET.get("from") or "")[:100],
                },
            )
            joined = True
    return render(request, "web/home.html", {"joined": joined, "error": error})


def _money(value):
    return f"£{value:.0f}" if value == int(value) else f"£{value:.2f}"


@public
def stylist(request, handle):
    profile = (
        StylistProfile.objects.filter(handle__iexact=handle, published=True)
        .select_related("account")
        .first()
    )
    if profile is None:
        raise Http404
    PageView.objects.create(stylist=profile, source="web")
    photos = list(profile.portfolio_photos.all()[:12])
    services = [
        {
            "name": m.name,
            "price": ("from " if m.from_price else "") + _money(m.price),
            "hours": round((m.duration_minutes or 0) / 60, 1) or None,
        }
        for m in profile.menu_items.all()[:20]
    ]
    return render(
        request,
        "web/stylist.html",
        {
            "p": profile,
            "photos": photos,
            "services": services,
            "image": (photos[0].uri if photos else profile.avatar_uri),
            "app_link": f"yasante://stylist/{profile.handle}",
        },
    )


@public
def look(request, pk):
    item = Look.objects.filter(pk=pk, visibility="public", status="live").select_related("author").first()
    if item is None:
        raise Http404
    return render(
        request,
        "web/look.html",
        {
            "look": item,
            "image": item.feed_uri or item.photo_uri,
            "app_link": f"yasante://looks/{item.pk}",
        },
    )


def _listing(request, title, intro, looks, stylists):
    return render(
        request,
        "web/listing.html",
        {
            "title": title,
            "intro": intro,
            "looks": looks.order_by("-like_count", "-created_at")[:30],
            "stylists": stylists.order_by("-verification_tier", "-rating_count")[:20],
            "image": next((lk.feed_uri or lk.photo_uri for lk in looks[:1]), ""),
        },
    )


LIVE_LOOKS = {"visibility": "public", "status": "live"}


@public
def style(request, slug):
    item = Style.objects.filter(slug=slug).first()
    if item is None:
        raise Http404
    looks = Look.objects.filter(styles=item, **LIVE_LOOKS)
    done_by = list(looks.exclude(stylist_id="").values_list("stylist_id", flat=True).distinct())
    return _listing(
        request,
        f"{item.name} in London",
        f"{item.name} by braiders on Yasante, on real hair.",
        looks,
        StylistProfile.objects.filter(published=True, account_id__in=done_by),
    )


@public
def area(request, slug):
    name = slug.replace("-", " ")
    stylists = StylistProfile.objects.filter(published=True, base_area__iexact=name)
    looks = Look.objects.filter(area__iexact=name, **LIVE_LOOKS)
    if not stylists.exists() and not looks.exists():
        raise Http404
    first = stylists.first()
    label = first.base_area if first else name.title()
    return _listing(request, f"Braiders in {label}", f"Braiders based in {label}, and their work.", looks, stylists)


@public
def open_in_app(request):
    """A link meant for the app, opened on a computer: say where to open it."""
    return render(request, "web/open_in_app.html")


def policy(request, type):
    doc = PolicyDocument.current(type.replace("-", "_"))
    if doc is None:
        raise Http404
    return render(request, "web/policy.html", {"doc": doc})


@cache_control(public=True, max_age=86400)
def robots(request):
    lines = [
        "User-agent: *",
        "Disallow: /api/",
        "Disallow: /admin/",
        f"Sitemap: {request.build_absolute_uri(reverse('web-sitemap'))}",
    ]
    return HttpResponse("\n".join(lines) + "\n", content_type="text/plain")


@cache_control(public=True, max_age=3600)
def sitemap(request):
    base = request.build_absolute_uri("/").rstrip("/")
    urls = [(f"{base}/", None)]
    urls += [
        (f"{base}/{h}", u)
        for h, u in StylistProfile.objects.filter(published=True).values_list("handle", "updated_at")
    ]
    urls += [(f"{base}/styles/{slug}", None) for slug in Style.objects.values_list("slug", flat=True)]
    areas = StylistProfile.objects.filter(published=True).values_list("base_area", flat=True).distinct()
    urls += [(f"{base}/areas/{slugify(a)}", None) for a in areas if a]
    urls += [
        (f"{base}/looks/{pk}", u)
        for pk, u in Look.objects.filter(visibility="public", status="live")
        .order_by("-created_at")
        .values_list("pk", "created_at")[:1000]
    ]
    body = "".join(
        f"<url><loc>{loc}</loc>{f'<lastmod>{mod.date().isoformat()}</lastmod>' if mod else ''}</url>"
        for loc, mod in urls
    )
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>'
    return HttpResponse(xml, content_type="application/xml")


# Paths the app opens itself; everything else on the site stays in the browser.
APP_PATHS = ["/looks/*", "/invite/*", "/waitlist/*", "/book/*", "/*"]
NOT_APP_PATHS = ["/admin/*", "/api/*", "/static/*", "/media/*", "/terms", "/privacy", "/guidelines"]


@cache_control(public=True, max_age=3600)
def assetlinks(request):
    """Android App Links: proves the app may open yasante.com links. Needs the signing cert."""
    fingerprints = [f.strip() for f in settings.ANDROID_CERT_SHA256.split(",") if f.strip()]
    if not fingerprints:
        raise Http404
    return JsonResponse(
        [
            {
                "relation": ["delegate_permission/common.handle_all_urls"],
                "target": {
                    "namespace": "android_app",
                    "package_name": settings.APP_ID,
                    "sha256_cert_fingerprints": fingerprints,
                },
            }
        ],
        safe=False,
    )


@cache_control(public=True, max_age=3600)
def apple_app_site_association(request):
    """iOS Universal Links. Needs the Apple Team ID."""
    if not settings.APPLE_TEAM_ID:
        raise Http404
    components = [{"/": p, "exclude": True} for p in NOT_APP_PATHS] + [{"/": p} for p in APP_PATHS]
    return JsonResponse(
        {
            "applinks": {
                "details": [
                    {"appIDs": [f"{settings.APPLE_TEAM_ID}.{settings.APP_ID}"], "components": components}
                ]
            }
        }
    )
