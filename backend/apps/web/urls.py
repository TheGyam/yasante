from django.urls import path, re_path

from . import views

urlpatterns = [
    path("", views.home, name="web-home"),
    path("robots.txt", views.robots),
    path("sitemap.xml", views.sitemap, name="web-sitemap"),
    path(".well-known/assetlinks.json", views.assetlinks),
    path(".well-known/apple-app-site-association", views.apple_app_site_association),
    path("looks", views.looks, name="web-looks"),
    path("looks/new", views.studio_post, name="web-post-look"),
    path("looks/<uuid:pk>", views.look, name="web-look"),
    path("auth/reset-password", views.open_in_app, name="web-reset-password"),
    # A stylist's account and page. The same addresses as the app's screens, so a phone
    # with the app opens them there instead.
    path("auth/signup", views.signup, name="web-signup"),
    path("auth/login", views.sign_in, name="web-login"),
    path("auth/verify-email", views.verify_email, name="web-verify-email"),
    path("stylist-setup", views.stylist_setup, name="web-stylist-setup"),
    # Her studio, at the app's addresses for the same screens.
    path("today", views.studio_today, name="web-today"),
    path("requests", views.studio_requests, name="web-requests"),
    path("requests/<uuid:pk>", views.studio_request, name="web-request"),
    path("portfolio", views.studio_portfolio, name="web-portfolio"),
    path("menu", views.studio_menu, name="web-menu"),
    path("menu/new", views.studio_service, name="web-menu-new"),
    path("menu/<uuid:pk>", views.studio_service, name="web-menu-item"),
    path("availability", views.studio_hours, name="web-availability"),
    path("payment-methods", views.studio_payments, name="web-payment-methods"),
    path("account", views.studio_account, name="web-account"),
    path("styles/<slug:slug>", views.style, name="web-style"),
    path("areas/<slug:slug>", views.area, name="web-area"),
    re_path(r"^(?P<type>terms|stylist-terms|privacy|guidelines)$", views.policy, name="web-policy"),
    # Last: her bio link, yasante.com/{handle}.
    re_path(r"^(?P<handle>[A-Za-z0-9][A-Za-z0-9._]{1,49})$", views.stylist, name="web-stylist"),
]
