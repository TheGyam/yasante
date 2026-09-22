"""Waitlist URL routes — /api/slot-interests/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.SlotInterestListCreateView.as_view(), name="slot-interest-list"),
    path(
        "<uuid:pk>/",
        views.SlotInterestDeleteView.as_view(),
        name="slot-interest-delete",
    ),
]
