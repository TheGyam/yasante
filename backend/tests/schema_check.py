"""
Every JSON response the tests see is checked against openapi.yaml, the schema the
app's TypeScript types are generated from. A field the schema doesn't declare, a
required field that's missing, or a value of the wrong type fails the test, so the
generated types stay true to what the server really sends.
"""

import re
from functools import lru_cache
from pathlib import Path

import yaml

SCHEMA_FILE = Path(__file__).resolve().parents[2] / "openapi.yaml"
TYPES = {
    "string": str,
    "integer": int,
    "number": (int, float),
    "boolean": bool,
    "array": list,
    "object": dict,
}


@lru_cache(maxsize=1)
def _schema():
    return yaml.safe_load(SCHEMA_FILE.read_text(encoding="utf8"))


@lru_cache(maxsize=1)
def _routes():
    routes = []
    for template, ops in _schema()["paths"].items():
        pattern = "^" + re.sub(r"\{[^/]+\}", "[^/]+", template) + "$"
        routes.append((re.compile(pattern), ops))
    # Literal paths before templated ones, so /looks/mine/ isn't read as /looks/{id}/.
    routes.sort(key=lambda r: r[0].pattern.count("[^/]+"))
    return routes


def _resolve(node):
    while isinstance(node, dict) and "$ref" in node:
        name = node["$ref"].rsplit("/", 1)[-1]
        node = {**_schema()["components"]["schemas"][name], **{k: v for k, v in node.items() if k != "$ref"}}
    if isinstance(node, dict) and "allOf" in node:
        merged = {k: v for k, v in node.items() if k != "allOf"}
        for part in node["allOf"]:
            part = _resolve(part)
            merged = {**part, **merged, "properties": {**part.get("properties", {}), **merged.get("properties", {})}}
            if not merged["properties"]:
                del merged["properties"]
        node = merged
    return node


def _check(value, node, where, errors):
    node = _resolve(node)
    if not node:
        return  # {} / AnyValue: anything goes
    if value is None:
        if not node.get("nullable"):
            errors.append(f"{where}: null but not nullable")
        return
    if "oneOf" in node or "anyOf" in node:
        options = node.get("oneOf") or node.get("anyOf")
        if not any(not _errors_for(value, o, where) for o in options):
            errors.append(f"{where}: matches none of the options")
        return
    kind = node.get("type")
    if kind and not isinstance(value, TYPES[kind]) or (kind in ("integer", "number") and isinstance(value, bool)):
        errors.append(f"{where}: expected {kind}, got {type(value).__name__} {str(value)[:40]}")
        return
    if "enum" in node and value not in node["enum"]:
        errors.append(f"{where}: {value!r} not in {node['enum']}")
    if kind == "array":
        for i, item in enumerate(value):
            _check(item, node.get("items", {}), f"{where}[{i}]", errors)
    if isinstance(value, dict) and ("properties" in node or "additionalProperties" in node):
        props = node.get("properties", {})
        for key in node.get("required", []):
            if key not in value:
                errors.append(f"{where}.{key}: required but missing")
        extra = node.get("additionalProperties")
        for key, item in value.items():
            if key in props:
                _check(item, props[key], f"{where}.{key}", errors)
            elif isinstance(extra, dict):
                _check(item, extra, f"{where}.{key}", errors)
            elif not extra:
                errors.append(f"{where}.{key}: not in the schema")


def _errors_for(value, node, where):
    errors = []
    _check(value, node, where, errors)
    return errors


def check_response(method, path, response):
    """Raise if a JSON response doesn't match its documented shape."""
    if response.status_code >= 400 or response.status_code == 204:
        return
    if "json" not in response.get("Content-Type", ""):
        return
    path = path.split("?")[0]
    for pattern, ops in _routes():
        if pattern.match(path):
            op = ops.get(method)
            break
    else:
        return
    if not op:
        return
    responses = op.get("responses", {})
    documented = responses.get(str(response.status_code)) or responses.get("200") or responses.get("201")
    schema = (documented or {}).get("content", {}).get("application/json", {}).get("schema")
    if schema is None:
        return
    errors = _errors_for(response.json(), schema, f"{method.upper()} {path}")
    assert not errors, "Response doesn't match openapi.yaml:\n  " + "\n  ".join(errors[:15])
