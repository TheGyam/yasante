from collections import OrderedDict

from rest_framework.pagination import CursorPagination as BaseCursorPagination
from rest_framework.response import Response

"""
Cursor-based pagination matching the frontend's { data, nextCursor } contract.

Opaque cursors, limit capped at 50, default 20.
"""


from urllib.parse import parse_qs, urlparse

class CursorPagination(BaseCursorPagination):
    """
    Cursor pagination returning { data: [...], nextCursor: "..." }.

    The cursor is opaque to the client.  Ordering is always by the
    model's default ordering (usually -created_at).
    """

    page_size = 20
    page_size_query_param = "limit"
    max_page_size = 50
    ordering = "-created_at"
    cursor_query_param = "cursor"

    def get_paginated_response(self, data):
        next_link = self.get_next_link()
        next_cursor = None

        if next_link:
            # Extract cursor param from the full URL

            parsed = urlparse(next_link)
            qs = parse_qs(parsed.query)
            next_cursor = qs.get(self.cursor_query_param, [None])[0]

        return Response(
            OrderedDict(
                [
                    ("data", data),
                    ("nextCursor", next_cursor),
                ]
            )
        )

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "required": ["data"],
            "properties": {
                "data": schema,
                "nextCursor": {
                    "type": "string",
                    "nullable": True,
                },
            },
        }


class NoPagination:
    """Disable pagination for endpoints that return a fixed list."""

    display_page_controls = False

    def paginate_queryset(self, queryset, request, view=None):
        return None

    def get_paginated_response(self, data):
        return Response(data)


def keyset_page(qs, request, newest_first=True, default=20):
    """
    One page of `qs` by (created_at, id), newest or oldest first.

    Keyset pagination: each page starts right after the last item seen, so it stays
    fast however deep someone scrolls and never skips or repeats an item when new
    ones arrive. Returns (items, next_cursor); the cursor is opaque to the app.
    """
    import base64
    import uuid as _uuid

    from apps.common.timeparse import parse_iso
    from django.db.models import Q

    try:
        limit = max(1, min(int(request.query_params.get("limit", default)), 50))
    except (TypeError, ValueError):
        limit = default

    cursor = request.query_params.get("cursor")
    if cursor:
        try:
            at_text, id_text = base64.urlsafe_b64decode(cursor.encode()).decode().split("|")
            at, last_id = parse_iso(at_text), _uuid.UUID(id_text)
            if newest_first:
                qs = qs.filter(Q(created_at__lt=at) | Q(created_at=at, pk__lt=last_id))
            else:
                qs = qs.filter(Q(created_at__gt=at) | Q(created_at=at, pk__gt=last_id))
        except (ValueError, TypeError):
            pass  # A bad cursor starts from the top rather than failing.

    order = ("-created_at", "-pk") if newest_first else ("created_at", "pk")
    items = list(qs.order_by(*order)[: limit + 1])
    next_cursor = None
    if len(items) > limit:
        items = items[:limit]
        last = items[-1]
        next_cursor = base64.urlsafe_b64encode(
            f"{last.created_at.isoformat()}|{last.pk}".encode()
        ).decode()
    return items, next_cursor
