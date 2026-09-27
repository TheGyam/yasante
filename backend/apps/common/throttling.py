"""
Rate-limiting throttles per the backend brief:

- Login: 5/min per IP
- Signup: 3/min per IP
- Phone codes: 1/30s per phone
- Posting: 30/hour per user
- Reporting: 10/hour per user
"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginThrottle(AnonRateThrottle):
    scope = "login"
    rate = "5/min"


class SignupThrottle(AnonRateThrottle):
    scope = "signup"
    rate = "3/min"


class PhoneCodeThrottle(UserRateThrottle):
    scope = "phone_code"
    rate = "2/min"


class PostingThrottle(UserRateThrottle):
    """
    30 an hour for everyone, which no person posting their own hair reaches. A stylist
    with a live page gets more: she's putting up her back catalogue so the feed has her
    work in it, and her page makes her accountable for what she posts.
    """

    scope = "posting"
    rate = "30/hour"
    STYLIST_RATE = "200/hour"

    def allow_request(self, request, view):
        from apps.stylists.models import StylistProfile

        user = request.user
        if user.is_authenticated and StylistProfile.objects.filter(account=user, published=True).exists():
            self.scope = "posting_stylist"
            self.rate = self.STYLIST_RATE
            self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request, view)


class CommentThrottle(UserRateThrottle):
    scope = "commenting"


class ReviewThrottle(UserRateThrottle):
    scope = "reviewing"


class BookingRequestThrottle(UserRateThrottle):
    scope = "booking"


class ReportThrottle(UserRateThrottle):
    scope = "reporting"
    rate = "10/hour"
