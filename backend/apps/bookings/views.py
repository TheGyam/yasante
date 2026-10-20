"""
Bookings. The server owns every transition; the app reflects state and never
decides it. Every transition not allowed by the state machine is refused (409).
"""

import logging
import re
import uuid
from datetime import timedelta

from apps.common.timeparse import parse_iso
from apps.stylists.models import StylistProfile
from apps.stylists.numbers import recompute_public_stats
from apps.stylists.pricing import option_groups, price_choice
from apps.stylists.slots import bookable_problem
from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from apps.common.throttling import BookingRequestThrottle, ReviewThrottle
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .held import clashing, client_ranges, diary_lock, held_ranges, held_starts, holding, release, sweep
from .models import Booking, CheckIn, Review, ReviewReport, SlotInterest, TimeBlock
from .serializers import (
    AcceptRequestSerializer,
    AnswerRequestSerializer,
    BookingCreateRequestSerializer,
    BookingSerializer,
    CheckInRequestSerializer,
    CloseRequestSerializer,
    ContestRequestSerializer,
    MoveRequestBodySerializer,
    ReasonRequestSerializer,
    ReviewCreateRequestSerializer,
    ReviewReportRequestSerializer,
    ReviewSerializer,
    SlotInterestRequestSerializer,
    SlotInterestSerializer,
    StartedOnTimeRequestSerializer,
)
from .serializers import (
    check_in_due,
    client_hair,
    present_booking,
    present_review,
    present_slot_interest,
)
from .state_machine import VALID_TIMING_REASONS, can_transition, determine_cancel_type

logger = logging.getLogger(__name__)

HOUR = timedelta(hours=1)
REVIEW_REPORT_REASONS = tuple(value for value, _ in ReviewReport.REASON_CHOICES)


def _bookable_look(look_id):
    """The look a request came from, if it's a real, public, live one. Never fails a request."""
    from apps.looks.models import Look

    try:
        from apps.looks.views import public_looks

        return public_looks().filter(pk=look_id, visibility="public", status="live").first() if look_id else None
    except (ValueError, DjangoValidationError):
        return None


def _err(message, code):
    return Response({"message": message}, status=code)


def _ok(booking, request, code=200):
    booking.refresh_from_db()
    return Response(present_booking(booking, request.user), status=code)


def _is_uuid(value):
    try:
        uuid.UUID(str(value))
        return True
    except (TypeError, ValueError):
        return False


def _find(pk):
    """The booking, with any lapse due already applied."""
    qs = Booking.objects.filter(pk=pk)
    sweep(qs)
    return qs.select_related("client", "stylist_profile").first()


def _taken(booking, when):
    """Why `when` can't become this booking's time now, or None: it must never land on
    another appointment or hold, nor on another of the client's own."""
    if booking.stylist_profile is None:
        return None
    from apps.stylists.slots import gap_minutes

    minutes = booking.duration_minutes or 120
    profile = booking.stylist_profile
    taken = clashing(when, minutes, held_ranges(profile, booking.pk, gap_minutes(profile)))
    if isinstance(taken, TimeBlock):
        return "You’ve blocked that time out. Remove the block first, or pick another"
    if taken:
        return "That time is already booked. Pick another"
    mine = clashing(when, minutes, client_ranges(booking.client_id, booking.pk))
    if mine:
        return f"{_first(booking)} is already booked with {mine.stylist_name} then. Pick another time"
    return None


def _first(booking):
    return (booking.client_name or "The client").split(" ")[0]


def _party(booking, user):
    return booking is not None and user.pk in (booking.client_id, booking.stylist_id)


def _parse_time(value):
    try:
        return parse_iso(value) if value else None
    except (TypeError, ValueError):
        return None


def _local_day(at, profile):
    from apps.common import zones

    return at.astimezone(zones.of(profile)).date()


def answer_by(start, hours):
    """
    When a request or a deposit lapses: `hours` from now, but never later than shortly
    before the appointment itself, so nothing is still waiting once it should have begun.
    """
    now = timezone.now()
    lapse = now + hours * HOUR
    if start is None:
        return lapse
    before = start - settings.BOOKING_ANSWER_BEFORE_START_HOURS * HOUR
    return min(lapse, before) if before > now else start


def _take(booking, scheduled_for, deposit):
    """Taking a time: straight to confirmed with no deposit, otherwise a day to pay it."""
    booking.scheduled_for = scheduled_for
    booking.proposal = None
    if booking.responded_at is None:
        booking.responded_at = timezone.now()
    try:
        amount = float((deposit or {}).get("amount") or 0)
    except (TypeError, ValueError):
        amount = 0
    if amount > 0:
        booking.status = "awaiting_deposit"
        booking.deposit_amount = amount
        booking.deposit_method = str((deposit or {}).get("method") or "").strip()[:200]
        booking.deposit_status = "awaiting"
        booking.expires_at = answer_by(scheduled_for, settings.BOOKING_DEPOSIT_LAPSE_HOURS)
    else:
        booking.status = "confirmed"
        booking.expires_at = None
    booking.save()


# A UK postcode at the end of an address ("12 Bellenden Road, SE15 4QJ").
_POSTCODE = re.compile(r"([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\s*$", re.IGNORECASE)


def _outcode(address):
    """"SE15" from an address ending in a postcode, or "" if it doesn't."""
    match = _POSTCODE.search(address or "")
    return match.group(1).upper() if match else ""


@extend_schema_view(get=extend_schema(responses=BookingSerializer(many=True)), post=extend_schema(request=BookingCreateRequestSerializer, responses={201: BookingSerializer}))


class BookingListCreateView(APIView):
    """GET /api/bookings/?role=&status= · POST /api/bookings/"""

    permission_classes = [permissions.IsAuthenticated]

    def get_throttles(self):
        return [BookingRequestThrottle()] if self.request.method == "POST" else []

    def get(self, request):
        role = request.query_params.get("role", "client")
        qs = (
            Booking.objects.filter(stylist=request.user)
            if role == "stylist"
            else Booking.objects.filter(client=request.user)
        )
        sweep(qs)
        wanted = [s for s in request.query_params.get("status", "").split(",") if s]
        if wanted:
            qs = qs.filter(status__in=wanted)
        qs = qs.select_related("client", "from_look__author").prefetch_related("check_ins").order_by("-created_at")
        return Response([present_booking(b, request.user) for b in qs])

    def post(self, request):
        user = request.user
        data = request.data
        stylist_id = data.get("stylist_id")
        profile = (
            StylistProfile.objects.filter(account_id=stylist_id, published=True).first()
            if _is_uuid(stylist_id)
            else None
        )
        if profile is None:
            return _err("That stylist isn’t taking bookings", 404)
        if profile.featured:
            from apps.stylists.featured import not_booking_message

            return _err(not_booking_message(profile), 400)
        if str(stylist_id) == str(user.pk):
            return _err("You can’t book yourself", 400)

        service_id = data.get("service_id")
        service = (
            profile.menu_items.filter(pk=service_id).first() if _is_uuid(service_id) else None
        )
        if service is None:
            return _err("Pick a service from the menu", 400)

        # Priced here from her menu, never from what the app says it costs.
        priced = price_choice(service, data.get("options") or {})
        groups = option_groups(service)
        if groups and not priced["complete"]:
            names = " and ".join(g["group"] for g in groups)
            return _err(f"Pick your {names} so the stylist knows what to quote", 400)

        # One time per request: the one she picked from the stylist's free times.
        if not [t for t in (data.get("requested_times") or []) if t]:
            return _err("Say when you’d like to come", 400)
        start = _parse_time(next(t for t in data["requested_times"] if t))
        if start is None:
            return _err("Pick one of the stylist’s times", 400)
        minutes = priced["minutes"] or 120
        if not data.get("policy_version"):
            return _err("The stylist’s terms have to be accepted", 400)

        # Where: at the stylist's, or at the client's when the stylist travels. A stylist
        # who only travels always comes to the client.
        models_offered = set(profile.service_models or [])
        at_client = bool(data.get("at_client")) or models_offered == {"mobile"}
        client_address = str(data.get("client_address") or "").strip()[:500]
        if at_client:
            if "mobile" not in models_offered:
                return _err("This stylist doesn’t travel to clients. Book at their place instead", 400)
            if profile.country == "GB":
                outcode = _outcode(client_address)
                if not outcode:
                    return _err("Add your street and postcode so the stylist can get to you", 400)
            else:
                # No postcodes to lean on: "12 Lagos Avenue, East Legon". The part after
                # the last comma is the area she sees first; the street waits, as in the UK.
                street, _, outcode = (part.strip() for part in client_address.rpartition(","))
                outcode = outcode[:100]
                if not street or not outcode:
                    return _err("Add your street and your area so the stylist can get to you", 400)

        with diary_lock(profile.pk, user.pk):
            # Inside the lock: the time may have gone since she saw it.
            problem = bookable_problem(profile, start, minutes, client_id=user.pk)
            if problem:
                return _err(*problem)
            waiting = holding(
                Booking.objects.filter(client=user, stylist_profile=profile, status="requested")
            ).count()
            if waiting >= settings.BOOKING_OPEN_REQUESTS_PER_STYLIST:
                return _err(
                    f"You have {waiting} requests waiting with {profile.display_name}. "
                    "Wait for an answer, or withdraw one first",
                    409,
                )
            booking = Booking.objects.create(
                status="requested",
                client=user,
                client_name=user.name,
                client_hair=client_hair(user) or "",
                stylist=profile.account,
                stylist_profile=profile,
                stylist_name=profile.display_name,
                stylist_handle=profile.handle,
                service_id=service.pk,
                service_name=service.name,
                option_labels=priced["labels"],
                price=priced["price"],
                currency=profile.currency,
                from_price=priced["from_price"],
                duration_minutes=minutes,
                bringing_own_hair=bool(data.get("bringing_own_hair")),
                hair_included=bool(service.hair_included),
                styles=list(service.styles),
                from_look=_bookable_look(data.get("look_id")),
                notes=str(data.get("notes") or "").strip()[:1000],
                requested_times=[start],
                expires_at=answer_by(start, settings.BOOKING_REQUEST_LAPSE_HOURS),
                # The client's postcode district (or area, outside the UK) when the stylist
                # travels, so they can judge the journey; the street waits for confirming.
                area=outcode if at_client else profile.base_area,
                # Held, not sent until it's confirmed.
                address=client_address if at_client else profile.address,
                at_client=at_client,
                policy=profile.policies,
                policy_version=str(data["policy_version"])[:50],
            )
            # She's asked now: stop telling her a slot opened with this stylist.
            SlotInterest.objects.filter(client=request.user, stylist=profile.account).delete()
        return _ok(booking, request, 201)


@extend_schema_view(get=extend_schema(responses=BookingSerializer))
class BookingDetailView(APIView):
    """GET /api/bookings/:id/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        booking = _find(pk)
        if booking is None:
            return _err("That booking is gone", 404)
        if not _party(booking, request.user):
            return _err("That booking isn’t yours", 403)
        return Response(present_booking(booking, request.user))


class _BookingAction(APIView):
    """Shared lookup: the booking must exist, with lapses applied first."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        whose = Booking.objects.filter(pk=pk).values_list("stylist_profile_id", "client_id").first()
        if whose is None:
            return _err("That booking is gone", 404)
        # Every change happens inside the diary lock, read fresh, lapses applied.
        with diary_lock(*whose):
            booking = _find(pk)
            booking._actor = request.user  # for the audit trail
            return self.act(request, booking)


@extend_schema_view(post=extend_schema(request=AcceptRequestSerializer, responses=BookingSerializer))
class BookingAcceptView(_BookingAction):
    def act(self, request, booking):
        if request.user.pk != booking.stylist_id:
            return _err("Only the stylist can accept it", 403)
        if booking.status != "requested":
            return _err(f"A booking that is {booking.status} can't be accepted", 409)
        when = _parse_time(request.data.get("scheduled_for"))
        if when is None:
            return _err("Pick the time you’re accepting", 400)
        if when <= timezone.now():
            return _err("That time has passed. Suggest another instead", 400)
        if when not in booking.requested_times:
            return _err("They didn’t ask for that time. Suggest it instead", 400)
        problem = _taken(booking, when)
        if problem:
            return _err(problem, 409)
        _take(booking, when, request.data.get("deposit"))
        recompute_public_stats(booking.stylist_profile)
        return _ok(booking, request)


@extend_schema_view(post=extend_schema(request=AcceptRequestSerializer, responses=BookingSerializer))
class BookingProposeView(_BookingAction):
    def act(self, request, booking):
        if request.user.pk != booking.stylist_id:
            return _err("Only the stylist can suggest a time", 403)
        if booking.status != "requested":
            return _err("That request has moved on", 409)
        when = _parse_time(request.data.get("scheduled_for"))
        if when is None:
            return _err("Pick the time you’re suggesting", 400)
        if when <= timezone.now():
            return _err("Suggest a time that hasn’t passed", 400)
        problem = _taken(booking, when)
        if problem:
            return _err(problem, 409)
        deposit = request.data.get("deposit") or {}
        try:
            amount = float(deposit.get("amount") or 0)
        except (TypeError, ValueError):
            amount = 0
        booking.proposal = {
            "scheduled_for": when.isoformat().replace("+00:00", "Z"),
            "deposit": (
                {"amount": amount, "method": str(deposit.get("method") or "").strip()}
                if amount
                else None
            ),
        }
        booking.responded_at = booking.responded_at or timezone.now()
        # Now the client has up to 48 hours to answer, and never past the time itself.
        booking.expires_at = answer_by(when, settings.BOOKING_REQUEST_LAPSE_HOURS)
        booking.save()
        recompute_public_stats(booking.stylist_profile)
        return _ok(booking, request)


@extend_schema_view(post=extend_schema(request=AnswerRequestSerializer, responses=BookingSerializer))
class BookingProposalAnswerView(_BookingAction):
    def act(self, request, booking):
        if request.user.pk != booking.client_id:
            return _err("That isn’t yours to answer", 403)
        if booking.status != "requested" or not booking.proposal:
            return _err("There’s no suggested time to answer", 409)
        proposal = booking.proposal
        when = parse_iso(proposal["scheduled_for"])
        if request.data.get("accept"):
            problem = _taken(booking, when)
            if problem:
                return _err(problem.replace(f"{_first(booking)} is", "You’re"), 409)
            _take(booking, when, proposal.get("deposit"))
        else:
            booking.proposal = None
            booking.expires_at = None
            booking.status = "declined"
            booking.reason = "The suggested time didn’t work"
            booking.save()
            release(booking, when)
        return _ok(booking, request)


@extend_schema_view(post=extend_schema(request=ReasonRequestSerializer, responses=BookingSerializer))
class BookingDeclineView(_BookingAction):
    def act(self, request, booking):
        if request.user.pk != booking.stylist_id:
            return _err("Only the stylist can decline it", 403)
        if not can_transition(booking.status, "declined"):
            return _err(f"A booking that is {booking.status} can't be declined", 409)
        freed = held_starts(booking)
        booking.status = "declined"
        booking.reason = str(request.data.get("reason") or "").strip()[:500]
        booking.responded_at = booking.responded_at or timezone.now()
        booking.expires_at = None
        booking.save()
        if freed:
            release(booking, freed[0])
        recompute_public_stats(booking.stylist_profile)
        return _ok(booking, request)


@extend_schema_view(post=extend_schema(request=None, responses=BookingSerializer))
class BookingDepositReceivedView(_BookingAction):
    def act(self, request, booking):
        if request.user.pk != booking.stylist_id:
            return _err("Only the stylist can mark it received", 403)
        if booking.status != "awaiting_deposit":
            return _err(f"A booking that is {booking.status} can't become confirmed", 409)
        booking.status = "confirmed"
        booking.deposit_status = "received"
        booking.expires_at = None
        booking.save()
        return _ok(booking, request)


@extend_schema_view(post=extend_schema(request=ReasonRequestSerializer, responses=BookingSerializer))
class BookingCancelView(_BookingAction):
    def act(self, request, booking):
        if not _party(booking, request.user):
            return _err("That booking isn’t yours", 403)
        # In time or late is the server's call, from her notice window.
        to = determine_cancel_type(booking, request.user)
        if not can_transition(booking.status, to):
            return _err(f"A booking that is {booking.status} can't become {to}", 409)
        booking.status = to
        booking.reason = str(request.data.get("reason") or "").strip()[:500]
        booking.move_request = None
        booking.expires_at = None
        booking.save()
        release(booking)
        return _ok(booking, request)


@extend_schema_view(post=extend_schema(request=CloseRequestSerializer, responses=BookingSerializer))
class BookingCloseView(_BookingAction):
    def act(self, request, booking):
        if request.user.pk != booking.stylist_id:
            return _err("Only the stylist can close it", 403)
        outcome = request.data.get("outcome")
        if outcome not in ("attended", "no_show"):
            return _err("Say whether your client came", 400)
        no_show = outcome == "no_show"
        if no_show and booking.scheduled_for and booking.scheduled_for > timezone.now():
            return _err("You can only mark a no-show after the start time", 400)
        to = "no_show" if no_show else "completed"
        if not can_transition(booking.status, to):
            return _err(f"A booking that is {booking.status} can't become {to}", 409)

        # How the time went: an outcome, a size and a reason from the list. Never minutes.
        timing = request.data.get("timing")
        if not no_show and timing:
            t_outcome = timing.get("outcome")
            if t_outcome not in ("early", "on_time", "over"):
                return _err("Say how the time went", 400)
            bucket = timing.get("bucket")
            if t_outcome != "on_time" and bucket not in ("under_30", "30_60", "1_2h", "2h_plus"):
                return _err("Say by roughly how much", 400)
            reason = timing.get("reason")
            if reason and reason not in VALID_TIMING_REASONS:
                return _err("Pick a reason from the list", 400)
            booking.timing_outcome = t_outcome
            booking.timing_bucket = "" if t_outcome == "on_time" else bucket
            booking.timing_reason = "" if t_outcome == "on_time" else (reason or "")
        try:
            paid = float(request.data.get("actual_price"))
        except (TypeError, ValueError):
            paid = 0
        if not no_show and paid > 0:
            booking.actual_price = paid
        booking.status = to
        if to == "completed":
            booking.completed_at = timezone.now()
        booking.save()
        recompute_public_stats(booking.stylist_profile)
        return _ok(booking, request)


@extend_schema_view(post=extend_schema(request=None, responses=BookingSerializer))
class BookingAttendingView(_BookingAction):
    def act(self, request, booking):
        if request.user.pk != booking.client_id:
            return _err("That booking isn’t yours", 403)
        if booking.status != "confirmed":
            return _err("Only a confirmed booking", 409)
        booking.attendance_confirmed_at = timezone.now()
        booking.save(update_fields=["attendance_confirmed_at", "updated_at"])
        return _ok(booking, request)



def _move_problem(booking, when, by):
    """
    Why an appointment can't move to `when`, as (message, status), or None. It must never
    land on another appointment or hold. A client asks by the same rules as booking; a
    stylist may move her own appointment outside her hours, notice and reach.
    """
    profile = booking.stylist_profile
    if profile is None:
        return None
    if by == "client":
        return bookable_problem(
            profile, when, booking.duration_minutes or 120, client_id=booking.client_id, exclude_id=booking.pk
        )
    problem = _taken(booking, when)
    return (problem, 409) if problem else None


@extend_schema_view(post=extend_schema(request=MoveRequestBodySerializer, responses=BookingSerializer))
class BookingMoveView(_BookingAction):
    def act(self, request, booking):
        if not _party(booking, request.user):
            return _err("That booking isn’t yours", 403)
        if booking.status != "confirmed":
            return _err("Only a confirmed booking moves", 409)
        # One free move keeps the deposit and the history. A second is a cancellation.
        if booking.moves >= 1:
            return _err("It’s been moved once already. Cancel it and book again instead", 409)
        if booking.move_request:
            return _err("A move is already waiting for an answer", 409)
        when = _parse_time(request.data.get("scheduled_for"))
        if when is None or when < timezone.now():
            return _err("Pick a time that hasn’t passed", 400)
        by = "stylist" if request.user.pk == booking.stylist_id else "client"
        problem = _move_problem(booking, when, by)
        if problem:
            return _err(*problem)
        booking.move_request = {
            "by": by,
            "scheduled_for": when.isoformat().replace("+00:00", "Z"),
        }
        booking.save(update_fields=["move_request", "updated_at"])
        return _ok(booking, request)


@extend_schema_view(post=extend_schema(request=AnswerRequestSerializer, responses=BookingSerializer))
class BookingMoveAnswerView(_BookingAction):
    def act(self, request, booking):
        if not _party(booking, request.user):
            return _err("That booking isn’t yours", 403)
        asked = booking.move_request
        if not asked:
            return _err("There’s no move to answer", 409)
        side = "stylist" if request.user.pk == booking.stylist_id else "client"
        if asked.get("by") == side:
            return _err("The other side answers a move", 403)
        when = parse_iso(asked["scheduled_for"])
        # The time the appointment leaves (on a yes) or the one asked for (on a no).
        freed = booking.scheduled_for
        if request.data.get("accept"):
            # Held while it was asked about, so this only fails on records from before.
            if _taken(booking, when):
                return _err("That time has been booked since. Ask for another", 409)
            booking.scheduled_for = when
            booking.moves += 1
            # A new day needs a new "yes, I'm coming".
            booking.attendance_confirmed_at = None
        else:
            freed = when
        booking.move_request = None
        booking.save()
        release(booking, freed)
        return _ok(booking, request)


@extend_schema_view(post=extend_schema(request=StartedOnTimeRequestSerializer, responses=BookingSerializer))
class BookingStartedOnTimeView(_BookingAction):
    def act(self, request, booking):
        if request.user.pk != booking.client_id:
            return _err("That booking isn’t yours", 403)
        if booking.status != "completed":
            return _err("Once it’s done", 409)
        if booking.started_on_time is not None:
            return _err("You’ve already answered", 409)
        booking.started_on_time = bool(request.data.get("on_time"))
        booking.save(update_fields=["started_on_time", "updated_at"])
        return _ok(booking, request)


@extend_schema_view(post=extend_schema(request=ContestRequestSerializer, responses=BookingSerializer))
class BookingContestView(_BookingAction):
    def act(self, request, booking):
        if request.user.pk != booking.client_id:
            return _err("That booking isn’t yours", 403)
        what = request.data.get("what")
        if what == "no_show":
            if booking.status != "no_show":
                return _err("It wasn’t marked a no-show", 409)
            if booking.contested_no_show:
                return _err("You’ve already contested it", 409)
            booking.contested_no_show = True
        elif what == "timing":
            if not booking.timing_outcome:
                return _err("There’s no timing record", 409)
            if booking.contested_timing:
                return _err("You’ve already contested it", 409)
            booking.contested_timing = True
        else:
            return _err("Say what you’re contesting", 400)
        booking.save()
        return _ok(booking, request)


@extend_schema_view(post=extend_schema(request=ReviewCreateRequestSerializer, responses={201: ReviewSerializer}))
class ReviewCreateView(_BookingAction):
    """POST /api/bookings/:id/review/ — only the client, only once it's done, once."""

    throttle_classes = [ReviewThrottle]

    def act(self, request, booking):
        if request.user.pk != booking.client_id:
            return _err("Only the client can review it", 403)
        if booking.status != "completed":
            return _err("A review can only follow a completed appointment", 409)
        if Review.objects.filter(booking=booking).exists():
            return _err("You’ve already reviewed this one", 409)
        try:
            rating = int(request.data.get("rating"))
        except (TypeError, ValueError):
            rating = 0
        if not 1 <= rating <= 5:
            return _err("Give it between one and five stars", 400)
        body = str(request.data.get("body") or "").strip()[:1000]
        review = Review.objects.create(
            booking=booking,
            rating=rating,
            body=body,
            # Checked before anyone else sees it.
            status="published",
            author_name=(booking.client_name or "").split(" ")[0],
            service_name=booking.service_name,
        )
        return Response(present_review(review), status=201)


CHECK_IN_ANSWERS = {
    "holding": ("fresh", "okay", "tired"),
    "scalp": ("comfortable", "itchy", "sore"),
    "again": ("yes", "maybe", "no"),
}


@extend_schema_view(post=extend_schema(request=CheckInRequestSerializer, responses={204: None}))
class CheckInView(_BookingAction):
    """POST /api/bookings/:id/check-in/ — only while that week's check-in is open."""

    def act(self, request, booking):
        if request.user.pk != booking.client_id:
            return _err("That booking isn’t yours", 403)
        answered = set(booking.check_ins.values_list("week", flat=True))
        try:
            week = int(request.data.get("week"))
        except (TypeError, ValueError):
            week = None
        if week is None or week != check_in_due(booking, answered):
            return _err("That check-in isn’t open", 409)
        from apps.profiles.models import has_consent

        # How her scalp feels is health data: asked, and kept, only with her yes.
        asked = {
            k: allowed
            for k, allowed in CHECK_IN_ANSWERS.items()
            if k != "scalp" or has_consent(request.user, "personalisation")
        }
        answers = {k: request.data.get(k) for k in asked}
        if any(answers[k] not in allowed for k, allowed in asked.items()):
            return _err("Answer every question", 400)
        still_in = request.data.get("still_in")
        still_in = None if still_in is None else bool(still_in)
        CheckIn.objects.create(booking=booking, week=week, still_in=still_in, **answers)
        if still_in is False:
            # It's come out: how long styles last, the way she lives with them.
            from apps.profiles.models import log_hair

            log_hair(request.user, "take_down", request.data.get("local_at"), booking_id=booking.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(post=extend_schema(request=ReviewReportRequestSerializer, responses={204: None}))
class ReviewReportView(APIView):
    """POST /api/reviews/:id/report/ — to moderation."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        review = Review.objects.filter(pk=pk).first()
        if review is None:
            return _err("That review is already gone", 404)
        reason = request.data.get("reason")
        if reason not in REVIEW_REPORT_REASONS:
            return _err("Say what’s wrong with it", 400)
        ReviewReport.objects.create(
            review=review,
            reporter=request.user,
            reason=reason,
            note=str(request.data.get("note") or "")[:500],
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(get=extend_schema(responses=SlotInterestSerializer(many=True)), post=extend_schema(request=SlotInterestRequestSerializer, responses={201: SlotInterestSerializer}))
class SlotInterestListCreateView(APIView):
    """GET / POST /api/slot-interests/ — the waitlist."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        interests = SlotInterest.objects.filter(client=request.user).order_by("-created_at")
        return Response([present_slot_interest(i) for i in interests])

    def post(self, request):
        stylist_id = request.data.get("stylist_id")
        profile = (
            StylistProfile.objects.filter(account_id=stylist_id, published=True).first()
            if _is_uuid(stylist_id)
            else None
        )
        if profile is None:
            return _err("No stylist to wait for", 404)
        if profile.featured:
            from apps.stylists.featured import not_booking_message

            return _err(not_booking_message(profile), 400)
        start = _parse_time(request.data.get("from"))
        end = _parse_time(request.data.get("to"))
        if start is None or end is None or end < start:
            return _err("Pick the days you could do", 400)
        from apps.stylists.slots import last_day

        from_date, to_date = _local_day(start, profile), _local_day(end, profile)
        # Asking twice for the same days is the same wait, not a second alert.
        interest, _ = SlotInterest.objects.get_or_create(
            client=request.user,
            stylist_id=profile.account_id,
            from_date=from_date,
            to_date=to_date,
            opened_on__isnull=True,
            defaults={
                "stylist_name": profile.display_name,
                "stylist_handle": profile.handle,
                # Days she isn't taking bookings for yet: told when they open, not when
                # a time frees up.
                "opens": from_date > last_day(profile),
            },
        )
        return Response(present_slot_interest(interest), status=201)


@extend_schema_view(delete=extend_schema(responses={204: None}))
class SlotInterestDeleteView(APIView):
    """DELETE /api/slot-interests/:id/"""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        deleted, _ = SlotInterest.objects.filter(pk=pk, client=request.user).delete()
        if not deleted:
            return _err("Already gone", 404)
        return Response(status=status.HTTP_204_NO_CONTENT)
