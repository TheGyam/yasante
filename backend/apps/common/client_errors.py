"""POST /api/client-errors/ — the app reports a crash or a stalled start-up."""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ClientError
from .throttling import ClientErrorThrottle


class ClientErrorSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["crash", "stall"], default="crash")
    message = serializers.CharField(max_length=2000)
    stack = serializers.CharField(required=False, allow_blank=True, max_length=20000)
    platform = serializers.CharField(required=False, allow_blank=True, max_length=20)
    os_version = serializers.CharField(required=False, allow_blank=True, max_length=40)
    app_version = serializers.CharField(required=False, allow_blank=True, max_length=40)
    context = serializers.DictField(required=False)


@extend_schema_view(post=extend_schema(request=ClientErrorSerializer, responses={204: None}))
class ClientErrorView(APIView):
    # Anyone: a crash can come before signing in, or be why signing in fails.
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ClientErrorThrottle]

    def post(self, request):
        body = ClientErrorSerializer(data=request.data)
        if not body.is_valid():
            return Response(status=204)
        data = body.validated_data
        ClientError.objects.create(
            user=request.user if request.user.is_authenticated else None,
            kind=data["kind"],
            message=data["message"][:500],
            stack=data.get("stack", ""),
            platform=data.get("platform", ""),
            os_version=data.get("os_version", ""),
            app_version=data.get("app_version", ""),
            context=data.get("context") or {},
        )
        return Response(status=204)
