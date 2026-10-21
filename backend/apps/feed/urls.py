"""Feed URL routes — /api/feed/"""

from django.urls import path

from . import views

urlpatterns = [
    path("events/", views.FeedEventBatchView.as_view(), name="feed-events"),
]
