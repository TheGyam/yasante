"""
The education library and favourites, on the paths and shapes the app already
calls: /api/content/content/… and /api/favorites/favorites/….
"""

from django.db.models import Q
from apps.common.models import log_search
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ContentItem, Favorite


def present_content(c):
    return {
        "id": str(c.pk),
        "title": c.title,
        "description": c.description or (c.body.split("\n\n")[0][:200] if c.body else ""),
        "type": c.kind,
        "topic": (c.topic_tags or ["tips"])[0],
        "hair_types": c.texture_tags or [],
        "thumbnail_uri": c.cover_uri or None,
        "video_uri": c.video_uri or None,
        "article_content": c.body or None,
        "duration": c.read_time_minutes,
        "author": c.author or None,
        "published_at": c.created_at,
    }


def _published():
    return ContentItem.objects.filter(published=True).order_by("-created_at")


class ContentListView(APIView):
    """GET /api/content/content/?topic=&type=&search= — the library, newest first."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = _published()
        topic = request.query_params.get("topic")
        if topic:
            qs = qs.filter(topic_tags__contains=[topic])
        kind = request.query_params.get("type")
        if kind:
            qs = qs.filter(kind=kind)
        search = request.query_params.get("search") or request.query_params.get("q")
        if search:
            for word in search.split():
                qs = qs.filter(
                    Q(title__icontains=word)
                    | Q(description__icontains=word)
                    | Q(body__icontains=word)
                )
        # Paged on the server (?limit=&offset=), never the whole library at once.
        try:
            limit = max(1, min(int(request.query_params.get("limit", 20)), 50))
            offset = max(0, int(request.query_params.get("offset", 0)))
        except ValueError:
            limit, offset = 20, 0
        items = list(qs[offset : offset + limit])
        if (search or topic or kind) and not offset:
            log_search(request, "content", search or "", {"topic": topic, "type": kind}, len(items))
        return Response([present_content(c) for c in items])


class ContentSearchView(ContentListView):
    """GET /api/content/content/search/?q="""


class ContentDetailView(APIView):
    """GET /api/content/content/:id/"""

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        item = _published().filter(pk=pk).first()
        if item is None:
            return Response({"message": "That article is gone"}, status=404)
        return Response(present_content(item))


class ContentProductsView(APIView):
    """GET /api/content/content/:id/products/ — none are linked yet."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        return Response([])


def present_favorite(f):
    return {
        "id": str(f.pk),
        "user_id": str(f.user_id),
        "content_id": str(f.content_id),
        "created_at": f.created_at,
    }


class FavoriteListView(APIView):
    """GET /api/favorites/favorites/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(
            [present_favorite(f) for f in Favorite.objects.filter(user=request.user)]
        )


class FavoriteCheckView(APIView):
    """GET /api/favorites/favorites/check/?contentId="""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        content_id = request.query_params.get("contentId") or request.query_params.get(
            "content_id"
        )
        try:
            favorited = Favorite.objects.filter(user=request.user, content_id=content_id).exists()
        except Exception:  # not a valid id
            favorited = False
        return Response({"is_favorite": favorited})


class FavoriteToggleView(APIView):
    """POST /api/favorites/favorites/toggle/ — { contentId }"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        content_id = request.data.get("content_id")
        try:
            content = ContentItem.objects.filter(pk=content_id, published=True).first()
        except Exception:
            content = None
        if content is None:
            return Response({"message": "That article is gone"}, status=404)
        existing = Favorite.objects.filter(user=request.user, content=content).first()
        if existing:
            existing.delete()
            return Response({"is_favorite": False})
        favorite = Favorite.objects.create(user=request.user, content=content)
        return Response(
            {"is_favorite": True, "favorite": present_favorite(favorite)},
            status=status.HTTP_200_OK,
        )
