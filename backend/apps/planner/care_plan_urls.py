"""Care Plan URL routes — /api/care-plans/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.CarePlanListCreateView.as_view(), name="careplan-list-create"),
    path("<uuid:pk>/", views.CarePlanDetailView.as_view(), name="careplan-detail"),
    path(
        "<uuid:pk>/sessions/",
        views.CarePlanSessionView.as_view(),
        name="careplan-session",
    ),
]
