"""
Booking state machine.

Every transition not listed is refused with 409.
The server owns all state transitions — the app only reflects state.
"""

from django.utils import timezone

# Valid transitions
TRANSITIONS = {
    "requested": {"awaiting_deposit", "confirmed", "declined", "expired"},
    "awaiting_deposit": {"confirmed", "expired", "cancelled_in_time", "cancelled_late"},
    "confirmed": {
        "completed",
        "no_show",
        "cancelled_in_time",
        "cancelled_late",
        "cancelled_by_stylist",
    },
}

# Terminal states
TERMINAL = {
    "completed",
    "declined",
    "expired",
    "cancelled_in_time",
    "cancelled_late",
    "cancelled_by_stylist",
    "no_show",
}

VALID_TIMING_REASONS = {
    "client_late",
    "hair_not_prepped",
    "wrong_hair",
    "old_style_in",
    "style_changed",
    "long_breaks",
    "took_longer",
    "more_hair",
    "previous_overran",
    "working_alone",
    "supplies",
    "own_delay",
}

CLIENT_SIDE_REASONS = {
    "client_late",
    "hair_not_prepped",
    "wrong_hair",
    "old_style_in",
    "style_changed",
    "long_breaks",
}


def can_transition(current_status: str, new_status: str) -> bool:
    """Check if a transition is allowed."""
    if current_status in TERMINAL:
        return False
    allowed = TRANSITIONS.get(current_status, set())
    return new_status in allowed


def is_terminal(status: str) -> bool:
    return status in TERMINAL


def determine_cancel_type(booking, canceller) -> str:
    """
    Determine the cancellation type.

    - By stylist: cancelled_by_stylist
    - By client, enough notice: cancelled_in_time
    - By client, not enough notice: cancelled_late
    """
    if canceller.pk == booking.stylist_id:
        return "cancelled_by_stylist"

    if booking.scheduled_for:
        notice_hours = booking.policy.get("notice_hours", 24)
        cutoff = booking.scheduled_for - timezone.timedelta(hours=notice_hours)
        if timezone.now() < cutoff:
            return "cancelled_in_time"
        return "cancelled_late"

    return "cancelled_in_time"


def validate_close_out(data: dict) -> str | None:
    """Validate close-out data. Returns error message or None."""
    outcome = data.get("outcome")
    if outcome not in ("attended", "no_show"):
        return "Outcome must be 'attended' or 'no_show'."

    timing = data.get("timing")
    if timing and outcome == "attended":
        t_outcome = timing.get("outcome")
        if t_outcome not in ("early", "on_time", "over"):
            return "Timing outcome must be 'early', 'on_time', or 'over'."

        if t_outcome != "on_time":
            bucket = timing.get("bucket")
            if bucket not in ("under_30", "30_60", "1_2h", "2h_plus"):
                return "A timing bucket is required when not on time."

        reason = timing.get("reason")
        if reason and reason not in VALID_TIMING_REASONS:
            return f"Unknown timing reason: {reason}"

    return None
