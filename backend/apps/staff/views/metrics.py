from django.core.exceptions import PermissionDenied
from django.views.decorators.http import require_GET
from apps.common.metrics import metrics_context
from ..access import staff_data


@staff_data
@require_GET
def business_metrics(request):
    if not request.user.is_superuser:
        raise PermissionDenied
    return metrics_context()

