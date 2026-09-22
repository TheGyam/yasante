"""
Content views: Education library.
"""

import logging

from apps.common.pagination import CursorPagination
from apps.profiles.models import HairProfile
from django.db.models import Q
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ContentItem
from .serializers import ContentItemSerializer

logger = logging.getLogger(__name__)


class ContentListView(APIView):
    """GET /api/content/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = ContentItem.objects.filter(published=True)

        topic = request.query_params.get("topic")
        if topic:
            qs = qs.filter(topic_tags__contains=[topic])

        # "For You" matching logic based on hair profile
        for_you = request.query_params.get("for_you") == "true"
        if for_you:
            try:
                hp = request.user.hair_profile
                filters = Q()
                if hp.texture:
                    filters |= Q(texture_tags__contains=[hp.texture])
                if hp.porosity:
                    filters |= Q(porosity_tags__contains=[hp.porosity])
                if hp.goals:
                    filters |= Q(topic_tags__overlap=hp.goals)
                if filters:
                    qs = qs.filter(filters)
            except HairProfile.DoesNotExist:
                pass

        paginator = CursorPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        if page is not None:
            serializer = ContentItemSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        return Response(ContentItemSerializer(qs[:20], many=True).data)


class ContentDetailView(APIView):
    """GET /api/content/:slug/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        try:
            item = ContentItem.objects.get(slug=slug, published=True)
        except ContentItem.DoesNotExist:
            return Response({"message": "Content not found."}, status=404)

        return Response(ContentItemSerializer(item).data)
