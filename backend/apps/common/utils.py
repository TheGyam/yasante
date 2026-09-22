"""
Shared utilities.
"""

import hashlib
import hmac
import re
import secrets
import uuid

from django.conf import settings


def generate_uuid() -> str:
    """Generate a UUID4 string."""
    return str(uuid.uuid4())


def generate_code(length: int = 6) -> str:
    """Generate a numeric code of the given length."""
    return "".join(secrets.choice("0123456789") for _ in range(length))


def hash_code(code: str) -> str:
    """Hash a verification code with HMAC-SHA256."""
    return hmac.new(
        settings.SECRET_KEY.encode(),
        code.encode(),
        hashlib.sha256,
    ).hexdigest()


def verify_code(code: str, hashed: str) -> bool:
    """Timing-safe comparison of a code against its hash."""
    return hmac.compare_digest(hash_code(code), hashed)


def normalise_phone(phone: str) -> str:
    """
    Normalise a UK mobile to E.164 format.
    +447... stays as is, 07... becomes +447..., etc.
    """
    # Strip whitespace and dashes
    phone = re.sub(r"[\s\-()]", "", phone)

    if phone.startswith("+44"):
        return phone
    if phone.startswith("0044"):
        return "+" + phone[2:]
    if phone.startswith("44"):
        return "+" + phone
    if phone.startswith("0"):
        return "+44" + phone[1:]
    return phone


def is_uk_mobile(phone: str) -> bool:
    """Check if a normalised phone is a UK mobile."""
    return bool(re.match(r"^\+447[0-9]{9}$", phone))
