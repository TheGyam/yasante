"""
User profile and analytics views.
"""

import logging

from apps.bookings.models import Booking
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AnalyticsEvent,
    ConsentRecord,
    HairProfile,
    HairProfileSnapshot,
)
from .serializers import (
    ConsentBatchSerializer,
    EventBatchSerializer,
    HairProfileSerializer,
    UserDetailSerializer,
    UserUpdateSerializer,
)
from .tasks import generate_data_export

logger = logging.getLogger(__name__)


class UserListView(APIView):
    """GET /api/users/ — returns the current user (array for compat)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response([UserDetailSerializer(request.user).data])


class UserDetailView(APIView):
    """GET / PATCH / DELETE /api/users/:id/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        # Her own account only: this carries email and phone. Others appear through
        # their public name and handle, never here. Same 404 either way, so an id
        # can't be probed for whether it exists.
        if str(request.user.pk) != str(pk):
            return Response(
                {"message": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(UserDetailSerializer(request.user).data)

    def patch(self, request, pk):
        if str(request.user.pk) != str(pk):
            return Response(
                {"message": "You can only edit your own profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = UserUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        user = request.user
        for field, value in serializer.validated_data.items():
            setattr(user, field, value)
        user.save(update_fields=list(serializer.validated_data.keys()) + ["updated_at"])

        return Response(UserDetailSerializer(user).data)

    def delete(self, request, pk):
        if str(request.user.pk) != str(pk):
            return Response(
                {"message": "You can only delete your own account."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = request.user

        with transaction.atomic():
            # Anonymise bookings (keep for stylist records)
            Booking.objects.filter(client=user).update(
                client_name="Deleted account",
            )

            # Delete everything else (cascading FKs handle most)
            user.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class HairProfileUpdateView(APIView):
    """
    PATCH /api/users/:id/hair-profile/

    Merges fields into the profile and creates an append-only snapshot.
    """

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        if str(request.user.pk) != str(pk):
            return Response(
                {"message": "You can only edit your own hair profile."},
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            profile, _ = HairProfile.objects.get_or_create(user=request.user)
            serializer = HairProfileSerializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()

            # Create append-only snapshot for growth tracking
            snapshot_data = {
                f.name: getattr(profile, f.name)
                for f in HairProfile._meta.get_fields()
                if f.name not in ("id", "user", "updated_at", "completed_at")
                and hasattr(f, "column")
            }
            HairProfileSnapshot.objects.create(user=request.user, **snapshot_data)

        return Response(HairProfileSerializer(profile).data)


class DataExportView(APIView):
    """POST /api/users/:id/export/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if str(request.user.pk) != str(pk):
            return Response(
                {"message": "You can only export your own data."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Queue async task (Celery)

        generate_data_export.delay(str(request.user.pk))

        return Response({"requested_at": timezone.now().isoformat()})





class ConsentBatchView(APIView):
    """POST /api/consents/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ConsentBatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        records = [
            ConsentRecord(
                user=request.user,
                purpose=c["purpose"],
                granted=c["granted"],
                policy_version=c["policy_version"],
                recorded_at=c["recorded_at"],
                source=c.get("source", "app"),
            )
            for c in serializer.validated_data["consents"]
        ]
        ConsentRecord.objects.bulk_create(records)
        return Response(status=status.HTTP_201_CREATED)


class EventBatchView(APIView):
    """
    POST /api/events/

    Drops events when analytics consent is withdrawn.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = EventBatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user if request.user.is_authenticated else None

        # Check analytics consent
        if user:
            latest_consent = (
                ConsentRecord.objects.filter(user=user, purpose="analytics")
                .order_by("-recorded_at")
                .first()
            )
            if latest_consent and not latest_consent.granted:
                # Consent withdrawn — drop events silently
                return Response(status=status.HTTP_202_ACCEPTED)

        def local_parts(text):
            # "2026-09-27T09:15:00" (with or without an offset) -> (weekday, hour).
            from datetime import datetime

            try:
                when = datetime.fromisoformat(text.replace("Z", "+00:00"))
                return when.isoweekday(), when.hour
            except (ValueError, AttributeError):
                return None, None

        events = []
        for e in serializer.validated_data["events"]:
            weekday, hour = local_parts(e.get("local_at", ""))
            events.append(
                AnalyticsEvent(
                    user=user,
                    anonymous_id=serializer.validated_data.get("anonymous_id", ""),
                    name=e["name"],
                    at=e["at"],
                    local_at=e.get("local_at", "")[:40],
                    local_weekday=weekday,
                    local_hour=hour,
                    # Small and flat: nothing nested, nothing huge.
                    properties={
                        str(k)[:40]: v
                        for k, v in list(e.get("properties", {}).items())[:20]
                        if v is None or isinstance(v, (str, int, float, bool))
                    },
                    app_version=e.get("app_version", "")[:30],
                )
            )
        AnalyticsEvent.objects.bulk_create(events)
        return Response(status=status.HTTP_201_CREATED)
