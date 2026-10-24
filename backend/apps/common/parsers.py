"""
CamelCase JSON parser — converts incoming camelCase keys to snake_case
so DRF serializers work with standard Python naming.
"""

import re

from rest_framework.exceptions import ParseError
from rest_framework.parsers import JSONParser


def _camel_to_snake(name: str) -> str:
    """Convert camelCase to snake_case."""
    s1 = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s1).lower()


def _underscoreize(data):
    """Recursively convert dict keys from camelCase to snake_case."""
    if isinstance(data, dict):
        return {_camel_to_snake(k): _underscoreize(v) for k, v in data.items()}
    if isinstance(data, (list, tuple)):
        return [_underscoreize(item) for item in data]
    # Postgres can't store a NUL in text, so it would end as a server error wherever it's saved.
    if isinstance(data, str) and "\x00" in data:
        raise ParseError("Text can't contain a NUL character.")
    return data


class CamelCaseJSONParser(JSONParser):
    """Parse JSON with camelCase keys into snake_case."""

    def parse(self, stream, media_type=None, parser_context=None):
        data = super().parse(stream, media_type, parser_context)
        # Every endpoint reads named fields. A list or a bare number is refused here,
        # once, rather than crashing each view that calls request.data.get().
        if not isinstance(data, dict):
            raise ParseError("Send the details as a JSON object.")
        return _underscoreize(data)
