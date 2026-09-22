"""Analytics event URL routes — /api/events/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.EventBatchView.as_view(), name="event-batch"),
]
