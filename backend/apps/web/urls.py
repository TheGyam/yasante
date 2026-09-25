from django.urls import path, re_path

from . import views

urlpatterns = [
    path("", views.home, name="web-home"),
    path("robots.txt", views.robots),
    path("sitemap.xml", views.sitemap, name="web-sitemap"),
    path(".well-known/assetlinks.json", views.assetlinks),
    path(".well-known/apple-app-site-association", views.apple_app_site_association),
    path("looks/<uuid:pk>", views.look, name="web-look"),
    path("auth/reset-password", views.open_in_app, name="web-reset-password"),
    path("styles/<slug:slug>", views.style, name="web-style"),
    path("areas/<slug:slug>", views.area, name="web-area"),
    re_path(r"^(?P<type>terms|stylist-terms|privacy|guidelines)$", views.policy, name="web-policy"),
    # Last: her bio link, yasante.com/{handle}.
    re_path(r"^(?P<handle>[A-Za-z0-9][A-Za-z0-9._]{1,49})$", views.stylist, name="web-stylist"),
]
