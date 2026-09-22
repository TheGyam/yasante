"""Device token URL routes — /api/devices/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.DeviceTokenCreateView.as_view(), name="device-create"),
    path("<uuid:pk>/", views.DeviceTokenDeleteView.as_view(), name="device-delete"),
]
