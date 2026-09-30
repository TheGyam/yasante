from django.contrib import admin
from django.contrib.admin.options import IncorrectLookupParameters
from django.contrib.admin.utils import display_for_field, label_for_field, lookup_field
from django.core.exceptions import PermissionDenied, BadRequest
from django.utils.html import strip_tags
from django.views.decorators.http import require_GET
from ..access import staff_data, visible_admins, model_admin, workspace_url, validate_parameters


@staff_data
@require_GET
def records(request, app_label, model_name):
    key = f"{app_label}.{model_name}"
    ma = model_admin(request, app_label, model_name)
    if key not in visible_admins(request):
        raise PermissionDenied
    ma.list_per_page = 25
    ma.list_max_show_all = 0
    ma.show_full_result_count = False
    ma.show_facets = admin.ShowFacets.NEVER
    ma.list_select_related = tuple(
        field.name for field in ma.model._meta.fields if field.many_to_one or field.one_to_one
    )
    validate_parameters(request)
    cl = ma.get_changelist_instance(request)
    if cl.page_num > cl.paginator.num_pages:
        raise IncorrectLookupParameters
    columns = []
    ordering = cl.get_ordering_field_columns()
    for index, name in enumerate(cl.list_display):
        if name == "action_checkbox":
            continue
        label = label_for_field(name, ma.model, ma)
        sortable = name in cl.sortable_by and bool(cl.get_ordering_field(name))
        columns.append({"key": name, "label": str(label).capitalize(), "sort": index if sortable else None, "direction": ordering.get(index)})
    rows = []
    for obj in cl.result_list:
        if not ma.has_view_or_change_permission(request, obj):
            continue
        values = []
        for column in columns:
            field, attr, value = lookup_field(column["key"], obj, ma)
            if isinstance(value, bool):
                value = "Yes" if value else "No"
            elif field is not None:
                value = display_for_field(value, field, "—")
            values.append(strip_tags(str(value if value is not None else "—"))[:500])
        rows.append({"id": str(obj.pk), "values": values, "url": f"{workspace_url(key)}/{obj.pk}"})
    filters = []
    for spec in cl.filter_specs:
        choices = []
        for choice in spec.choices(cl):
            choices.append({"label": strip_tags(str(choice["display"])), "selected": choice["selected"], "query": choice["query_string"]})
        filters.append({"label": str(spec.title).capitalize(), "choices": choices})
    return {
        "name": str(ma.opts.verbose_name_plural).capitalize(), "columns": columns, "rows": rows,
        "count": cl.result_count, "page": cl.page_num, "pages": cl.paginator.num_pages,
        "searchable": bool(cl.search_fields), "filters": filters,
        "actions": [{"key": name, "label": str(description) % {"verbose_name_plural": ma.opts.verbose_name_plural}} for name, (_, _, description) in ma.get_actions(request).items()],
        "addUrl": f"{workspace_url(key)}/new" if ma.has_add_permission(request) else None,
        "quickEditable": bool(ma.list_editable and ma.has_change_permission(request)),
    }

