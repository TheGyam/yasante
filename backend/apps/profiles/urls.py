"""User / hair profile URL routes — /api/users/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.UserListView.as_view(), name="user-list"),
    path("username-check/", views.UsernameCheckView.as_view(), name="username-check"),
    path("<uuid:pk>/", views.UserDetailView.as_view(), name="user-detail"),
    path(
        "<uuid:pk>/hair-profile/",
        views.HairProfileUpdateView.as_view(),
        name="hair-profile-update",
    ),
    path("<uuid:pk>/export/", views.DataExportView.as_view(), name="data-export"),
]

# DELETE shares the same path as detail — Django resolves by method
# We handle both GET and DELETE in the same URL via a combined view, but
# for clarity, the delete is also available at the same path
