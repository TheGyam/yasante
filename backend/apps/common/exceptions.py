"""
Every error the API sends is { "message": "..." }: one sentence a person can read and
act on, since the app shows it as it is. Django REST framework's stock wording ("This
field is required.", "Given token not valid for any token type", "Not found.") is
written for developers, so it's replaced here with plain words; messages the views
write themselves are already meant for people and pass through untouched.
"""

import re

from rest_framework import exceptions
from rest_framework.exceptions import ErrorDetail
from rest_framework.views import exception_handler

SESSION_ENDED = "Your session has ended. Please sign in again."
TRY_AGAIN = "Something went wrong. Please try again."

# DRF's own wording for a value in the wrong shape, as opposed to the sentences our
# serializers raise (which share the same "invalid" code).
_STOCK_INVALID = re.compile(
    r"^(Enter a valid|A valid|Must be a valid|Invalid|Not a valid|Incorrect type|Expected a)"
    r"|is not a valid|wrong format|has no more than|Ensure this",
    re.I,
)


def _label(field):
    """firstName / first_name -> "First name"."""
    words = re.sub(r"(?<!^)(?=[A-Z])", " ", field).replace("_", " ").strip().lower()
    return words[:1].upper() + words[1:] if words else "That"


def _number(text):
    found = re.search(r"\d+", str(text))
    return found.group() if found else None


def _field_message(field, error):
    """One field's problem, in words, naming the field."""
    text = str(error)
    code = getattr(error, "code", None)
    label = _label(field)
    if code in ("required", "blank", "null", "empty"):
        return f"{label} can’t be empty."
    if code == "max_length":
        n = _number(text)
        return f"{label} can be at most {n} characters." if n else f"{label} is too long."
    if code == "min_length":
        n = _number(text)
        return f"{label} needs at least {n} characters." if n else f"{label} is too short."
    if code == "max_value":
        return f"{label} is too high."
    if code == "min_value":
        return f"{label} is too low."
    if code == "invalid_choice":
        return f"That {label.lower()} isn’t one of the options."
    if code == "unique":
        return f"That {label.lower()} is already taken."
    if code in ("does_not_exist", "incorrect_type", "not_a_list", "invalid_image", "date", "datetime"):
        return f"{label} doesn’t look right."
    if code == "invalid" and _STOCK_INVALID.search(text):
        return f"{label} doesn’t look right."
    return text


def _flatten(data, field=None):
    """Every message in DRF's nested errors, stock wording replaced."""
    if isinstance(data, dict):
        out = []
        for key, value in data.items():
            # A list's errors are keyed by position (events.1): they belong to the list's field.
            inner = None if key in ("message", "non_field_errors", "detail") or not isinstance(key, str) else key
            out += _flatten(value, inner or field)
        return out
    if isinstance(data, list):
        return [m for item in data for m in _flatten(item, field)]
    if field and isinstance(data, ErrorDetail):
        return [_field_message(field, data)]
    return [str(data)]


def _stock(exc):
    """The detail DRF made up itself rather than one a view chose."""
    return str(exc.detail) == str(getattr(exc, "default_detail", ""))


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    if isinstance(exc, exceptions.Throttled):
        wait = int(exc.wait) if exc.wait else 60
        when = f"{wait} seconds" if wait < 90 else f"{round(wait / 60)} minutes"
        response.data = {"message": f"You’ve done that a lot just now. Try again in {when}."}
        response["Retry-After"] = str(wait)
        return response

    # simplejwt's InvalidToken is an AuthenticationFailed; either way she signs in again.
    if isinstance(exc, exceptions.AuthenticationFailed):
        message = SESSION_ENDED
    elif isinstance(exc, exceptions.NotAuthenticated):
        message = "Please sign in to continue."
    elif isinstance(exc, exceptions.PermissionDenied) and _stock(exc):
        message = "You don’t have access to that."
    elif isinstance(exc, exceptions.NotFound) and _stock(exc):
        message = "We couldn’t find that. It may have been removed."
    elif isinstance(
        exc,
        (exceptions.MethodNotAllowed, exceptions.UnsupportedMediaType, exceptions.ParseError, exceptions.NotAcceptable),
    ):
        message = TRY_AGAIN
    else:
        parts = [m.strip() for m in _flatten(response.data) if m and m.strip()]
        message = " ".join(m if m[-1] in ".!?" else f"{m}." for m in parts) or TRY_AGAIN

    response.data = {"message": message}
    return response
