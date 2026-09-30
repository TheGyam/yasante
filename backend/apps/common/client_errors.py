"""POST /api/client-errors/ — the app reports a crash or a stalled start-up."""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ClientError
from .error_reporting import record_error
from .throttling import ClientErrorThrottle


class ClientErrorSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["crash", "stall", "boot"], default="crash")
    message = serializers.CharField(max_length=2000)
    stack = serializers.CharField(required=False, allow_blank=True, max_length=20000)
    platform = serializers.CharField(required=False, allow_blank=True, max_length=20)
    os_version = serializers.CharField(required=False, allow_blank=True, max_length=40)
    app_version = serializers.CharField(required=False, allow_blank=True, max_length=40)
    context = serializers.DictField(required=False)


@extend_schema_view(post=extend_schema(request=ClientErrorSerializer, responses={204: None}), get=extend_schema(responses={200: None}))
class ClientErrorView(APIView):
    # Anyone: a crash can come before signing in, or be why signing in fails.
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ClientErrorThrottle]

    def post(self, request):
        body = ClientErrorSerializer(data=request.data)
        if not body.is_valid():
            return Response(status=204)
        data = body.validated_data
        record_error(
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

    def get(self, request):
        """
        GET /api/client-errors/ — the latest start-up checkpoints, to see how far a phone
        nobody here can plug in gets. Checkpoints only: nothing from crashes, nothing
        about who.
        """
        rows = ClientError.objects.filter(kind="boot").order_by("-created_at")[:60]
        return Response(
            [
                {
                    "at": r.created_at,
                    "checkpoint": r.message,
                    "platform": r.platform,
                    "os": r.os_version,
                    "app": r.app_version,
                    "launch": (r.context or {}).get("launch"),
                    "ms": (r.context or {}).get("ms"),
                }
                for r in rows
            ]
        )
