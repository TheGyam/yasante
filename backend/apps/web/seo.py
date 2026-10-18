from apps.looks.views import public_looks
"""
What search engines and AI assistants read on yasante.com.

Google runs a page's JavaScript before indexing it; most AI crawlers (GPTBot, ClaudeBot,
PerplexityBot, DeepSeek's) and link previews don't. So every public page's real content
is in its HTML: a plain, semantic version of the page inside #root, which the React app
replaces as it starts (same content, so nothing is hidden from anyone), plus schema.org
structured data (JSON-LD) saying what the page is about in terms machines understand.

Each builder returns (content, jsonld): the context for the page's template in
templates/web/content/, and a list of JSON-LD objects.
"""

from django.conf import settings
from django.utils.text import slugify

from apps.bookings.models import Review
from apps.looks.models import Look, Style
from apps.stylists.models import StylistProfile

SITE = "https://yasante.com"
NAME = "Yasante"
TAGLINE = "Discover styles on real textured hair, get to know your own, keep track of what works, and book stylists by their work."
ABOUT = (
    "Yasante is an app and website for textured hair, based in London. It helps you find a "
    "hairstyle you love from real photos of real hair, book the independent braider or stylist "
    "who did it, and look after your hair between appointments with care plans, collections "
    "and a product shelf. Stylists get a free page with their work, prices, hours and "
    "policies, and a simple way to take bookings. Deposits go straight to the stylist; "
    "Yasante never handles payments."
)
LIVE_LOOKS = {"visibility": "public", "status": "live"}
DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def absolute(path):
    return f"{SITE}{path}"


def money(value, from_price=False):
    amount = f"£{value:,.0f}" if value == int(value) else f"£{value:,.2f}"
    return f"from {amount}" if from_price else amount


def duration(minutes):
    if not minutes:
        return ""
    hours, mins = divmod(minutes, 60)
    return " ".join(p for p in (f"{hours} hr" if hours else "", f"{mins} min" if mins else "") if p)


def organisation():
    return {
        "@type": "Organization",
        "@id": f"{SITE}/#organization",
        "name": NAME,
        "url": SITE,
        "logo": absolute("/static/site/icon-512.png"),
        "description": ABOUT,
        "areaServed": {"@type": "City", "name": "London"},
        "sameAs": [s for s in getattr(settings, "SOCIAL_PROFILES", []) if s],
    }


def website():
    return {
        "@type": "WebSite",
        "@id": f"{SITE}/#website",
        "name": NAME,
        "url": SITE,
        "description": TAGLINE,
        "inLanguage": "en-GB",
        "publisher": {"@id": f"{SITE}/#organization"},
    }


def breadcrumbs(*trail):
    """trail: (name, path) pairs, home first."""
    return {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i, "name": name, "item": absolute(path)}
            for i, (name, path) in enumerate(trail, start=1)
        ],
    }


def graph(*nodes):
    return [{"@context": "https://schema.org", "@graph": [n for n in nodes if n]}]


# ── Pages ──────────────────────────────────────────────────────────────────────


def home():
    stylists = list(
        StylistProfile.objects.filter(published=True, featured=False).order_by("-updated_at")[:12]
    )
    styles = list(Style.objects.order_by("sort_order", "name"))
    areas = sorted({s.base_area for s in StylistProfile.objects.filter(published=True, featured=False) if s.base_area})
    looks = list(public_looks().filter(**LIVE_LOOKS).order_by("-like_count", "-created_at")[:12])
    content = {
        "about": ABOUT,
        "stylists": [
            {"name": s.display_name, "path": f"/{s.handle}", "area": s.base_area, "bio": s.bio[:160]}
            for s in stylists
        ],
        "styles": [{"name": s.name, "path": f"/styles/{s.slug}"} for s in styles],
        "areas": [{"name": a, "path": f"/areas/{slugify(a)}"} for a in areas],
        "looks": [_look_card(lk) for lk in looks],
    }
    return content, graph(organisation(), website())


def stylist(profile):
    menu = list(profile.menu_items.all())
    photos = list(profile.portfolio_photos.all()[:24])
    reviews = list(
        Review.objects.filter(booking__stylist_profile=profile, status="published").order_by("-created_at")[:10]
    )
    week = (profile.availability or {}).get("week") or []
    hours = [
        {"day": DAY_NAMES[i], "opens": d.get("start"), "closes": d.get("end")}
        for i, d in enumerate(week[:7])
        if d and d.get("start") and d.get("end")
    ]
    path = f"/{profile.handle}"
    rating = (
        {"average": float(profile.rating_average), "count": profile.rating_count}
        if profile.rating_count
        else None
    )
    content = {
        "name": profile.display_name,
        "handle": profile.handle,
        "bio": profile.bio,
        "area": profile.base_area,
        "travels": profile.travel_radius_miles if "mobile" in (profile.service_models or []) else None,
        "menu": [
            {"name": m.name, "price": money(m.price, m.from_price), "duration": duration(m.duration_minutes), "note": m.note}
            for m in menu
        ],
        "photos": [
            {"src": p.thumb_uri or p.uri, "alt": f"{p.service.name if p.service_id else 'Hair'} by {profile.display_name}"}
            for p in photos
        ],
        "hours": hours,
        "rating": rating,
        "reviews": [{"rating": r.rating, "body": r.body, "author": r.author_name, "service": r.service_name} for r in reviews],
        "notice_hours": profile.notice_hours,
    }
    business = {
        "@type": "HairSalon",
        "@id": absolute(path) + "#business",
        "name": profile.display_name,
        "url": absolute(path),
        "description": profile.bio or f"Braider in {profile.base_area}, on Yasante.",
        "image": [p["src"] for p in content["photos"][:6]] or ([profile.avatar_uri] if profile.avatar_uri else []),
        # The district only: the full address is shared once an appointment is confirmed.
        "address": {"@type": "PostalAddress", "addressLocality": profile.base_area, "addressRegion": "London", "addressCountry": "GB"},
        "areaServed": profile.base_area,
        "currenciesAccepted": "GBP",
        "openingHoursSpecification": [
            {"@type": "OpeningHoursSpecification", "dayOfWeek": f"https://schema.org/{h['day']}", "opens": h["opens"], "closes": h["closes"]}
            for h in hours
        ],
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Menu",
            "itemListElement": [
                {
                    "@type": "Offer",
                    "itemOffered": {"@type": "Service", "name": m.name, "description": m.note or None},
                    "priceSpecification": {
                        "@type": "PriceSpecification",
                        "priceCurrency": "GBP",
                        ("minPrice" if m.from_price else "price"): float(m.price),
                    },
                }
                for m in menu
            ],
        },
        "isPartOf": {"@id": f"{SITE}/#website"},
    }
    if rating:
        business["aggregateRating"] = {
            "@type": "AggregateRating",
            "ratingValue": round(rating["average"], 1),
            "reviewCount": rating["count"],
            "bestRating": 5,
            "worstRating": 1,
        }
        business["review"] = [
            {
                "@type": "Review",
                "reviewRating": {"@type": "Rating", "ratingValue": r.rating, "bestRating": 5},
                "author": {"@type": "Person", "name": r.author_name or "A client"},
                "reviewBody": r.body,
            }
            for r in reviews
            if r.body
        ]
    return content, graph(
        business,
        breadcrumbs(("Yasante", "/"), (profile.base_area or "London", f"/areas/{slugify(profile.base_area)}"), (profile.display_name, path)),
    )


def look(item, data):
    path = f"/looks/{item.pk}"
    styles = [s.name for s in item.styles.all()]
    stylist_name = (data.get("stylist") or {}).get("name") or item.stylist_name
    stylist_handle = (data.get("stylist") or {}).get("handle") or item.stylist_handle
    what = item.service_name or (styles[0] if styles else "A look")
    content = {
        "title": f"{what} by {stylist_name}" if stylist_name else what,
        "caption": item.caption,
        "image": item.feed_uri or item.photo_uri,
        "alt": item.caption or what,
        "styles": [{"name": s.name, "path": f"/styles/{s.slug}"} for s in item.styles.all()],
        "stylist": {"name": stylist_name, "path": f"/{stylist_handle}"} if stylist_handle else None,
        "area": item.area,
        "price": money(item.price, item.from_price) if item.price else "",
        "posted": item.created_at,
    }
    image = {
        "@type": "ImageObject",
        "@id": absolute(path) + "#image",
        "contentUrl": item.photo_uri,
        "thumbnailUrl": item.thumb_uri or item.feed_uri or item.photo_uri,
        "name": content["title"],
        "description": item.caption or content["title"],
        "uploadDate": item.created_at.isoformat(),
        "keywords": ", ".join(styles),
        "creator": (
            {"@type": "Person", "name": stylist_name, "url": absolute(f"/{stylist_handle}")}
            if stylist_handle
            else {"@type": "Person", "name": item.author.name.split(" ")[0] if item.author_id else "Yasante member"}
        ),
        "creditText": stylist_name or NAME,
        "copyrightNotice": stylist_name or NAME,
        "acquireLicensePage": absolute("/terms"),
        "license": absolute("/terms"),
        "isPartOf": {"@id": f"{SITE}/#website"},
    }
    return content, graph(
        image,
        *[
            {
                **image,
                "@id": absolute(path) + f"#image-{position}",
                "contentUrl": photo["uri"],
                "thumbnailUrl": photo["thumb_uri"] or photo["feed_uri"] or photo["uri"],
            }
            for position, photo in enumerate(data["photos"][1:], start=2)
        ],
        breadcrumbs(("Yasante", "/"), ("Looks", "/looks"), (content["title"], path)),
    )


def style(item):
    looks = list(public_looks().filter(styles=item, **LIVE_LOOKS).order_by("-like_count", "-created_at")[:24])
    handles = {lk.stylist_handle for lk in looks if lk.stylist_handle}
    stylists = list(StylistProfile.objects.filter(published=True, featured=False, handle__in=handles))
    path = f"/styles/{item.slug}"
    content = {
        "name": item.name,
        "looks": [_look_card(lk) for lk in looks],
        "stylists": [{"name": s.display_name, "path": f"/{s.handle}", "area": s.base_area} for s in stylists],
    }
    return content, graph(
        _item_list(f"{item.name} in London", path, [(s["name"], s["path"]) for s in content["stylists"]]),
        breadcrumbs(("Yasante", "/"), ("Looks", "/looks"), (item.name, path)),
    )


def area(label, stylists, area_looks):
    path = f"/areas/{slugify(label)}"
    content = {
        "name": label,
        "stylists": [
            {"name": s.display_name, "path": f"/{s.handle}", "bio": s.bio[:160]} for s in stylists
        ],
        "looks": [_look_card(lk) for lk in area_looks[:24]],
    }
    return content, graph(
        _item_list(f"Braiders in {label}", path, [(s["name"], s["path"]) for s in content["stylists"]]),
        breadcrumbs(("Yasante", "/"), (f"Braiders in {label}", path)),
    )


def looks_index(style_filter=None):
    qs = public_looks().filter(**LIVE_LOOKS)
    if style_filter:
        qs = qs.filter(styles=style_filter)
    content = {
        "looks": [_look_card(lk) for lk in qs.order_by("-created_at")[:30]],
        "styles": [{"name": s.name, "path": f"/styles/{s.slug}"} for s in Style.objects.order_by("sort_order", "name")],
    }
    return content, graph(breadcrumbs(("Yasante", "/"), ("Looks", "/looks")))


def policy(doc):
    content = {"title": doc.title, "version": doc.version, "effective": doc.effective_at, "body": doc.body}
    return content, graph(
        {"@type": "WebPage", "name": doc.title, "url": absolute(f"/{doc.type.replace('_', '-')}"), "inLanguage": "en-GB", "isPartOf": {"@id": f"{SITE}/#website"}}
    )


# ── Helpers ────────────────────────────────────────────────────────────────────


def _look_card(lk):
    what = lk.service_name or "A look"
    return {
        "path": f"/looks/{lk.pk}",
        "title": f"{what} by {lk.stylist_name}" if lk.stylist_name else what,
        "image": lk.thumb_uri or lk.feed_uri or lk.photo_uri,
        "alt": lk.caption or what,
    }


def _item_list(name, path, entries):
    return {
        "@type": "ItemList",
        "name": name,
        "url": absolute(path),
        "itemListElement": [
            {"@type": "ListItem", "position": i, "name": n, "url": absolute(p)}
            for i, (n, p) in enumerate(entries, start=1)
        ],
    }
