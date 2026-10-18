"""
Make the OpenAPI schema describe what the app actually receives: camelCase keys
(see renderers.py), and empty values left out, so nullable fields are optional.
The app's TypeScript types are generated from this schema (npm run api:types).
"""

import copy

from django.db import models
from rest_framework.fields import Field

from .renderers import _snake_to_camel


def optional(field):
    """A response field that can be empty, and so may be left out of the JSON."""
    # Rebuilt from its arguments: serializers deep-copy fields that way, so setting
    # attributes on the instance would be lost.
    # A list's child is copied too: the list has already bound it to itself.
    kwargs = {k: copy.deepcopy(v) if isinstance(v, Field) else v for k, v in field._kwargs.items()}
    return field.__class__(*field._args, **{**kwargs, "allow_null": True, "required": False})


def _walk(node, response):
    if isinstance(node, dict):
        props = node.get("properties")
        if isinstance(props, dict):
            optional = {k for k, v in props.items() if isinstance(v, dict) and v.get("nullable")}
            if response:
                # The renderer drops None, so a response field is never null: it's absent.
                for key in optional:
                    props[key].pop("nullable", None)
                for key, prop in props.items():
                    choices = prop.get("oneOf") if isinstance(prop, dict) else None
                    if choices and any(str(c.get("$ref", "")).endswith("/NullEnum") for c in choices):
                        optional.add(key)
                        rest = [c for c in choices if not str(c.get("$ref", "")).endswith("/NullEnum")]
                        del prop["oneOf"]
                        prop.update(rest[0] if len(rest) == 1 else {"oneOf": rest})
            node["properties"] = {_snake_to_camel(k): v for k, v in props.items()}
            if "required" in node:
                node["required"] = [_snake_to_camel(k) for k in node["required"] if k not in optional]
                if not node["required"]:
                    del node["required"]
        for value in node.values():
            _walk(value, response)
    elif isinstance(node, list):
        for value in node:
            _walk(value, response)


def camelize_schema(result, generator, request, public):
    for name, schema in result.get("components", {}).get("schemas", {}).items():
        # COMPONENT_SPLIT_REQUEST names what the app sends "...Request".
        _walk(schema, response=not name.endswith("Request"))
    _walk(result.get("paths", {}), response=False)
    return result


class BlankIsOptional:
    """
    For output-only model serializers: a model field that may be blank or null can be
    left out of the JSON (the renderer drops empty values), so say so in the schema.
    """

    def build_standard_field(self, field_name, model_field):
        cls, kwargs = super().build_standard_field(field_name, model_field)
        # Only what can really be empty on the wire: null, or blank text (the renderer
        # drops None and ""). Booleans with defaults and timestamps are always sent.
        blank_text = getattr(model_field, "blank", False) and isinstance(model_field, models.CharField | models.TextField)
        if kwargs.get("read_only"):
            pass  # read-only fields are always sent
        elif getattr(model_field, "null", False) or blank_text:
            kwargs["allow_null"] = True
            kwargs["required"] = False
        else:
            # Output only, so a default never applies: the field is always there.
            kwargs.pop("default", None)
            kwargs["required"] = True
        return cls, kwargs
