"""
Security middleware and request tracking.
"""

import uuid

from django.utils.deprecation import MiddlewareMixin


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Adds security headers to every response.

    - Strict-Transport-Security (HSTS)
    - X-Content-Type-Options
    - X-Frame-Options
    - Referrer-Policy
    - Permissions-Policy
    - Cache-Control for authenticated responses
    """

    def process_response(self, request, response):
        # Prevent MIME sniffing
        response["X-Content-Type-Options"] = "nosniff"

        # Clickjacking protection
        response["X-Frame-Options"] = "DENY"

        # Referrer policy
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Restrict browser features
        response["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), "
            "payment=(), usb=(), magnetometer=(), gyroscope=()"
        )

        # No caching for authenticated API responses
        if request.path.startswith("/api/") and not response.get("Cache-Control"):
            if hasattr(request, "user") and request.user.is_authenticated:
                response["Cache-Control"] = (
                    "no-store, no-cache, must-revalidate, private"
                )

        return response


class RequestIDMiddleware(MiddlewareMixin):
    """
    Attaches a unique request ID to every request for tracing.
    The ID is also added to the response headers.
    """

    def process_request(self, request):
        request.request_id = request.META.get("HTTP_X_REQUEST_ID", str(uuid.uuid4()))

    def process_response(self, request, response):
        if hasattr(request, "request_id"):
            response["X-Request-ID"] = request.request_id
        return response
