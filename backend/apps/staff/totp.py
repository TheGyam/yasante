"""RFC 6238 SHA1 TOTP; comparison and replay policy live in the session view."""
import base64
import hashlib
import hmac
import secrets
import struct


def new_secret():
    return base64.b32encode(secrets.token_bytes(20)).decode()


def code(secret, step, digits=6):
    digest = hmac.new(base64.b32decode(secret), struct.pack(">Q", step), hashlib.sha1).digest()
    offset = digest[-1] & 15
    value = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7fffffff
    return str(value % 10 ** digits).zfill(digits)


def matching_step(secret, submitted, now, last_used=-1):
    step = int(now) // 30
    return next((candidate for candidate in (step, step - 1, step + 1)
                 if candidate > last_used and hmac.compare_digest(code(secret, candidate).encode(), submitted.encode())), None)


def self_test():
    secret = base64.b32encode(b"12345678901234567890").decode()
    for timestamp, expected in [(59, "94287082"), (1111111109, "07081804"),
                                (1111111111, "14050471"), (1234567890, "89005924"),
                                (2000000000, "69279037"), (20000000000, "65353130")]:
        assert code(secret, timestamp // 30, 8) == expected


if __name__ == "__main__":
    self_test()
