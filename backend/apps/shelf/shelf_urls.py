"""Shelf URL routes — /api/shelf/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.ShelfListCreateView.as_view(), name="shelf-list-create"),
    path("<uuid:pk>/", views.ShelfDetailView.as_view(), name="shelf-detail"),
]
