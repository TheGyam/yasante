from django.urls import path
from .views import session, overview, records, forms, actions, quick_edit, metrics

urlpatterns = [
    path("session/", session.session),
    path("two-factor/", session.two_factor),
    path("two-factor/reset/<uuid:user_id>/", session.reset_factor),
    path("metrics/", metrics.business_metrics),
    path("overview/", overview.overview),
    path("records/<str:app_label>/<str:model_name>/", records.records),
    path("forms/<str:app_label>/<str:model_name>/", forms.record_form),
    path("forms/<str:app_label>/<str:model_name>/<str:object_id>/", forms.record_form),
    path("delete/<str:app_label>/<str:model_name>/<str:object_id>/", forms.delete_record),
    path("history/<str:app_label>/<str:model_name>/<str:object_id>/", forms.history),
    path("choices/<str:app_label>/<str:model_name>/", forms.choices),
    path("actions/<str:app_label>/<str:model_name>/", actions.action),
    path("quick-edit/<str:app_label>/<str:model_name>/", quick_edit.quick_edit),
    path("password/", forms.password),
    path("password/<str:app_label>/<str:model_name>/<str:object_id>/", forms.password),
]
