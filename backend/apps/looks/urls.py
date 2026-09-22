"""Look URL routes — /api/looks/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.FeedView.as_view(), name="look-feed"),
    path("areas/", views.AreaListView.as_view(), name="look-areas"),
    path("mine/", views.MyLooksView.as_view(), name="look-mine"),
    path("<uuid:pk>/", views.LookDetailView.as_view(), name="look-detail"),
    path("<uuid:pk>/like/", views.LookLikeView.as_view(), name="look-like"),
    path("<uuid:pk>/report/", views.LookReportView.as_view(), name="look-report"),
    path(
        "<uuid:look_id>/comments/",
        views.CommentListCreateView.as_view(),
        name="comment-list",
    ),
]
