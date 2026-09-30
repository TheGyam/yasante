"""Separate staff limits, including already authenticated clients."""
import hashlib
import time

from django.core.cache import cache
from .network import client_ip


def limited(kind, identity, limit, seconds, record=True):
    key = "staff:throttle:" + kind + ":" + hashlib.sha256(identity.encode()).hexdigest()
    lock = key + ":lock"
    if not cache.add(lock, True, 5):
        # Concurrent attempts fail closed instead of racing the cached counter.
        return True
    try:
        now = time.time()
        attempts = [at for at in cache.get(key, []) if at > now - seconds]
        if len(attempts) >= limit:
            return True
        if record:
            cache.set(key, [*attempts, now], seconds)
        return False
    finally:
        cache.delete(lock)


def sign_in_limited(request, email):
    if limited("ip", client_ip(request), 5, 60):
        return True
    # Hold the account lock through password validation so concurrent IPs cannot
    # all pass a nine-failure counter before recording their tenth failure.
    if not cache.add(account_lock(email), True, 30):
        return True
    if limited("email", email, 10, 3600, record=False):
        release_sign_in(email)
        return True
    return False


def account_lock(email):
    return "staff:auth:" + hashlib.sha256(email.encode()).hexdigest()


def release_sign_in(email):
    cache.delete(account_lock(email))


def sign_in_failed(email):
    limited("email", email, 10, 3600)


def code_limited(request):
    return limited("code", request.session.session_key, 5, 60)
