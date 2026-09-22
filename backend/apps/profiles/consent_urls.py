"""Consent URL routes — /api/consents/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.ConsentBatchView.as_view(), name="consent-batch"),
]
