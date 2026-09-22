"""Booking URL routes — /api/bookings/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.BookingListCreateView.as_view(), name="booking-list"),
    path("<uuid:pk>/", views.BookingDetailView.as_view(), name="booking-detail"),
    path("<uuid:pk>/accept/", views.BookingAcceptView.as_view(), name="booking-accept"),
    path(
        "<uuid:pk>/decline/", views.BookingDeclineView.as_view(), name="booking-decline"
    ),
    path(
        "<uuid:pk>/deposit-received/",
        views.BookingDepositReceivedView.as_view(),
        name="booking-deposit",
    ),
    path("<uuid:pk>/cancel/", views.BookingCancelView.as_view(), name="booking-cancel"),
    path("<uuid:pk>/close/", views.BookingCloseView.as_view(), name="booking-close"),
    path(
        "<uuid:pk>/propose/", views.BookingProposeView.as_view(), name="booking-propose"
    ),
    path(
        "<uuid:pk>/proposal/",
        views.BookingProposalAnswerView.as_view(),
        name="booking-proposal-answer",
    ),
    path(
        "<uuid:pk>/attending/",
        views.BookingAttendingView.as_view(),
        name="booking-attending",
    ),
    path("<uuid:pk>/move/", views.BookingMoveView.as_view(), name="booking-move"),
    path(
        "<uuid:pk>/move/answer/",
        views.BookingMoveAnswerView.as_view(),
        name="booking-move-answer",
    ),
    path(
        "<uuid:pk>/started-on-time/",
        views.BookingStartedOnTimeView.as_view(),
        name="booking-on-time",
    ),
    path(
        "<uuid:pk>/contest/", views.BookingContestView.as_view(), name="booking-contest"
    ),
    path("<uuid:pk>/review/", views.ReviewCreateView.as_view(), name="booking-review"),
    path("<uuid:pk>/check-in/", views.CheckInView.as_view(), name="booking-check-in"),
]
