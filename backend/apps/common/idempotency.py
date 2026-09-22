"""
Idempotency-Key support for creates that must not double on retry.

Stored responses are returned as-is for the same user + key + path.
"""

import hashlib
import json

from django.core.cache import cache
from rest_framework.response import Response


def idempotent_create(request, build_response, ttl=86400):
    key = request.headers.get("Idempotency-Key") or request.META.get(
        "HTTP_IDEMPOTENCY_KEY"
    )
    if not key or not request.user.is_authenticated:
        return build_response()

    digest = hashlib.sha256(
        f"{request.user.pk}:{request.path}:{key}".encode()
    ).hexdigest()
    cache_key = f"idem:{digest}"
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached["data"], status=cached["status"])

    response = build_response()
    if 200 <= response.status_code < 300:
        cache.set(
            cache_key,
            {"data": response.data, "status": response.status_code},
            ttl,
        )
    return response
