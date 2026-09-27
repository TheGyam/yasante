"""
User profile and analytics views.
"""

import logging

from apps.bookings.models import Booking
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AnalyticsEvent,
    ConsentRecord,
    HairProfile,
    HairProfileSnapshot,
    PolicyDocument,
)
from .serializers import (
    UsernameCheckSerializer,
    HairLogRequestSerializer,
    HairLogSerializer,
    ConsentBatchSerializer,
    DataExportResponseSerializer,
    EventBatchSerializer,
    HairProfileRequestSerializer,
    HairProfileResponseSerializer,
    HairProfileSerializer,
    PolicySerializer,
    UserDetailResponseSerializer,
    UserDetailSerializer,
    UserUpdateSerializer,
)
from .tasks import generate_data_export

logger = logging.getLogger(__name__)


@extend_schema_view(get=extend_schema(responses=UserDetailResponseSerializer(many=True)))
class UserListView(APIView):
    """GET /api/users/ — returns the current user (array for compat)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response([UserDetailSerializer(request.user).data])


@extend_schema_view(get=extend_schema(responses=UserDetailResponseSerializer), patch=extend_schema(request=UserUpdateSerializer, responses=UserDetailResponseSerializer), delete=extend_schema(responses={204: None}))
class UserDetailView(APIView):
    """GET / PATCH / DELETE /api/users/:id/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        # Her own account only: this carries email and phone. Others appear through
        # their public name and handle, never here. Same 404 either way, so an id
        # can't be probed for whether it exists.
        if str(request.user.pk) != str(pk):
            return Response(
                {"message": "We couldn’t find that account."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(UserDetailSerializer(request.user).data)

    def patch(self, request, pk):
        if str(request.user.pk) != str(pk):
            return Response(
                {"message": "You can only edit your own profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = UserUpdateSerializer(
            data=request.data, partial=True, context={"user": request.user}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        changes = dict(serializer.validated_data)
        # A new address has to be proved again, with a code sent to it.
        if "email" in changes and changes["email"] != user.email.lower():
            changes["email_verified"] = False
        for field, value in changes.items():
            setattr(user, field, value)
        user.save(update_fields=list(changes.keys()) + ["updated_at"])
        # One photo: a stylist's page wears the same one as their account.
        if "avatar_uri" in changes:
            from apps.stylists.models import StylistProfile

            StylistProfile.objects.filter(account=user).update(avatar_uri=changes["avatar_uri"])

        return Response(UserDetailSerializer(user).data)

    def delete(self, request, pk):
        if str(request.user.pk) != str(pk):
            return Response(
                {"message": "You can only delete your own account."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = request.user
        from apps.accounts.social import revoke_apple

        revoke_apple(user)

        with transaction.atomic():
            # Anonymise bookings (keep for stylist records)
            Booking.objects.filter(client=user).update(
                client_name="Deleted account",
            )

            # Delete everything else (cascading FKs handle most)
            user.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(patch=extend_schema(request=HairProfileRequestSerializer, responses=HairProfileResponseSerializer))
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


@extend_schema_view(post=extend_schema(request=None, responses=DataExportResponseSerializer))
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





@extend_schema_view(post=extend_schema(request=ConsentBatchSerializer, responses={201: None}))
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


@extend_schema_view(post=extend_schema(request=EventBatchSerializer, responses={201: None, 202: None}))
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

        from apps.common.timeparse import local_parts

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



def present_policy(doc):
    return {
        "type": doc.type,
        "version": doc.version,
        "title": doc.title,
        "effective_at": doc.effective_at,
        "body": doc.body,
    }


@extend_schema_view(get=extend_schema(responses=PolicySerializer(many=True)))
class PolicyListView(APIView):
    """GET /api/policies/ — the current version of each published policy."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        current = [PolicyDocument.current(t) for t, _ in PolicyDocument.TYPE_CHOICES]
        return Response([present_policy(d) for d in current if d])


@extend_schema_view(get=extend_schema(responses=PolicySerializer))
class PolicyDetailView(APIView):
    """GET /api/policies/:type/?version= — the current one, or a named version."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, type):
        version = request.query_params.get("version")
        doc = (
            PolicyDocument.objects.filter(type=type, version=version, published=True).first()
            if version
            else PolicyDocument.current(type)
        )
        if doc is None:
            return Response({"message": "Not published yet"}, status=404)
        return Response(present_policy(doc))



def present_hair_log(entry):
    return {
        "id": str(entry.pk),
        "kind": entry.kind,
        "at": entry.at,
        "booking_id": str(entry.booking_id) if entry.booking_id else None,
    }


@extend_schema_view(
    get=extend_schema(responses=HairLogSerializer(many=True)),
    post=extend_schema(request=HairLogRequestSerializer, responses={201: HairLogSerializer}),
)
class HairLogView(APIView):
    """GET / POST /api/hair-log/ — trims, wash days, styles taken out. Appended only."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response([present_hair_log(e) for e in request.user.hair_log.all()[:200]])

    def post(self, request):
        from apps.bookings.models import Booking
        from apps.profiles.models import log_hair

        body = HairLogRequestSerializer(data=request.data)
        if not body.is_valid():
            return Response({"message": "Say what happened"}, status=400)
        data = body.validated_data
        at = data.get("at")
        if at and at > timezone.now():
            return Response({"message": "That hasn’t happened yet"}, status=400)
        booking_id = data.get("booking_id")
        if booking_id and not Booking.objects.filter(pk=booking_id, client=request.user).exists():
            return Response({"message": "That appointment isn’t yours"}, status=404)
        entry = log_hair(
            request.user, data["kind"], data.get("local_at"), at=at, booking_id=booking_id
        )
        if entry is None:
            return Response({"message": "Already noted"}, status=409)
        return Response(present_hair_log(entry), status=201)



@extend_schema_view(get=extend_schema(responses=UsernameCheckSerializer))
class UsernameCheckView(APIView):
    """GET /api/users/username-check/?username= — free to use, or why not."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.accounts.usernames import normalise, username_problem

        value = normalise(request.query_params.get("username"))
        problem = username_problem(value, request.user)
        return Response({"username": value, "available": problem is None, "reason": problem})
