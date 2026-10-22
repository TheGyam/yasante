from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.features.switches import is_on

from .models import SWITCH, FeedEvent
from .serializers import FeedEventBatchSerializer


@extend_schema_view(post=extend_schema(request=FeedEventBatchSerializer, responses={201: None, 202: None}))
class FeedEventBatchView(APIView):
    """
    POST /api/feed/events/

    What she saw and opened in the feed. Kept only while the ranked feed is on for her;
    otherwise accepted and dropped, so an app that sends them never sees an error.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = FeedEventBatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not is_on(SWITCH, request.user):
            return Response(status=status.HTTP_202_ACCEPTED)

        from apps.looks.models import Look

        from .sessions import features_shown

        events = serializer.validated_data["events"]
        known = set(Look.objects.filter(pk__in={e["look_id"] for e in events}).values_list("pk", flat=True))
        # What the ranking knew about each look it showed, for learning the weights.
        shown = features_shown({e["session"] for e in events if e["kind"] == "impression"})
        user = request.user if request.user.is_authenticated else None
        FeedEvent.objects.bulk_create(
            [
                FeedEvent(
                    user=user,
                    session=e["session"],
                    look_id=e["look_id"],
                    kind=e["kind"],
                    surface=e["surface"],
                    position=e.get("position"),
                    source=e["source"],
                    dwell_ms=e.get("ms") if e["kind"] == "dwell" else None,
                    features=shown.get((e["session"], str(e["look_id"])), {}) if e["kind"] == "impression" else {},
                )
                for e in events
                if e["look_id"] in known
            ],
            # A look seen again in the same scroll is already counted.
            ignore_conflicts=True,
        )
        return Response(status=status.HTTP_201_CREATED)
