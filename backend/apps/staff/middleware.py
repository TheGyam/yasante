from django.conf import settings
from django.core.exceptions import DisallowedHost

CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'"


def secure_staff_response(request, response):
    try:
        host = request.get_host().partition(":")[0].lower()
    except DisallowedHost:
        return response
    if host == settings.STAFF_HOST.lower():
        response["X-Robots-Tag"] = "noindex, nofollow"
        response["Cache-Control"] = "no-store, private"
        response["Referrer-Policy"] = "same-origin"
        response["Content-Security-Policy"] = CSP
    return response


def show_debug_toolbar(request):
    from debug_toolbar.middleware import show_toolbar
    # The staff URLconf intentionally has no toolbar routes or injected scripts.
    return request.get_host().partition(":")[0].lower() != settings.STAFF_HOST.lower() and show_toolbar(request)


class StaffHostMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Ignore the transport port so admin.localhost:5173 uses the same host policy.
        staff = request.get_host().partition(":")[0].lower() == settings.STAFF_HOST.lower()
        if staff:
            request.urlconf = "apps.staff.urls_host"
        response = self.get_response(request)
        return secure_staff_response(request, response)
