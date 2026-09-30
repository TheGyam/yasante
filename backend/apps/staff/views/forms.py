from django import forms
from django.contrib import admin
from django.contrib.admin.utils import quote
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm
from django.core.exceptions import PermissionDenied, ValidationError, BadRequest
from django.db import transaction
from django.db.models import Q
from django.http import Http404, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.debug import sensitive_post_parameters
from django.views.decorators.http import require_http_methods, require_GET
from ..access import staff_data, model_admin, workspace_url, validate_parameters
from ..presentation import Conflict, form_data, fingerprint
from ..audit import security_event


@staff_data
@csrf_protect
@sensitive_post_parameters()
@require_http_methods(["GET", "POST"])
def record_form(request, app_label, model_name, object_id=None):
    validate_parameters(request)
    ma = model_admin(request, app_label, model_name)
    if any(key.startswith("_") for key in request.GET):
        raise PermissionDenied
    try:
        response = ma.add_view(request) if object_id is None else ma.changeform_view(request, quote(object_id))
        return response
    except Conflict:
        return JsonResponse({"message": "This record changed since you opened it. Reload it before saving so you don’t overwrite someone else’s work."}, status=409)



@staff_data
@csrf_protect
@require_http_methods(["GET", "POST"])
def delete_record(request, app_label, model_name, object_id):
    ma = model_admin(request, app_label, model_name)
    try:
        return ma.delete_view(request, quote(object_id))
    except Conflict:
        return JsonResponse({"message": "This record changed. Review the deletion again before continuing."}, status=409)



@staff_data
@require_GET
def history(request, app_label, model_name, object_id):
    validate_parameters(request)
    ma = model_admin(request, app_label, model_name)
    response = ma.history_view(request, quote(object_id))
    context = response.context_data
    entries = context["action_list"]
    return {"name": str(context["object"]), "page": entries.number, "pages": entries.paginator.num_pages,
            "entries": [{"id": entry.pk, "at": entry.action_time.isoformat(), "actor": entry.user.name, "message": entry.get_change_message()} for entry in entries]}



@staff_data
@require_GET
def choices(request, app_label, model_name):
    ma = model_admin(request, app_label, model_name)
    obj = ma.get_object(request, request.GET["object"]) if request.GET.get("object") else None
    if not (ma.has_change_permission(request, obj) if obj else ma.has_add_permission(request)):
        raise PermissionDenied
    if request.GET.get("inline"):
        inline = next((inline for FormSet, inline in ma.get_formsets_with_inlines(request, obj) if FormSet.get_default_prefix() == request.GET["inline"]), None)
        if inline is None:
            raise Http404
        FormSet = inline.get_formset(request, obj)
        field = FormSet.form.base_fields.get(request.GET.get("field"))
    else:
        field = ma.get_form(request, obj, change=obj is not None).base_fields.get(request.GET.get("field"))
    if not isinstance(field, forms.ModelChoiceField):
        raise Http404
    queryset = field.queryset
    term = request.GET.get("q", "")[:200]
    related_admin = admin.site.get_model_admin(queryset.model) if admin.site.is_registered(queryset.model) else None
    if term and related_admin and related_admin.get_search_fields(request):
        queryset, duplicates = related_admin.get_search_results(request, queryset, term)
        if duplicates:
            queryset = queryset.distinct()
    elif term:
        names = [field.name for field in queryset.model._meta.fields if field.name in ("name", "title", "email", "code", "handle", "display_name", "text", "task")]
        if names:
            condition = Q()
            for name in names:
                condition |= Q(**{f"{name}__icontains": term})
            queryset = queryset.filter(condition)
        else:
            try:
                queryset = queryset.filter(pk=term)
            except (ValidationError, ValueError):
                queryset = queryset.none()
    validate_parameters(request)
    page = int(request.GET.get("p", "1"))
    objects = list(queryset.order_by("pk")[(page - 1) * 25:page * 25 + 1])
    related_url = workspace_url(queryset.model._meta.label_lower)
    return {"options": [{"value": str(field.prepare_value(obj)), "label": str(obj)} for obj in objects[:25]], "more": len(objects) > 25, "page": page,
            "addUrl": f"{related_url}/new" if related_admin and related_admin.has_add_permission(request) else None,
            "recordUrl": related_url if related_admin and related_admin.has_view_or_change_permission(request) else None}



@staff_data
@csrf_protect
@sensitive_post_parameters()
@require_http_methods(["GET", "POST"])
@transaction.atomic
def password(request, app_label=None, model_name=None, object_id=None):
    if object_id is None:
        user, Form = request.user, PasswordChangeForm
    else:
        ma = model_admin(request, app_label, model_name)
        if not hasattr(ma, "change_password_form"):
            raise Http404
        with transaction.atomic():
            try:
                user = ma.get_object(request, object_id)
            except Conflict:
                return JsonResponse({"message": "This account changed. Reload it before changing its password."}, status=409)
        if not ma.has_change_permission(request, user):
            raise PermissionDenied
        Form = ma.change_password_form
    with transaction.atomic():
        form = Form(user, request.POST if request.method == "POST" else None)
        if request.method == "POST" and form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)
            if object_id is not None:
                ma.log_change(request, user, "Password sign-in settings changed.")
            else:
                security_event(request, "Staff password changed", request.user)
            return {"saved": True}
    return JsonResponse({**form_data(form), "revision": fingerprint(user)}, status=422 if request.method == "POST" else 200)

