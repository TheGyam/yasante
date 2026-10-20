"""
The education library and favourites, on the paths and shapes the app already
calls: /api/content/content/… and /api/favorites/favorites/….
"""

from django.db.models import Case, IntegerField, Q, Value, When
from apps.common.models import log_search
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ContentItem, Favorite
from .serializers import (
    ContentResponseSerializer,
    FavoriteResponseSerializer,
    FavoriteStateSerializer,
    FavoriteToggleRequestSerializer,
)


TOPICS = {t for t, _ in ContentItem.TOPIC_CHOICES}


def present_content(c):
    return {
        "id": str(c.pk),
        "title": c.title,
        "description": c.description or (c.body.split("\n\n")[0][:200] if c.body else ""),
        "type": c.kind,
        # The first tag the app knows; anything else reads as a tip.
        "topic": next((t for t in c.topic_tags if t in TOPICS), "tips"),
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


def _for_her_hair(qs, viewer):
    """
    With her yes to using hair details: articles tagged for both her texture and her
    porosity first, then either, then the rest, newest first within each.
    """
    from apps.profiles.models import HairProfile, has_consent

    if viewer is None or not viewer.is_authenticated or not has_consent(viewer, "personalisation"):
        return qs
    hair = HairProfile.objects.filter(user=viewer).values("texture", "porosity").first() or {}
    fits = [
        Case(When(**{f"{field}__contains": [hair[key]]}, then=Value(1)), default=Value(0), output_field=IntegerField())
        for key, field in (("texture", "texture_tags"), ("porosity", "porosity_tags"))
        if hair.get(key)
    ]
    if not fits:
        return qs
    return qs.annotate(fit=sum(fits[1:], fits[0])).order_by("-fit", "-created_at")


@extend_schema_view(get=extend_schema(responses=ContentResponseSerializer(many=True)))
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
        else:
            qs = _for_her_hair(qs, request.user)
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


@extend_schema_view(get=extend_schema(responses=ContentResponseSerializer))
class ContentDetailView(APIView):
    """GET /api/content/content/:id/"""

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        item = _published().filter(pk=pk).first()
        if item is None:
            return Response({"message": "That article is gone"}, status=404)
        return Response(present_content(item))


@extend_schema_view(get=extend_schema(responses=serializers.ListSerializer(child=serializers.DictField())))
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


@extend_schema_view(get=extend_schema(responses=FavoriteResponseSerializer(many=True)))
class FavoriteListView(APIView):
    """GET /api/favorites/favorites/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(
            [present_favorite(f) for f in Favorite.objects.filter(user=request.user)]
        )


@extend_schema_view(get=extend_schema(responses=FavoriteStateSerializer))
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


@extend_schema_view(post=extend_schema(request=FavoriteToggleRequestSerializer, responses=FavoriteStateSerializer))
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


class TipSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    text = serializers.CharField()


@extend_schema_view(get=extend_schema(responses=TipSerializer(many=True)))
class TipListView(APIView):
    """GET /api/tips/ — the tips the home screen rotates through, one a day. Public."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        from .models import Tip

        tips = [{"id": t.id, "text": t.text} for t in Tip.objects.filter(active=True)]
        response = Response(tips)
        # The same for everyone and slow to change.
        response["Cache-Control"] = "public, max-age=3600"
        return response
