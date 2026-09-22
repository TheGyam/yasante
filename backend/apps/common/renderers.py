"""
CamelCase JSON output.

The frontend sends and expects camelCase. Django models use snake_case. This
renderer converts keys on the way out, and leaves out keys whose value is empty
(`None` or `""`): the app's types mark those fields optional, and an absent field
reads as "not set" everywhere, where an empty string would not.
"""

from rest_framework.renderers import JSONRenderer


def _snake_to_camel(name: str) -> str:
    """Convert snake_case to camelCase."""
    components = name.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def _camelize(data):
    """Recursively convert dict keys to camelCase, dropping empty values."""
    if isinstance(data, dict):
        return {
            _snake_to_camel(str(k)): _camelize(v)
            for k, v in data.items()
            if v is not None and v != ""
        }
    if isinstance(data, (list, tuple)):
        return [_camelize(item) for item in data]
    return data


class CamelCaseJSONRenderer(JSONRenderer):
    """Render JSON with camelCase keys."""

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return super().render(_camelize(data), accepted_media_type, renderer_context)
