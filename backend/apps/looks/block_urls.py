"""Block URL routes — /api/blocks/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.BlockListCreateView.as_view(), name="block-list"),
    path("<uuid:pk>/", views.BlockDeleteView.as_view(), name="block-delete"),
]
