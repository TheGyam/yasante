"""POST /api/waitlist/ — the waitlist form on yasante.com."""

from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import WaitlistEntry


class WaitlistRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    role = serializers.ChoiceField(choices=["client", "stylist"], default="client")
    area = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    # Where they came from: a stylist's page, a campaign.
    source = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    # A field people never see. Bots fill in every field; anything here is one.
    website = serializers.CharField(required=False, allow_blank=True, default="")


class WaitlistView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_scope = "waitlist"

    @extend_schema(request=WaitlistRequestSerializer, responses={201: None})
    def post(self, request):
        body = WaitlistRequestSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        data = body.validated_data
        if not data["website"]:
            # Already on it: the same answer, so nobody learns who signed up.
            WaitlistEntry.objects.get_or_create(
                email=data["email"].strip().lower(),
                defaults={
                    "role": data["role"],
                    "area": data["area"].strip(),
                    "source": data["source"].strip(),
                },
            )
        return Response(status=status.HTTP_201_CREATED)
