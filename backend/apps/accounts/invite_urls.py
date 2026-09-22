"""Invite URL routes — /api/invites/"""

from django.urls import path

from . import views

urlpatterns = [
    path("<str:code>/", views.InviteDetailView.as_view(), name="invite-detail"),
    path("<str:code>/redeem/", views.InviteRedeemView.as_view(), name="invite-redeem"),
]
