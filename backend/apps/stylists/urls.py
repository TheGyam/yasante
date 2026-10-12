"""Stylist URL routes — /api/stylists/"""

from django.urls import path

from . import views

urlpatterns = [
    path("handle-available/", views.HandleCheckView.as_view(), name="handle-check"),
    path("", views.StylistCreateView.as_view(), name="stylist-create"),
    path("me/", views.StylistMeView.as_view(), name="stylist-me"),
    path("me/publish/", views.StylistPublishView.as_view(), name="stylist-publish"),
    path("me/menu/", views.MenuListCreateView.as_view(), name="menu-list-create"),
    path("me/menu/import/", views.MenuImportView.as_view(), name="menu-import"),
    path("me/menu/<uuid:pk>/", views.MenuDetailView.as_view(), name="menu-detail"),
    path(
        "me/portfolio/",
        views.PortfolioListCreateView.as_view(),
        name="portfolio-list-create",
    ),
    path(
        "me/portfolio/<uuid:pk>/",
        views.PortfolioDetailView.as_view(),
        name="portfolio-detail",
    ),
    path(
        "me/numbers/", views.StylistNumbersView.as_view(), name="stylist-numbers"
    ),
    path(
        "me/summary/", views.StylistSummaryView.as_view(), name="stylist-summary"
    ),
    path("me/closed-days/", views.ClosedDayView.as_view(), name="stylist-closed-days"),
    path("me/blocks/", views.TimeBlockListView.as_view(), name="stylist-blocks"),
    path("me/blocks/<uuid:pk>/", views.TimeBlockDetailView.as_view(), name="stylist-block"),
    path("me/blocks/<uuid:pk>/skip/", views.TimeBlockSkipView.as_view(), name="stylist-block-skip"),
    path(
        "by-handle/<str:handle>/",
        views.StylistByHandleView.as_view(),
        name="stylist-by-handle",
    ),
    path(
        "by-handle/<str:handle>/slots/",
        views.StylistSlotsView.as_view(),
        name="stylist-slots",
    ),
]
