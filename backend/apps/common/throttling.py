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
    scope = "posting"
    rate = "30/hour"


class CommentThrottle(UserRateThrottle):
    scope = "commenting"


class ReviewThrottle(UserRateThrottle):
    scope = "reviewing"


class BookingRequestThrottle(UserRateThrottle):
    scope = "booking"


class ReportThrottle(UserRateThrottle):
    scope = "reporting"
    rate = "10/hour"
