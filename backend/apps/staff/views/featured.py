"""Staff actions for stylist pages built with permission."""

import json
from functools import wraps

from django.core.exceptions import BadRequest, PermissionDenied
from django.core.paginator import EmptyPage, Paginator
from django.db import transaction
from django.db.models import (
    CharField,
    Count,
    DateTimeField,
    ExpressionWrapper,
    F,
    IntegerField,
    OuterRef,
    Q,
    Subquery,
)
from django.db.models.functions import Cast, Coalesce
from django.http import JsonResponse
from django.http.multipartparser import MultiPartParser
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods
from drf_spectacular.utils import extend_schema
from rest_framework import serializers

from apps.common.uploads import media_url, store_image
from apps.looks.models import Look, Style
from apps.stylists import featured
from apps.stylists.models import FeaturedPage, PageWaitlist

from ..access import model_admin, staff_data, validate_parameters
from ..audit import security_event


class PageDraftSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=150)
    instagram_handle = serializers.CharField(max_length=50)
    base_area = serializers.CharField(max_length=100)
    bio = serializers.CharField(max_length=1000, required=False, allow_blank=True)


def _allowed(request, write=False):
    """Use the same model permission boundary as the record browser."""
    ma = model_admin(request, "stylists", "featuredpage")
    allowed = (
        request.user.has_perm("stylists.change_featuredpage")
        if write
        else ma.has_view_or_change_permission(request)
    )
    if not allowed:
        raise PermissionDenied
    return ma


def _payload(request):
    """Read JSON or multipart, including multipart PATCH bodies."""
    if request.content_type == "application/json":
        try:
            body = json.loads(request.body)
        except (ValueError, UnicodeDecodeError):
            raise BadRequest("Send the page details again")
        if not isinstance(body, dict):
            raise BadRequest("Send the page details again")
        return body, {}
    if request.method == "PATCH" and request.content_type == "multipart/form-data":
        return MultiPartParser(request.META, request, request.upload_handlers).parse()
    return request.POST, request.FILES


def _page(pk, lock=False):
    """Read the page and owner together; serialize writes against claiming."""
    qs = FeaturedPage.objects.select_related("profile", "profile__account")
    if lock:
        qs = qs.select_for_update()
    page = get_object_or_404(qs, pk=pk)
    if lock and page.claimed_at:
        raise BadRequest("This page already belongs to its stylist")
    return page


def _summary(page):
    """Staff facts without the private link code or its hash."""
    profile = page.profile
    return {
        "id": str(page.pk),
        "display_name": profile.display_name,
        "handle": profile.handle,
        "instagram_handle": page.instagram_handle,
        "avatar_uri": profile.avatar_uri,
        "base_area": profile.base_area,
        "live": profile.published,
        "agreed": bool(page.agreed_at),
        "agreed_at": page.agreed_at,
        "look_count": page.look_count,
        "waiting": page.waiting,
        "link_expires_at": page.code_expires_at,
        "claimed_at": page.claimed_at,
    }


def _summaries():
    """One annotated query per page of records, without multiplying counts."""
    looks = (
        Look.objects.filter(
            author_id=OuterRef("profile__account_id"),
            stylist_id=Cast(OuterRef("profile__account_id"), CharField()),
        )
        .annotate(
            claimed=ExpressionWrapper(
                OuterRef("claimed_at"), output_field=DateTimeField()
            )
        )
        .filter(Q(claimed=None) | Q(created_at__lt=F("claimed")))
        .order_by()
        .values("author_id")
        .annotate(n=Count("pk"))
        .values("n")
    )
    waits = (
        PageWaitlist.objects.filter(stylist_id=OuterRef("profile_id"))
        .order_by()
        .values("stylist_id")
        .annotate(n=Count("pk"))
        .values("n")
    )
    return (
        FeaturedPage.objects.select_related("profile")
        .annotate(
            look_count=Coalesce(Subquery(looks, output_field=IntegerField()), 0),
            waiting=Coalesce(Subquery(waits, output_field=IntegerField()), 0),
        )
        .order_by("-created_at")
    )


def _upload(file, owner, kind, private=False):
    """Staff use the same image checks and copies as the upload API."""
    media, error = store_image(
        file, owner=owner, kind=kind, source="instagram", private=private
    )
    if error:
        raise ValueError(error)
    return media


def _write(view):
    """Keep permission, rollback and orphan-file cleanup the same for every action."""

    @wraps(view)
    def guarded(request, *args, **kwargs):
        _allowed(request, write=True)
        # Storage is outside the database transaction; remove new files on a failed write.
        uploaded = []
        request.featured_uploads = uploaded
        try:
            with transaction.atomic():
                return view(request, *args, **kwargs)
        except (ValueError, serializers.ValidationError) as error:
            for media in uploaded:
                for path in media.paths():
                    from django.core.files.storage import default_storage

                    default_storage.delete(path)
            message = (
                str(error)
                if isinstance(error, ValueError)
                else "Check the name, Instagram handle and area"
            )
            return JsonResponse({"message": message}, status=400)

    return guarded


def _file(request, file, page, kind, private=False):
    owner = request.user if kind == "proof" else page.profile.account
    media = _upload(file, owner, kind, private)
    request.featured_uploads.append(media)
    return media


@extend_schema(exclude=True)
@staff_data
@csrf_protect
@require_http_methods(["GET", "POST"])
def pages(request):
    if request.method == "GET":
        _allowed(request)
        validate_parameters(request)
        paginator = Paginator(_summaries(), 25)
        try:
            current = paginator.page(request.GET.get("p", 1))
        except (EmptyPage, ValueError):
            raise BadRequest("That page could not be found")
        return {
            "items": [_summary(p) for p in current],
            "count": paginator.count,
            "page": current.number,
            "pages": paginator.num_pages,
        }
    return _create(request)


@_write
def _create(request):
    body, files = _payload(request)
    serializer = PageDraftSerializer(data=body)
    serializer.is_valid(raise_exception=True)
    page = featured.create_page(**serializer.validated_data, added_by=request.user)
    if files.get("avatar"):
        media = _file(request, files["avatar"], page, "avatar")
        page.profile.avatar_uri = media_url(request, media, media.full_path)
        page.profile.save(update_fields=["avatar_uri", "updated_at"])
    security_event(
        request, "featured_page_created", user=request.user, email=page.profile.handle
    )
    return JsonResponse(_summary(_summaries().get(pk=page.pk)), status=201)


@extend_schema(exclude=True)
@staff_data
@csrf_protect
@require_http_methods(["GET", "PATCH"])
def detail(request, pk):
    if request.method == "PATCH":
        return _edit(request, pk)
    _allowed(request)
    page = get_object_or_404(_summaries(), pk=pk)
    data = _summary(page)
    data["bio"] = page.profile.bio
    data["agreed_note"] = page.agreed_note
    looks = Look.objects.filter(
        author_id=page.profile.account_id, stylist_id=str(page.profile.account_id)
    )
    if page.claimed_at:
        looks = looks.filter(created_at__lt=page.claimed_at)
    data["looks"] = [
        {
            "id": str(look.pk),
            "photos": [
                {"uri": photo.photo_uri, "thumb_uri": photo.thumb_uri}
                for photo in look.photos.all()
            ],
            "styles": [s.slug for s in look.styles.all()],
            "hair_texture": look.hair_texture,
            "caption": look.caption,
        }
        for look in looks.prefetch_related("photos", "styles")
    ]
    return data


@_write
def _edit(request, pk):
    page = _page(pk, lock=True)
    body, files = _payload(request)
    serializer = PageDraftSerializer(data=body, partial=True)
    serializer.is_valid(raise_exception=True)
    if "instagram_handle" in serializer.validated_data:
        from apps.accounts.usernames import name_in_use
        from apps.common.identifiers import (
            POLICY,
            UNAVAILABLE,
            identifier_problem,
            normalise,
        )

        handle = normalise(serializer.validated_data["instagram_handle"])
        if handle != page.instagram_handle:
            if page.profile.published:
                raise ValueError("Locked while the page is live")
            problem = identifier_problem(handle, max_length=POLICY["handle_max"])
            if problem or name_in_use(handle):
                raise ValueError(problem or UNAVAILABLE)
            page.instagram_handle = handle
            page.save(update_fields=["instagram_handle", "updated_at"])
            page.profile.handle = page.profile.instagram_handle = handle
            # Her looks carry the handle for their links, so they move with it.
            Look.objects.filter(stylist_id=str(page.profile.account_id)).update(stylist_handle=handle)
    for key in ("display_name", "bio", "base_area"):
        if key in serializer.validated_data:
            setattr(page.profile, key, serializer.validated_data[key])
    if files.get("avatar"):
        media = _file(request, files["avatar"], page, "avatar")
        page.profile.avatar_uri = media_url(request, media, media.full_path)
    page.profile.save()
    security_event(
        request, "featured_page_updated", user=request.user, email=page.profile.handle
    )
    return _summary(_summaries().get(pk=pk))


@extend_schema(exclude=True)
@staff_data
@csrf_protect
@require_http_methods(["POST"])
@_write
def looks(request, pk):
    page = _page(pk, lock=True)
    body, files = _payload(request)
    wanted = (
        body.getlist("styles") if hasattr(body, "getlist") else body.get("styles", [])
    )
    if isinstance(wanted, list) and len(wanted) > 3:
        raise ValueError("Pick up to 3 styles")
    styles = (
        list(Style.objects.filter(slug__in=wanted)) if isinstance(wanted, list) else []
    )
    if not styles:
        raise ValueError("Tag the style")
    uploads = files.getlist("files") if hasattr(files, "getlist") else []
    if not 1 <= len(uploads) <= 5:
        raise ValueError("Add 1 to 5 photos")
    photos = [_file(request, upload, page, "look") for upload in uploads]
    look = featured.add_look(
        page,
        photos=photos,
        styles=styles,
        hair_texture=body.get("hair_texture", ""),
        caption=body.get("caption", ""),
    )
    security_event(
        request, "featured_look_added", user=request.user, email=page.profile.handle
    )
    return JsonResponse({"id": str(look.pk)}, status=201)


@extend_schema(exclude=True)
@staff_data
@csrf_protect
@require_http_methods(["DELETE"])
@_write
def remove_look(request, pk, look_id):
    page = _page(pk, lock=True)
    featured.remove_look(page, look_id)
    security_event(
        request, "featured_look_removed", user=request.user, email=page.profile.handle
    )
    return {"done": True}


@extend_schema(exclude=True)
@staff_data
@csrf_protect
@require_http_methods(["POST"])
@_write
def action(request, pk, action):
    page = _page(pk, lock=True)
    body, files = _payload(request)
    result = {"done": True}
    handle = page.profile.handle
    if action == "yes":
        proof = (
            _file(request, files["proof"], page, "proof", private=True)
            if files.get("proof")
            else None
        )
        featured.record_yes(page, note=body.get("note", ""), proof_media=proof)
    elif action == "live":
        featured.put_live(page)
    elif action == "link":
        result = {"url": featured.new_link(page), "expires_at": page.code_expires_at}
    elif action == "take-down":
        if body.get("handle") != handle:
            raise ValueError("Type the handle to take the page down")
        featured.take_down(page)
    else:
        raise BadRequest("That action could not be found")
    security_event(
        request,
        f"featured_page_{action.replace('-', '_')}",
        user=request.user,
        email=handle,
    )
    return result
