"""Style URL routes — /api/styles/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.StyleListView.as_view(), name="style-list"),
]
