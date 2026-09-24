"""
Base models shared across all apps.
"""

import uuid

from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base with UUID pk and created/updated timestamps."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class SearchLog(models.Model):
    """
    Every search, with its filters and how many results came back: what people want
    that isn't there yet is the case for the next stylists to recruit.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    surface = models.CharField(max_length=20, db_index=True)  # looks, stylists, content
    query = models.CharField(max_length=200, blank=True, default="")
    filters = models.JSONField(default=dict, blank=True)
    result_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


def log_search(request, surface, query="", filters=None, result_count=0):
    """Record a search. Never lets logging break the search itself."""
    try:
        SearchLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            surface=surface,
            query=(query or "")[:200],
            filters={k: v for k, v in (filters or {}).items() if v},
            result_count=result_count,
        )
    except Exception:  # noqa: BLE001 - analytics must never fail a request
        pass
