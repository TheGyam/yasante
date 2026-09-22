"""Content URL routes — /api/content/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.ContentListView.as_view(), name="content-list"),
    path("<slug:slug>/", views.ContentDetailView.as_view(), name="content-detail"),
]
