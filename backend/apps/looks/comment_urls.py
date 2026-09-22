"""Comment URL routes — /api/comments/"""

from django.urls import path

from . import views

urlpatterns = [
    path("<uuid:pk>/", views.CommentDeleteView.as_view(), name="comment-delete"),
    path("<uuid:pk>/replies/", views.CommentRepliesView.as_view(), name="comment-replies"),
    path("<uuid:pk>/like/", views.CommentLikeView.as_view(), name="comment-like"),
    path("<uuid:pk>/report/", views.CommentReportView.as_view(), name="comment-report"),
]
