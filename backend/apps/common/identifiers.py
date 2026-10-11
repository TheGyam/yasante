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


def _with_affixes(roots):
    """Each root alone and with an official-sounding word either side ("apple_support")."""
    return frozenset(
        _skeleton(name)
        for root in roots
        for name in [root, *[root + a for a in POLICY["affixes"]], *[a + root for a in POLICY["affixes"]]]
    )


_RESERVED = frozenset(_compact(name) for name in NOT_HANDLES)
# Matched anywhere in a name: terms no ordinary word contains.
_ANYWHERE = frozenset(_skeleton(name) for name in POLICY["brands"] + POLICY["offensive"])
# Matched as the whole name, with a number after it.
_COMPANIES = _with_affixes(POLICY["companies"])
# Matched as the whole name or any dotted part of it, with a number after it.
_PROTECTED = _with_affixes(POLICY["protected"]) | frozenset(_skeleton(w) for w in POLICY["offensive_words"])


def _forms(value):
    """A name as it reads, and as it reads without a number on the end."""
    return {_skeleton(value), _skeleton(value.rstrip("0123456789"))}


def is_reserved(value):
    value = normalise(value)
    compact = _compact(value)
    if compact in _RESERVED:
        return True
    skeleton = _skeleton(compact)
    if any(term in skeleton for term in _ANYWHERE):
        return True
    if _forms(compact) & _COMPANIES:
        return True
    # Lookalike and numeric variants only for authority names and short slurs, not words.
    return any(_forms(candidate) & _PROTECTED for candidate in [compact, *re.split(r"[._-]", value)])


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
    Returns the value saved before, so a name given up can be held.
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
        return current
    value = normalise(raw)
    if optional and not value:
        setattr(instance, field, None)
        return current
    problem = identifier_problem(value, max_length=max_length)
    if problem:
        raise ValidationError({field: problem})
    setattr(instance, field, value)
    return current
