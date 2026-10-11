"""Public names: strict syntax, reserved identities and safe handling of legacy names."""

import json
import re
from pathlib import Path

from django.core.exceptions import ValidationError

POLICY = json.loads(Path(__file__).with_name("identifier_policy.json").read_text())
NOT_HANDLES = frozenset(POLICY["routes"] + POLICY["reserved"])
UNAVAILABLE = "That name is not available. Choose another."
_LOOKALIKES = str.maketrans(POLICY["lookalikes"])


def normalise(value):
    value = str(value or "").strip().removeprefix("@")
    # Do not turn Unicode lookalikes (e.g. Kelvin sign) into valid ASCII names.
    return value.lower() if value.isascii() else value


def _compact(value):
    return re.sub(r"[._-]", "", value)


def _skeleton(value):
    return value.translate(_LOOKALIKES).replace("rn", "m").replace("l", "i")


_RESERVED = frozenset(_compact(name) for name in NOT_HANDLES)
_BRANDS = frozenset(_skeleton(name) for name in POLICY["brands"])
_PROTECTED = frozenset(
    _skeleton(name)
    for root in POLICY["protected"]
    for name in [
        root,
        *[root + a for a in POLICY["affixes"]],
        *[a + root for a in POLICY["affixes"]],
    ]
)


def is_reserved(value):
    value = normalise(value)
    compact = _compact(value)
    if compact in _RESERVED:
        return True
    skeleton = _skeleton(compact)
    if any(brand in skeleton for brand in _BRANDS):
        return True
    # Restrict lookalike and numeric variants to authority names, not ordinary words.
    candidates = [compact, *re.split(r"[._-]", value)]
    return any(
        _skeleton(candidate) in _PROTECTED
        or _skeleton(candidate.rstrip("0123456789")) in _PROTECTED
        for candidate in candidates
    )


def identifier_problem(value, *, max_length, current=None):
    if current and value == current:
        return None
    if (
        not 3 <= len(value) <= max_length
        or not re.fullmatch(r"[a-z0-9][a-z0-9._]*[a-z0-9]", value)
        or re.search(r"[._]{2}", value)
    ):
        return (
            f"Use 3 to {max_length} letters, numbers, dots or underscores, "
            "starting and ending with a letter or number, without repeated separators."
        )
    return UNAVAILABLE if is_reserved(value) else None


def validate_model_identifier(instance, field, *, max_length, optional=False):
    """Model forms and normal ORM saves enforce the same rule as the API.

    An unchanged legacy value may stay; adopting a newly reserved value may not.
    Bulk updates and SQL deliberately bypass model hooks: audit them separately.
    """
    current = None
    if not instance._state.adding:
        current = (
            type(instance)._base_manager.using(instance._state.db)
            .filter(pk=instance.pk)
            .values_list(field, flat=True)
            .first()
        )
    raw = getattr(instance, field)
    if current is not None and raw == current:
        return
    value = normalise(raw)
    if optional and not value:
        setattr(instance, field, None)
        return
    problem = identifier_problem(value, max_length=max_length)
    if problem:
        raise ValidationError({field: problem})
    setattr(instance, field, value)
