import csv
from urllib.parse import urlencode

from django.contrib.admin.utils import label_for_field, lookup_field
from django.core.exceptions import BadRequest, PermissionDenied
from django.http import Http404, HttpResponse, JsonResponse
from django.views.decorators.http import require_GET

from ..access import staff_data, visible_admins, model_admin, workspace_url, validate_parameters
from ..names import field_label, model_name as friendly

SEARCH_MODELS = ("accounts.user", "stylists.stylistprofile", "bookings.booking", "looks.look", "accounts.invite", "shelf.product")


@staff_data
@require_GET
def search(request):
    validate_parameters(request)
    term = request.GET.get("q", "").strip()
    if not term:
        return {"groups": []}
    admins = visible_admins(request)

    def find(key):
        ma = admins[key]
        rows, duplicates = ma.get_search_results(request, ma.get_queryset(request), term)
        if duplicates:
            rows = rows.distinct()
        names = friendly(ma.model)
        return {"name": names["name"], "items": [
            {"name": str(obj), "subtitle": names["name"], "url": f"{workspace_url(key)}/{obj.pk}", "icon": names["icon"]}
            for obj in rows.order_by("pk")[:5] if ma.has_view_or_change_permission(request, obj)]}

    # Six small indexed queries: sequential is fast enough and keeps one connection.
    groups = [find(key) for key in SEARCH_MODELS if key in admins]
    return {"groups": [group for group in groups if group["items"]]}


@staff_data
@require_GET
def related(request, app_label, model_name, object_id):
    ma = model_admin(request, app_label, model_name)
    obj = ma.get_object(request, object_id)
    if obj is None:
        raise Http404
    if not ma.has_view_or_change_permission(request, obj):
        raise PermissionDenied
    admins = visible_admins(request)
    links = []
    for relation in obj._meta.get_fields():
        if not relation.auto_created or relation.concrete or not relation.is_relation:
            continue
        other = admins.get(relation.related_model._meta.label_lower)
        if not other:
            continue
        lookup = f"{relation.field.name}__exact"
        if not other.lookup_allowed(lookup, str(obj.pk), request):
            continue
        count = other.get_queryset(request).filter(**{lookup: obj.pk}).distinct().count()
        if not count:
            continue
        links.append({"name": friendly(other.model)["name"], "relation": relation.field.name,
                      "count": count, "url": workspace_url(other.opts.label_lower) + "?" + urlencode({lookup: str(obj.pk)})})
    return {"items": links}


@staff_data
@require_GET
def export_csv(request, app_label, model_name):
    validate_parameters(request)
    ma = model_admin(request, app_label, model_name)
    if not ma.has_view_or_change_permission(request):
        raise PermissionDenied
    cl = ma.get_changelist_instance(request)
    if cl.queryset.count() > 5000:
        return JsonResponse({"message": "Exports are limited to 5,000 rows. Narrow your filters first."}, status=400)
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{model_name}.csv"'
    writer = csv.writer(response)
    fields = [name for name in cl.list_display if name != "action_checkbox"]
    writer.writerow([field_label(label_for_field(name, ma.model, ma)) for name in fields])
    for obj in cl.queryset.iterator(chunk_size=500):
        if not ma.has_view_or_change_permission(request, obj):
            continue
        values = [str(lookup_field(name, obj, ma)[2] or "") for name in fields]
        writer.writerow(["'" + value if value.startswith(("=", "+", "-", "@", "\t", "\r")) else value for value in values])
    return response
