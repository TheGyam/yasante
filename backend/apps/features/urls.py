"""Feature switch URL routes — /api/features/"""

from django.urls import path

from .views import FeaturesView

urlpatterns = [
    path("", FeaturesView.as_view(), name="features"),
]
