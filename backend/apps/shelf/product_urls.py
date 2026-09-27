"""Product URL routes — /api/products/"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.ProductSearchView.as_view(), name="product-search"),
    path("barcode/<str:code>/", views.ProductBarcodeView.as_view(), name="product-barcode"),
]
