"""Collection URL routes — /api/collections/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.CollectionListCreateView.as_view(), name="collection-list-create"),
    path("<uuid:pk>/", views.CollectionDetailView.as_view(), name="collection-detail"),
    path(
        "<uuid:pk>/items/",
        views.CollectionItemsView.as_view(),
        name="collection-item-create",
    ),
    path("<uuid:pk>/share/", views.CollectionShareView.as_view(), name="collection-share"),
    path("<uuid:pk>/make-mine/", views.MakeCollectionMineView.as_view(), name="collection-make-mine"),
    path(
        "<uuid:pk>/items/<uuid:item_id>/",
        views.CollectionItemDeleteView.as_view(),
        name="collection-item-delete",
    ),
]
