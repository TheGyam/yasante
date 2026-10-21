import json

from django.core.exceptions import PermissionDenied
from django.http import Http404
from django.views.decorators.http import require_GET

from ..access import model_admin, staff_data
from ..privacy import can_reveal, log_access, masked_fields


@staff_data
@require_GET
def reveal(request, app_label, model_name, object_id, field):
    """One hidden value, for someone allowed to see it, written to the activity trail."""
    ma = model_admin(request, app_label, model_name)
    if field not in masked_fields(ma.model):
        raise Http404
    obj = ma.get_queryset(request).filter(pk=object_id).first()
    if obj is None:
        raise Http404
    if not (can_reveal(request.user) and ma.has_view_or_change_permission(request, obj)):
        raise PermissionDenied
    log_access(request, ma.model, f"Viewed {ma.model._meta.get_field(field).verbose_name}", obj)
    value = getattr(obj, field)
    # A list stays a list for a multiple choice; anything else structured is shown as text.
    return {"value": json.dumps(value) if isinstance(value, dict) else value or ""}
