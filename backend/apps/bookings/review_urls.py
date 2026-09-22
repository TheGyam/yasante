"""Review URL routes — /api/reviews/"""

from django.urls import path

from . import views

urlpatterns = [
    path("<uuid:pk>/report/", views.ReviewReportView.as_view(), name="review-report"),
]
