"""Auth URL routes — /api/auth/"""

from django.urls import path

from . import views

urlpatterns = [
    path("signup/", views.SignupView.as_view(), name="auth-signup"),
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("refresh-token/", views.RefreshTokenView.as_view(), name="auth-refresh"),
    path(
        "forgot-password/",
        views.ForgotPasswordView.as_view(),
        name="auth-forgot-password",
    ),
    path(
        "reset-password/", views.ResetPasswordView.as_view(), name="auth-reset-password"
    ),
    path("email/start/", views.EmailStartView.as_view(), name="auth-email-start"),
    path("email/verify/", views.EmailVerifyView.as_view(), name="auth-email-verify"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("logout-all/", views.LogoutEverywhereView.as_view(), name="auth-logout-all"),
]
