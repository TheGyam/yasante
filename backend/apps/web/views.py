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

from . import seo
from .site import page

public = cache_control(public=True, max_age=300)

LIVE_LOOKS = {"visibility": "public", "status": "live"}


def _styles():
    return [{"id": s.slug, "name": s.name} for s in Style.objects.order_by("sort_order", "name")]


@public
def home(request):
    content, jsonld = seo.home()
    return page(request, content_template="web/content/home.html", content=content, jsonld=jsonld)


@public
def looks(request):
    style = Style.objects.filter(slug=request.GET.get("style") or "").first()
    content, jsonld = seo.looks_index(style)
    return page(
        request,
        title=f"{style.name} looks" if style else "Looks",
        description="Real looks on real hair, from braiders near you.",
        seeds=[(["styles"], _styles())],
        content_template="web/content/looks.html",
        content=content,
        jsonld=jsonld,
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
    content, jsonld = seo.stylist(profile)
    return page(
        request,
        title=f"{profile.display_name} (@{profile.handle}) — braider in {profile.base_area}",
        description=f"{(profile.bio or 'Braider')[:150]} · {profile.base_area}",
        image=photos[0].uri if photos else (profile.avatar_uri or ""),
        seeds=[(["stylist", profile.handle.lower()], data)],
        content_template="web/content/stylist.html",
        content=content,
        jsonld=jsonld,
        og_type="profile",
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
    content, jsonld = seo.look(item, data)
    return page(
        request,
        title=title,
        description=(item.caption or f"{title}, on Yasante.")[:150],
        image=item.feed_uri or item.photo_uri,
        seeds=[(["look", str(item.pk)], data), (["styles"], _styles())],
        content_template="web/content/look.html",
        content=content,
        jsonld=jsonld,
        og_type="article",
    )


@public
def style(request, slug):
    item = Style.objects.filter(slug=slug).first()
    if item is None:
        return page(request, title="Not found", status=404)
    first = Look.objects.filter(styles=item, **LIVE_LOOKS).order_by("-like_count").first()
    content, jsonld = seo.style(item)
    return page(
        request,
        title=f"{item.name} in London",
        description=f"{item.name} by braiders on Yasante, on real hair.",
        image=(first.feed_uri or first.photo_uri) if first else "",
        seeds=[(["styles"], _styles())],
        content_template="web/content/style.html",
        content=content,
        jsonld=jsonld,
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
    content, jsonld = seo.area(label, list(stylists), list(area_looks.order_by("-like_count")))
    return page(
        request,
        title=f"Braiders in {label}",
        description=f"Braiders based in {label}, and their work.",
        image=(photo.feed_uri or photo.photo_uri) if photo else "",
        content_template="web/content/area.html",
        content=content,
        jsonld=jsonld,
    )




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
forgot_password = account_page("Forgot your password?")
# The link in the reset email: the website's form wherever the app doesn't open it.
reset_password = account_page("Choose a new password")
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
# A client's booking: asking for one, her list, and one of them.
book = account_page("Request a booking")
bookings = account_page("Your bookings")
booking = account_page("Your booking")


def policy(request, type):
    doc = PolicyDocument.current(type.replace("-", "_"))
    if doc is None:
        return page(request, title="Not published yet", status=404)
    content, jsonld = seo.policy(doc)
    return page(
        request,
        title=doc.title,
        seeds=[(["policy", doc.type], present_policy(doc))],
        content_template="web/content/policy.html",
        content=content,
        jsonld=jsonld,
    )


def delete_account(request):
    """How to delete an account without the app: the Play Store links here."""
    return page(request, title="Delete your account", description="How to delete your Yasante account, in the app or by email.")


def not_found(request, exception=None):
    """Any other address: the site's own not-found page, except under the API and admin."""
    if request.path.startswith(("/api/", "/admin/", "/static/", "/media/")):
        return HttpResponse("Not found", status=404, content_type="text/plain")
    return page(request, title="Not found", status=404)


# Crawlers that feed AI assistants' answers and search. All welcome: being findable in
# ChatGPT, Claude, Gemini, Perplexity, DeepSeek and Copilot is the point. Listed by name
# so the welcome is explicit (some sites block them, and some bots look for it).
AI_CRAWLERS = [
    "GPTBot", "OAI-SearchBot", "ChatGPT-User",
    "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai",
    "Google-Extended", "GoogleOther",
    "PerplexityBot", "Perplexity-User",
    "Applebot", "Applebot-Extended",
    "Bingbot", "CCBot", "DeepSeekBot", "meta-externalagent", "Amazonbot", "DuckAssistBot",
    "cohere-ai", "MistralAI-User", "YouBot",
]
# Pages for someone signing in or signed in: nothing there for search.
PRIVATE = [
    "/api/", "/admin/", "/auth/", "/stylist-setup", "/today", "/requests", "/portfolio",
    "/menu", "/availability", "/payment-methods", "/account", "/looks/new", "/book/", "/bookings",
]


@cache_control(public=True, max_age=86400)
def robots(request):
    rules = [f"Disallow: {p}" for p in PRIVATE] + ["Allow: /"]
    lines = ["User-agent: *", *rules, ""]
    for bot in AI_CRAWLERS:
        lines += [f"User-agent: {bot}", *rules, ""]
    lines += [f"Sitemap: {request.build_absolute_uri(reverse('web-sitemap'))}"]
    return HttpResponse("\n".join(lines) + "\n", content_type="text/plain")


@cache_control(public=True, max_age=86400)
def favicon(request):
    """Browsers ask every host for /favicon.ico by themselves: the app icon, from the site build."""
    from pathlib import Path

    icon = Path(settings.BASE_DIR) / "apps/web/static/site/favicon.ico"
    if not icon.exists():
        raise Http404
    return HttpResponse(icon.read_bytes(), content_type="image/x-icon")


@cache_control(public=True, max_age=3600)
def sitemap(request):
    """Every public page, with stylists' and looks' photos for Google Images."""
    from xml.sax.saxutils import escape

    base = "https://yasante.com"
    entries = [(f"{base}/", None, []), (f"{base}/looks", None, [])]
    for profile in StylistProfile.objects.filter(published=True).prefetch_related("portfolio_photos"):
        photos = [p.uri for p in list(profile.portfolio_photos.all())[:20]]
        entries.append((f"{base}/{profile.handle}", profile.updated_at, photos))
    entries += [(f"{base}/styles/{slug}", None, []) for slug in Style.objects.values_list("slug", flat=True)]
    areas = StylistProfile.objects.filter(published=True).values_list("base_area", flat=True).distinct()
    entries += [(f"{base}/areas/{slugify(a)}", None, []) for a in areas if a]
    entries += [
        (f"{base}/looks/{pk}", made, [photo])
        for pk, made, photo in Look.objects.filter(**LIVE_LOOKS)
        .order_by("-created_at")
        .values_list("pk", "created_at", "photo_uri")[:5000]
    ]
    entries += [(f"{base}/{t}", None, []) for t in ("terms", "privacy", "guidelines", "stylist-terms")]

    def entry(loc, mod, images):
        imgs = "".join(f"<image:image><image:loc>{escape(i)}</image:loc></image:image>" for i in images if i)
        last = f"<lastmod>{mod.date().isoformat()}</lastmod>" if mod else ""
        return f"<url><loc>{escape(loc)}</loc>{last}{imgs}</url>"

    body = "".join(entry(*e) for e in entries)
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
        f"{body}</urlset>"
    )
    return HttpResponse(xml, content_type="application/xml")


def indexnow_key(request):
    """/<key>.txt: proves to IndexNow that pings for yasante.com come from yasante.com."""
    return HttpResponse(settings.INDEXNOW_KEY, content_type="text/plain")


def _llms_sections():
    stylists = list(StylistProfile.objects.filter(published=True).order_by("display_name"))
    styles = list(Style.objects.order_by("sort_order", "name"))
    areas = sorted({s.base_area for s in stylists if s.base_area})
    return stylists, styles, areas


@cache_control(public=True, max_age=3600)
def llms_txt(request):
    """
    /llms.txt (llmstxt.org): what Yasante is and where things are, in plain Markdown for
    AI assistants. The short version; /llms-full.txt has every stylist's details.
    """
    stylists, styles, areas = _llms_sections()
    lines = [
        "# Yasante",
        "",
        f"> {seo.TAGLINE}",
        "",
        seo.ABOUT,
        "",
        "Key facts:",
        "- Where: London, UK. Prices are in pounds (GBP).",
        "- For clients: browse real hairstyles, see the braider who did each one, book them, and keep "
        "care plans, collections and a product shelf.",
        "- For stylists: a free page with work, prices, hours and policies; requests to accept, "
        "move or decline; deposits paid directly to the stylist.",
        "- Booking: a client asks for a time; the stylist has 48 hours to reply. Yasante never takes payments.",
        "- Apps: Android and iPhone. The website shows every stylist's page and their work.",
        "",
        "## Main pages",
        "",
        "- [Home](https://yasante.com/): what Yasante is, popular styles and braiders",
        "- [Looks](https://yasante.com/looks): real looks on real hair, newest first",
        "- [Set up a stylist page](https://yasante.com/auth/signup?role=stylist): free for founding stylists",
        "- [Full details for AI assistants](https://yasante.com/llms-full.txt): every stylist's menu, prices and area",
        "",
        "## Styles",
        "",
        *[f"- [{s.name}](https://yasante.com/styles/{s.slug})" for s in styles],
        "",
        "## Areas",
        "",
        *[f"- [Braiders in {a}](https://yasante.com/areas/{slugify(a)})" for a in areas],
        "",
        "## Stylists",
        "",
        *[
            f"- [{s.display_name}](https://yasante.com/{s.handle}): {s.base_area}"
            + (f". {s.bio[:120]}" if s.bio else "")
            for s in stylists
        ],
        "",
        "## Policies",
        "",
        "- [Terms of use](https://yasante.com/terms)",
        "- [Privacy policy](https://yasante.com/privacy)",
        "- [Stylist terms](https://yasante.com/stylist-terms)",
        "- [Community guidelines](https://yasante.com/guidelines)",
        "",
        "Contact: admin@yasante.com",
        "",
    ]
    return HttpResponse("\n".join(lines), content_type="text/markdown; charset=utf-8")


@cache_control(public=True, max_age=3600)
def llms_full_txt(request):
    """/llms-full.txt: the same, with each stylist's menu, prices, hours and rating."""
    stylists, styles, _areas = _llms_sections()
    out = [
        "# Yasante — full details",
        "",
        seo.ABOUT,
        "",
        "All prices in GBP. 'from' means the price depends on length, size or options.",
        "",
    ]
    for profile in stylists:
        content, _ = seo.stylist(profile)
        out += [
            f"## {profile.display_name} (@{profile.handle})",
            "",
            f"Page: https://yasante.com/{profile.handle}",
            f"Area: {profile.base_area}, London",
        ]
        if content["bio"]:
            out += [f"About: {content['bio']}"]
        if content["rating"]:
            out += [f"Rating: {content['rating']['average']:.1f}/5 from {content['rating']['count']} reviews"]
        if content["hours"]:
            out += ["Hours: " + "; ".join(f"{h['day']} {h['opens']}–{h['closes']}" for h in content["hours"])]
        if content["menu"]:
            out += ["Menu:"] + [
                f"- {m['name']}: {m['price']}" + (f" ({m['duration']})" if m["duration"] else "")
                for m in content["menu"]
            ]
        out += [f"Booking: ask for a date on the page; {content['notice_hours']} hours' notice to cancel.", ""]
    out += ["## Styles", "", *[f"- {s.name}: https://yasante.com/styles/{s.slug}" for s in styles], ""]
    return HttpResponse("\n".join(out), content_type="text/markdown; charset=utf-8")


# Paths the app opens itself; everything else on the site stays in the browser.
APP_PATHS = ["/looks/*", "/invite/*", "/waitlist/*", "/book/*", "/*"]
NOT_APP_PATHS = ["/admin/*", "/api/*", "/static/*", "/media/*", "/terms", "/privacy", "/guidelines", "/delete-account"]


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
