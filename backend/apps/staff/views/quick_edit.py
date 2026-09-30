from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods
from ..access import staff_data, model_admin, validate_parameters
from ..presentation import queryset_revision, form_data


@staff_data
@csrf_protect
@require_http_methods(["GET", "POST"])
@transaction.atomic
def quick_edit(request, app_label, model_name):
    ma = model_admin(request, app_label, model_name)
    if not ma.list_editable or not ma.has_change_permission(request):
        raise PermissionDenied
    ma.list_per_page = 25
    ma.show_full_result_count = False
    validate_parameters(request)
    cl = ma.get_changelist_instance(request)
    ids = [obj.pk for obj in cl.result_list]
    queryset = ma.get_queryset(request).filter(pk__in=ids)
    if request.method == "POST":
        queryset = queryset.select_for_update(of=("self",))
    revision = queryset_revision(queryset, ma.list_editable)
    if request.method == "POST" and request.POST.get("_revision") != revision:
        return JsonResponse({"message": "These records changed. Reload before saving quick edits."}, status=409)
    FormSet = ma.get_changelist_formset(request)
    formset = FormSet(request.POST if request.method == "POST" else None, request.FILES if request.method == "POST" else None, queryset=queryset)
    if request.method == "POST":
        expected = sorted(str(pk) for pk in ids)
        posted = sorted(request.POST.get(f"{formset.prefix}-{index}-{ma.opts.pk.name}", "") for index in range(len(ids)))
        if posted != expected or request.POST.get(f"{formset.prefix}-TOTAL_FORMS") != str(len(ids)):
            raise PermissionDenied
        for obj in queryset:
            if not ma.has_change_permission(request, obj):
                raise PermissionDenied
        if formset.is_valid():
            for form in formset.forms:
                if form.has_changed():
                    obj = ma.save_form(request, form, change=True)
                    ma.save_model(request, obj, form, change=True)
                    ma.save_related(request, form, formsets=[], change=True)
                    ma.log_change(request, obj, ma.construct_change_message(request, form, None))
            return {"saved": True}
    return JsonResponse({"name": str(ma.opts.verbose_name_plural), "revision": revision, "management": form_data(formset.management_form)["fields"], "errors": list(formset.non_form_errors()), "forms": [{**form_data(form), "label": str(form.instance)} for form in formset.forms]}, status=422 if request.method == "POST" else 200)

