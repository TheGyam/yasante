import logging
from copy import copy
from functools import wraps

from django.apps import apps
from django.contrib import admin
from django.contrib.admin.options import IncorrectLookupParameters
from django.core.exceptions import BadRequest, PermissionDenied, SuspiciousOperation
from django.http import Http404, JsonResponse
from django.http.response import HttpResponseBase
from django.views.decorators.vary import vary_on_cookie

logger = logging.getLogger(__name__)


def staff_data(view):
    @vary_on_cookie
    @wraps(view)
    def guarded(request, *args, **kwargs):
        try:
            from .views.session import verified
            if not request.user.is_authenticated:
                return JsonResponse({"message": "Sign in with your staff account to continue."}, status=401)
            if not admin.site.has_permission(request) or not verified(request):
                return JsonResponse({"message": "Staff access and two-factor verification are required."}, status=403)
            result = view(request, *args, **kwargs)
            return result if isinstance(result, HttpResponseBase) else JsonResponse(result)
        except PermissionDenied:
            return JsonResponse({"message": "Your account does not have permission for this action."}, status=403)
        except Http404:
            return JsonResponse({"message": "These records could not be found."}, status=404)
        except (IncorrectLookupParameters, SuspiciousOperation, BadRequest):
            return JsonResponse({"message": "That search, filter, or page is not valid."}, status=400)
        except Exception:
            logger.exception("Staff request failed: %s", request.path)
            return JsonResponse({"message": "Something went wrong. It has been logged."}, status=500)
    return guarded


def validate_parameters(request):
    if any(key.startswith("_") or key == "all" for key in request.GET) or len(request.GET.get("q", "")) > 200:
        raise BadRequest
    for key in request.GET:
        if key == "p" or key.startswith("inline_"):
            try:
                valid = 1 <= int(request.GET[key]) <= 10000
            except (ValueError, TypeError):
                valid = False
            if not valid:
                raise BadRequest


def available_admins(request):
    for group in admin.site.get_app_list(request):
        for entry in group["models"]:
            model = entry["model"]
            yield model, admin.site.get_model_admin(model)


def visible_admins(request):
    return {model._meta.label_lower: ma for model, ma in available_admins(request) if ma.has_view_or_change_permission(request)}


def model_admin(request, app_label, model_name):
    from .presentation import WorkspacePresentation
    try:
        model = apps.get_model(app_label, model_name)
    except LookupError:
        raise Http404
    if not model or not admin.site.is_registered(model):
        raise Http404
    original = admin.site.get_model_admin(model)
    if not original.has_module_permission(request):
        raise PermissionDenied
    ma = copy(original)
    ma.__class__ = type("WorkspaceAdmin", (WorkspacePresentation, type(original)), {})
    ma.list_per_page = 25
    ma.list_max_show_all = 0
    ma.show_full_result_count = False
    return ma


def workspace_url(key):
    app, model = key.split(".")
    return f"/records/{app}/{model}"
