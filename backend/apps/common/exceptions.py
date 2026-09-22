"""
Custom exception handler.

Returns { "message": "..." } for user-facing errors,
as the frontend displays the message directly.
"""

from rest_framework.exceptions import Throttled
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Converts DRF exception responses to { "message": "..." } format.
    Rate limit errors include when to retry.
    """
    response = exception_handler(exc, context)

    if response is None:
        return response

    # Throttled — include retry info in the message
    if isinstance(exc, Throttled):
        wait = int(exc.wait) if exc.wait else 60
        response.data = {
            "message": f"Too many requests. Try again in {wait} seconds.",
        }
        response["Retry-After"] = str(wait)
        return response

    # Flatten DRF's error format into a single message
    if isinstance(response.data, dict):
        # If there's already a 'message' or 'detail' key, use it
        if "message" in response.data:
            return response
        if "detail" in response.data:
            response.data = {"message": str(response.data["detail"])}
            return response

        # Collect field errors into a single message
        messages = []
        for field, errors in response.data.items():
            if isinstance(errors, list):
                for error in errors:
                    if field == "non_field_errors":
                        messages.append(str(error))
                    else:
                        messages.append(f"{str(error)}")
            else:
                messages.append(str(errors))

        response.data = {
            "message": ". ".join(messages) if messages else "Something went wrong."
        }

    elif isinstance(response.data, list):
        response.data = {"message": ". ".join(str(e) for e in response.data)}

    return response
