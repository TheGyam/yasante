"""
Yasante Backend — Root URL Configuration

All API endpoints live under /api/.
"""

from apps.accounts.views import InviteDetailView, InviteRedeemView
from apps.common.uploads import PrivateMediaView, UploadView
from apps.accounts import views as account_views
from apps.looks import views as looks_views
from apps.profiles import views as profile_views
from apps.common.client_errors import ClientErrorView
from apps.content import compat as content
from apps.common.countries import CountryListView
from apps.looks.views import StylistReportView
from apps.web.api import WaitlistView
from apps.profiles.views import ConsentBatchView, EventBatchView
from apps.stylists.views import FeaturedClaimView
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

# The schema and its docs describe every endpoint: fine in development, not something
# to publish from production (SHOW_API_DOCS=True turns them on anywhere).
API_DOCS = (
    [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path(
            "api/docs/swagger/",
            SpectacularSwaggerView.as_view(url_name="schema"),
            name="swagger-ui",
        ),
        path(
            "api/docs/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"
        ),
    ]
    if settings.SHOW_API_DOCS
    else []
)

urlpatterns = API_DOCS + [
    path("api/featured/claim/<str:code>/", FeaturedClaimView.as_view(), name="featured-claim"),
    # API
    path("api/auth/", include("apps.accounts.urls")),
    path("api/invites/<str:code>/", InviteDetailView.as_view(), name="invite-detail"),
    path("api/invites/<str:code>/redeem/", InviteRedeemView.as_view(), name="invite-redeem"),
    path("api/features/", include("apps.features.urls")),
    path("api/users/", include("apps.profiles.urls")),
    path("api/consents/", ConsentBatchView.as_view(), name="consents"),
    path("api/events/", EventBatchView.as_view(), name="events"),
    path("api/stylists/<uuid:pk>/report/", StylistReportView.as_view(), name="stylist-report"),
    path("api/stylists/", include("apps.stylists.urls")),
    path("api/countries/", CountryListView.as_view(), name="country-list"),
    path("api/bookings/", include("apps.bookings.urls")),
    path("api/slot-interests/", include("apps.bookings.waitlist_urls")),
    path("api/reviews/", include("apps.bookings.review_urls")),
    path("api/looks/", include("apps.looks.urls")),
    path("api/comments/", include("apps.looks.comment_urls")),
    path("api/styles/", include("apps.looks.style_urls")),
    path("api/blocks/", include("apps.looks.block_urls")),
    path("api/collections/", include("apps.planner.collection_urls")),
    path("api/care-plans/", include("apps.planner.care_plan_urls")),
    path("api/shelf/", include("apps.shelf.shelf_urls")),
    path("api/products/", include("apps.shelf.product_urls")),
    path("api/uploads/", UploadView.as_view(), name="uploads"),
    path("api/waitlist/", WaitlistView.as_view(), name="waitlist"),
    path("api/reports/mine/", looks_views.MyReportsView.as_view(), name="my-reports"),
    path("api/moderation/mine/", looks_views.MyModerationView.as_view(), name="my-moderation"),
    path(
        "api/moderation/<uuid:pk>/appeal/",
        looks_views.AppealCreateView.as_view(),
        name="moderation-appeal",
    ),
    path("api/policies/", profile_views.PolicyListView.as_view(), name="policies"),
    path("api/hair-log/", profile_views.HairLogView.as_view(), name="hair-log"),
    path("api/insights/", profile_views.InsightsView.as_view(), name="insights"),
    path("api/policies/<str:type>/", profile_views.PolicyDetailView.as_view(), name="policy"),
    path("api/media/<uuid:pk>/", PrivateMediaView.as_view(), name="private-media"),
    # The education library and favourites, on the paths the app calls.
    path("api/content/content/", content.ContentListView.as_view(), name="content-list-compat"),
    path("api/tips/", content.TipListView.as_view(), name="tips"),
    path("api/client-errors/", ClientErrorView.as_view(), name="client-errors"),
    path(
        "api/content/content/search/",
        content.ContentSearchView.as_view(),
        name="content-search",
    ),
    path(
        "api/content/content/<uuid:pk>/",
        content.ContentDetailView.as_view(),
        name="content-detail-compat",
    ),
    path(
        "api/content/content/<uuid:pk>/products/",
        content.ContentProductsView.as_view(),
        name="content-products",
    ),
    path("api/favorites/favorites/", content.FavoriteListView.as_view(), name="favorites"),
    path(
        "api/favorites/favorites/check/",
        content.FavoriteCheckView.as_view(),
        name="favorites-check",
    ),
    path(
        "api/favorites/favorites/toggle/",
        content.FavoriteToggleView.as_view(),
        name="favorites-toggle",
    ),
    path("api/devices/", include("apps.accounts.device_urls")),
    path(
        "api/notifications/preferences/",
        account_views.NotificationPreferencesView.as_view(),
        name="notification-preferences",
    ),
]

# Serve media in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

    # Debug toolbar
    try:
        import debug_toolbar

        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass

# Last, so nothing above is shadowed: the public site, including yasante.com/{handle}.
urlpatterns += [path("", include("apps.web.urls"))]

# Any other address gets the site's own not-found page (only when DEBUG is off).
handler404 = "apps.web.views.not_found"
