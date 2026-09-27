"""
Shelf models: Product (catalogue) and ShelfItem (user's shelf).
"""


from apps.common.domains import domain_field
from apps.common.models import TimeStampedModel
from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import models


class Product(TimeStampedModel):
    """The master product catalogue."""

    brand = models.CharField(max_length=150)
    name = models.CharField(max_length=150)
    CATEGORY_CHOICES = [
        ("shampoo", "Shampoo"),
        ("conditioner", "Conditioner"),
        ("leave-in", "Leave-in"),
        ("oil", "Oil"),
        ("styler", "Styler"),
        ("treatment", "Treatment"),
    ]
    category = models.CharField(max_length=100, choices=CATEGORY_CHOICES)
    domain = domain_field()
    # The number under the barcode (EAN-13, UPC-A and the like), once anyone has scanned it.
    barcode = models.CharField(max_length=14, null=True, blank=True, unique=True)
    description = models.TextField(max_length=2000, blank=True, default="")
    ingredients = models.TextField(max_length=2000, blank=True, default="")
    photo_uri = models.URLField(max_length=500, blank=True, default="")
    link = models.URLField(max_length=500, blank=True, default="")

    # Full-text search vector (brand + name + category)
    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        db_table = "shelf_product"
        ordering = ["brand", "name"]
        indexes = [
            GinIndex(fields=["search_vector"]),
        ]

    def __str__(self):
        return f"{self.brand} — {self.name}"


class ShelfItem(TimeStampedModel):
    """A product on a user's shelf."""

    STATUS_CHOICES = [
        ("using", "Currently using"),
        ("finished", "Finished"),
        ("repurchased", "Repurchased"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="shelf_items"
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="shelved_by"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="using")
    domain = domain_field()
    rating = models.PositiveSmallIntegerField(null=True, blank=True)  # 1-5
    review = models.TextField(max_length=500, blank=True, default="")
    times_bought = models.PositiveIntegerField(default=1)
    finished_at = models.DateTimeField(null=True, blank=True)

    # Snapshot of hair profile when rating was given
    hair_snapshot = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "shelf_shelf_item"
        ordering = ["-created_at"]
        unique_together = [("user", "product")]

    def __str__(self):
        return f"{self.product.name} on {self.user.name}'s shelf"
