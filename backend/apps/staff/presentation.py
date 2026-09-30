import hashlib
import json
from datetime import datetime
from django import forms
from django.db.models.expressions import BaseExpression
from django.http import Http404, JsonResponse
from django.core.exceptions import BadRequest
from django.utils import timezone
from django.utils.html import strip_tags
from .access import workspace_url, validate_parameters
from .names import field_label, model_name


class Conflict(Exception):
    pass



def queryset_revision(queryset, fields=()):
    return hashlib.sha256(json.dumps(list(queryset.order_by("pk").values_list("pk", *fields)), default=str).encode()).hexdigest()



def text(value):
    return strip_tags(str(value or ""))



def field_data(bound):
    field, widget = bound.field, bound.field.widget
    value = bound.value()
    if isinstance(value, BaseExpression):
        value = timezone.now()
    data = {
        "name": bound.html_name, "label": field_label(bound.label or bound.name),
        "help": text(bound.help_text), "errors": list(bound.errors),
        "required": field.required, "disabled": field.disabled,
        "kind": "text", "value": value if value is not None else "",
    }
    if widget.is_hidden:
        data["kind"] = "hidden"
    elif widget.__class__.__name__ == "ReadOnlyPasswordHashWidget":
        data.update(kind="readonly", value="Password is set" if value else "Password sign-in is disabled", help="Use Change password to set or disable password sign-in.")
    elif isinstance(widget, forms.PasswordInput):
        data.update(kind="password", value="")
    elif hasattr(field, "delimiter") and isinstance(getattr(field, "base_field", None), forms.ChoiceField):
        data.update(kind="array", value=value.split(field.delimiter) if isinstance(value, str) and value else value or [], delimiter=field.delimiter, options=[{"value": str(key), "label": str(label)} for key, label in field.base_field.choices])
    elif isinstance(field, forms.ModelChoiceField):
        multiple = isinstance(field, forms.ModelMultipleChoiceField)
        selected = list(value) if multiple and value else [value] if value not in (None, "") and not multiple else []
        key = field.to_field_name or "pk"
        selected_objects = field.queryset.filter(**{f"{key}__in": selected})
        data.update(kind="relation", multiple=multiple, value=[str(v) for v in selected] if multiple else str(value if value is not None else ""), options=[{"value": str(field.prepare_value(obj)), "label": str(obj)} for obj in selected_objects])
        if multiple:
            data["help"] = data["help"].split("Hold down", 1)[0].strip()
    elif isinstance(widget, forms.SplitDateTimeWidget):
        parts = widget.decompress(value) if not isinstance(value, (list, tuple)) else value
        data.update(kind="datetime", value=[str(parts[0] or ""), str(parts[1] or "")])
    elif isinstance(field, forms.DateTimeField):
        if isinstance(value, datetime):
            value = timezone.localtime(value) if timezone.is_aware(value) else value
            value = value.strftime("%Y-%m-%dT%H:%M:%S")
        data.update(kind="datetime-local", value=value or "")
    elif isinstance(widget, forms.CheckboxInput):
        data.update(kind="checkbox", value=bool(value))
    elif isinstance(widget, (forms.Select, forms.RadioSelect, forms.CheckboxSelectMultiple)):
        options = []
        for key, label in widget.choices:
            if isinstance(label, (list, tuple)):
                options.extend({"value": str(k), "label": f"{key}: {v}"} for k, v in label)
            else:
                options.append({"value": str(key), "label": str(label)})
        data.update(kind="select", options=options, multiple=isinstance(widget, (forms.SelectMultiple, forms.CheckboxSelectMultiple)))
    elif isinstance(widget, forms.Textarea):
        data["kind"] = "textarea"
    elif isinstance(field, forms.FileField):
        data.update(kind="file", value=str(value or ""), clearable=not field.required)
    elif isinstance(field, (forms.IntegerField, forms.DecimalField, forms.FloatField)):
        data.update(kind="number", step="1" if isinstance(field, forms.IntegerField) else "any", min=field.min_value, max=field.max_value)
    elif isinstance(field, forms.EmailField):
        data["kind"] = "email"
    elif isinstance(field, forms.URLField):
        data["kind"] = "url"
    elif isinstance(field, forms.DateField):
        data["kind"] = "date"
    elif isinstance(field, forms.TimeField):
        data["kind"] = "time"
    data["maxLength"] = getattr(field, "max_length", None)
    # Never serialize password or challenge hashes, including view-only admin fields.
    if bound.name in ("password", "code_hash") and data["kind"] != "password":
        data.update(kind="readonly", value="Protected credential")
    return data



def form_data(form, admin_form=None):
    if admin_form is None:
        return {"fields": [field_data(field) for field in form], "errors": list(form.non_field_errors())}
    sections = []
    for section in admin_form:
        fields = []
        for line in section:
            for admin_field in line:
                if admin_field.is_readonly:
                    item = admin_field.field
                    fields.append({"name": item["name"], "label": field_label(item["label"]), "help": text(item["help_text"]), "kind": "readonly", "value": "Protected credential" if item["name"] in ("password", "code_hash") else text(admin_field.contents()), "errors": []})
                else:
                    fields.append(field_data(admin_field.field))
        sections.append({"name": section.name or "Details", "description": text(section.description), "fields": fields})
    present = {field["name"] for section in sections for field in section["fields"]}
    hidden = [field_data(field) for field in form.hidden_fields() if field.html_name not in present]
    if hidden:
        sections.append({"name": "", "description": "", "fields": hidden})
    return {"sections": sections, "errors": list(form.non_field_errors())}



def fingerprint(obj):
    if obj is None:
        return ""
    values = {field.attname: getattr(obj, field.attname) for field in obj._meta.concrete_fields}
    for field in obj._meta.many_to_many:
        values[field.name] = sorted(str(pk) for pk in getattr(obj, field.name).values_list("pk", flat=True))
    return hashlib.sha256(json.dumps(values, sort_keys=True, default=str).encode()).hexdigest()



def mask_personal_fields(request, model, obj, payload):
    """Addresses, postcodes and phone numbers arrive hidden; Show fetches them, logged."""
    from .privacy import can_reveal, masked_fields

    hidden = masked_fields(model)
    for section in payload.get("sections", []):
        for field in section["fields"]:
            # A value just typed and sent back (a form with errors) stays as typed.
            if field["name"] in hidden and not (request.method == "POST" and field["name"] in request.POST):
                field.update(
                    masked=True,
                    hasValue=bool(field.get("value")),
                    value="",
                    canReveal=can_reveal(request.user),
                    revealPath=f"reveal/{model._meta.app_label}/{model._meta.model_name}/{obj.pk}/{field['name']}/",
                )


class WorkspacePresentation:
    def get_formset_kwargs(self, request, obj, inline, prefix):
        kwargs = super().get_formset_kwargs(request, obj, inline, prefix)
        FormSet = inline.get_formset(request, obj)
        queryset = kwargs["queryset"].filter(**{FormSet.fk.name: obj}) if obj.pk else kwargs["queryset"].none()
        count = queryset.count()
        validate_parameters(request)
        page = int(request.GET.get(f"inline_{prefix}", "1"))
        if page > max(1, (count + 24) // 25):
            raise BadRequest
        selected = queryset.order_by("pk").values_list("pk", flat=True)[(page - 1) * 25:page * 25]
        queryset = queryset.filter(pk__in=selected).order_by("pk")
        if request.method == "POST":
            queryset = queryset.select_for_update(of=("self",))
        fields = [field.name for field in queryset.model._meta.concrete_fields if field.name in FormSet.form.base_fields and field.name != FormSet.fk.name]
        version = hashlib.sha256(json.dumps([count, queryset_revision(queryset, fields)], default=str).encode()).hexdigest()
        if request.method == "POST" and request.POST.get(f"{prefix}-_revision") != version:
            raise Conflict
        if not hasattr(self, "workspace_inlines"):
            self.workspace_inlines = {}
        self.workspace_inlines[prefix] = {"revision": version, "page": page, "pages": max(1, (count + 24) // 25), "count": count}
        kwargs["queryset"] = queryset
        return kwargs

    def get_object(self, request, object_id, from_field=None):
        self.workspace_lock_object = request.method == "POST"
        try:
            obj = super().get_object(request, object_id, from_field)
        finally:
            self.workspace_lock_object = False
        if obj is None:
            raise Http404
        self.workspace_revision = fingerprint(obj)
        if request.method == "POST" and request.POST.get("_revision") != self.workspace_revision:
            raise Conflict
        return obj

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_for_update(of=("self",)) if getattr(self, "workspace_lock_object", False) else queryset

    def render_change_form(self, request, context, add=False, change=False, form_url="", obj=None):
        admin_form = context["adminform"]
        editable = self.has_add_permission(request) if add else self.has_change_permission(request, obj)
        inlines = []
        for inline in context["inline_admin_formsets"]:
            formset = inline.formset
            paging = self.workspace_inlines[formset.prefix]
            inlines.append({
                **paging,
                "prefix": formset.prefix, "name": str(inline.opts.verbose_name_plural),
                "management": form_data(formset.management_form)["fields"] + [{"name": f"{formset.prefix}-_revision", "kind": "hidden", "value": paging["revision"], "label": "", "errors": []}],
                "forms": [{**form_data(item.form, item), "id": str(item.form.instance.pk or ""), "canDelete": inline.has_delete_permission and item.form.instance.pk is not None} for item in inline if item.form.prefix != f"{formset.prefix}-__prefix__"],
                "empty": form_data(formset.empty_form), "errors": list(formset.non_form_errors()),
                "canAdd": inline.has_add_permission and paging["count"] < formset.max_num, "max": formset.max_num,
            })
        payload = {
            "name": model_name(self.model)["name"], "singular": model_name(self.model)["singular"], "title": str(obj) if obj else f"New {self.opts.verbose_name}", "object": str(obj) if obj else f"New {self.opts.verbose_name}",
            "id": str(obj.pk) if obj else None, "revision": getattr(self, "workspace_revision", ""),
            **form_data(admin_form.form, admin_form), "inlines": inlines,
            "editable": editable, "canDelete": bool(obj and self.has_delete_permission(request, obj)),
            "canSaveAs": bool(obj and self.save_as and self.has_add_permission(request)),
            "password": bool(obj and hasattr(self, "change_password_form") and editable),
            "canResetTwoFactor": bool(obj and self.opts.label_lower == "accounts.user" and obj.is_staff and request.user.is_superuser),
        }
        # AdminForm stores bound field objects here; only send field names.
        payload["prepopulated"] = self.get_prepopulated_fields(request, obj) if editable else {}
        if obj is not None:
            mask_personal_fields(request, self.model, obj, payload)
        return JsonResponse(payload, status=422 if request.method == "POST" else 200)

    def response_add(self, request, obj, **kwargs):
        return JsonResponse({"saved": True, "id": str(obj.pk), "url": f"{workspace_url(self.opts.label_lower)}/{obj.pk}"})

    def response_change(self, request, obj):
        return self.response_add(request, obj)

    def render_delete_form(self, request, context):
        return JsonResponse(deletion_data(self, request, [context["object"]], self.workspace_revision))

    def response_delete(self, request, obj_display, obj_id):
        return JsonResponse({"deleted": True, "url": workspace_url(self.opts.label_lower)})



def deletion_data(ma, request, objects, revision=""):
    deleted, counts, permissions, protected = ma.get_deleted_objects(objects, request)
    def plain(items):
        return [plain(item) if isinstance(item, list) else text(item) for item in items]
    return {"objects": plain(deleted), "counts": {str(key): value for key, value in counts.items()}, "permissions": sorted(str(p) for p in permissions), "protected": [str(obj) for obj in protected], "revision": revision, "canDelete": not permissions and not protected}



