"""
The public site at yasante.com: the pages a shared link opens when the app isn't
installed (her page, a look), browsing looks, the waitlist, policies, and the files
search engines and phones ask for. The pages are the React app in web/; each view here
sends its HTML with the title, share image and data filled in (see site.py). When the
app is installed, the same links open it instead (App Links / Universal Links).

The query keys in `seeds` are the ones the site's features read with (web/src/features/*/hooks.ts).
"""

from django.conf import settings
from django.http import Http404, HttpResponse, JsonResponse
from django.urls import reverse
from django.utils.text import slugify
from django.views.decorators.cache import cache_control

from apps.looks.models import Look, Style
from apps.looks.serializers import present_looks, with_viewer_flags
from apps.profiles.models import PolicyDocument
from apps.profiles.views import present_policy
from apps.stylists.models import PageView, StylistProfile
from apps.stylists.views import stylist_page

from .site import page

public = cache_control(public=True, max_age=300)

LIVE_LOOKS = {"visibility": "public", "status": "live"}


def _styles():
    return [{"id": s.slug, "name": s.name} for s in Style.objects.order_by("sort_order", "name")]


@public
def home(request):
    return page(request)


@public
def looks(request):
    style = Style.objects.filter(slug=request.GET.get("style") or "").first()
    return page(
        request,
        title=f"{style.name} looks" if style else "Looks",
        description="Real looks on real hair, from braiders near you.",
        seeds=[(["styles"], _styles())],
    )


@public
def stylist(request, handle):
    profile = (
        StylistProfile.objects.filter(handle__iexact=handle, published=True)
        .select_related("account")
        .first()
    )
    if profile is None:
        return page(request, title="No page here", status=404)
    PageView.objects.create(stylist=profile, source="web")
    data = stylist_page(profile)
    photos = list(profile.portfolio_photos.all()[:1])
    return page(
        request,
        title=f"{profile.display_name} (@{profile.handle})",
        description=f"{(profile.bio or 'Braider')[:150]} · {profile.base_area}",
        image=photos[0].uri if photos else (profile.avatar_uri or ""),
        seeds=[(["stylist", profile.handle.lower()], data)],
    )


@public
def look(request, pk):
    item = with_viewer_flags(Look.objects.prefetch_related("styles", "products"), None).filter(
        pk=pk, **LIVE_LOOKS
    ).first()
    if item is None:
        return page(request, title="Look not found", status=404)
    data = present_looks([item], None)[0]
    what = item.service_name or "A look"
    title = f"{what} by {data['stylist']['name']}" if data.get("stylist") else what
    return page(
        request,
        title=title,
        description=(item.caption or f"{title}, on Yasante.")[:150],
        image=item.feed_uri or item.photo_uri,
        seeds=[(["look", str(item.pk)], data), (["styles"], _styles())],
    )


@public
def style(request, slug):
    item = Style.objects.filter(slug=slug).first()
    if item is None:
        return page(request, title="Not found", status=404)
    first = Look.objects.filter(styles=item, **LIVE_LOOKS).order_by("-like_count").first()
    return page(
        request,
        title=f"{item.name} in London",
        description=f"{item.name} by braiders on Yasante, on real hair.",
        image=(first.feed_uri or first.photo_uri) if first else "",
        seeds=[(["styles"], _styles())],
    )


@public
def area(request, slug):
    name = slug.replace("-", " ")
    stylists = StylistProfile.objects.filter(published=True, base_area__iexact=name)
    area_looks = Look.objects.filter(area__iexact=name, **LIVE_LOOKS)
    if not stylists.exists() and not area_looks.exists():
        return page(request, title="Not found", status=404)
    first = stylists.first()
    label = first.base_area if first else name.title()
    photo = area_looks.order_by("-like_count").first()
    return page(
        request,
        title=f"Braiders in {label}",
        description=f"Braiders based in {label}, and their work.",
        image=(photo.feed_uri or photo.photo_uri) if photo else "",
    )


@public
def open_in_app(request):
    """A link meant for the app, opened on a computer: the page says where to open it."""
    return page(request, title="Open on your phone")


@public
def signup(request):
    """A stylist's account, on the web."""
    return page(
        request,
        title="Set up your stylist account",
        description="Your page, menu and bookings in one place. Free for founding stylists.",
    )


def account_page(title):
    """A page for someone signing in or signed in: the React app handles it, search skips it."""

    def view(request, **_ids):
        # The id in the address (a request, a service) is the React app's to read.
        return page(request, title=title, noindex=True)

    return view


sign_in = account_page("Sign in")
# A stylist's studio: the app's own screens, on the web until the app is in the stores.
studio_today = account_page("Today")
studio_requests = account_page("Requests")
studio_request = account_page("Request")
studio_portfolio = account_page("Your work")
studio_post = account_page("Post your work")
studio_menu = account_page("Your menu")
studio_service = account_page("A service")
studio_hours = account_page("Working hours")
studio_payments = account_page("Getting paid")
studio_account = account_page("Account")
verify_email = account_page("Check your email")
stylist_setup = account_page("Set up your page")


def policy(request, type):
    doc = PolicyDocument.current(type.replace("-", "_"))
    if doc is None:
        return page(request, title="Not published yet", status=404)
    return page(
        request,
        title=doc.title,
        seeds=[(["policy", doc.type], present_policy(doc))],
    )


def not_found(request, exception=None):
    """Any other address: the site's own not-found page, except under the API and admin."""
    if request.path.startswith(("/api/", "/admin/", "/static/", "/media/")):
        return HttpResponse("Not found", status=404, content_type="text/plain")
    return page(request, title="Not found", status=404)


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
    urls = [(f"{base}/", None), (f"{base}/looks", None)]
    urls += [
        (f"{base}/{h}", u)
        for h, u in StylistProfile.objects.filter(published=True).values_list("handle", "updated_at")
    ]
    urls += [(f"{base}/styles/{slug}", None) for slug in Style.objects.values_list("slug", flat=True)]
    areas = StylistProfile.objects.filter(published=True).values_list("base_area", flat=True).distinct()
    urls += [(f"{base}/areas/{slugify(a)}", None) for a in areas if a]
    urls += [
        (f"{base}/looks/{pk}", u)
        for pk, u in Look.objects.filter(**LIVE_LOOKS)
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
