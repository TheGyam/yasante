"""
Make the OpenAPI schema describe what the app actually receives: camelCase keys
(see renderers.py), and empty values left out, so nullable fields are optional.
The app's TypeScript types are generated from this schema (npm run api:types).
"""

from .renderers import _snake_to_camel


def _walk(node):
    if isinstance(node, dict):
        props = node.get("properties")
        if isinstance(props, dict):
            optional = {k for k, v in props.items() if isinstance(v, dict) and v.get("nullable")}
            node["properties"] = {_snake_to_camel(k): v for k, v in props.items()}
            if "required" in node:
                node["required"] = [_snake_to_camel(k) for k in node["required"] if k not in optional]
                if not node["required"]:
                    del node["required"]
        for value in node.values():
            _walk(value)
    elif isinstance(node, list):
        for value in node:
            _walk(value)


def camelize_schema(result, generator, request, public):
    _walk(result.get("components", {}))
    _walk(result.get("paths", {}))
    return result
