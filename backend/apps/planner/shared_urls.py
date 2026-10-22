"""Shared links — /api/shared/. Anyone with a link's code can look; the rest needs an account."""

from django.urls import path

from . import views

# A share code: 22 URL-safe characters.
CODE = "<str:code>"

urlpatterns = [
    path(f"collections/{CODE}/", views.SharedCollectionView.as_view(), name="shared-collection"),
    path(f"collections/{CODE}/follow/", views.TagAlongCollectionView.as_view(), name="shared-collection-follow"),
    path(
        f"collections/{CODE}/make-mine/",
        views.MakeSharedCollectionMineView.as_view(),
        name="shared-collection-make-mine",
    ),
    path(f"care-plans/{CODE}/", views.SharedCarePlanView.as_view(), name="shared-care-plan"),
    path(f"care-plans/{CODE}/follow/", views.TagAlongCarePlanView.as_view(), name="shared-care-plan-follow"),
    path(
        f"care-plans/{CODE}/make-mine/",
        views.MakeSharedCarePlanMineView.as_view(),
        name="shared-care-plan-make-mine",
    ),
]
