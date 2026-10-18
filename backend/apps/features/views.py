"""GET /api/features/ — which switches are on, for whoever's asking."""

from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from .switches import features_for


class FeaturesResponseSerializer(serializers.Serializer):
    features = serializers.DictField(child=serializers.BooleanField())


class FeaturesView(APIView):
    """Open to everyone: the app needs this before sign-in decides anything."""

    permission_classes = [permissions.AllowAny]
    # The default renderer camel-cases every dict key; a switch's key is a slug
    # (multi_photo_looks) the admin and the app must agree on, so this stays plain.
    renderer_classes = [JSONRenderer]

    @extend_schema(responses=FeaturesResponseSerializer)
    def get(self, request):
        response = Response({"features": features_for(request.user)})
        response["Cache-Control"] = "private, max-age=60"
        response["Vary"] = "Authorization"
        return response
