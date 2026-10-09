"""
POST /api/uploads/ — a photo, stored in three sizes and recorded as Media.
GET  /api/media/:id/ — a private photo, for its owner (or an admin) only.

Upload returns the full-size URL, a 1080-wide copy for feeds (`feedUri`), a
400-wide copy for grids (`thumbUri`), and width ÷ height (`photoAspect`) so the
app can size tiles before they load. Re-encoding drops every EXIF field, GPS
included. `kind` says what it's for; a proof-of-work photo is always private, and
anything that's for a portfolio or a Look is checked against other accounts'
photos for near-duplicates (the stolen-portfolio defence).
"""

import io
import re
import uuid
from urllib.parse import urlsplit

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.http import FileResponse, HttpResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, serializers
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Media
from .schema import optional

MAX_BYTES = 15 * 1024 * 1024
MAX_EDGE = 2048
# A 50-megapixel phone photo fits; a "bomb" (a small file of a huge, blank image)
# doesn't. Decoding one holds about 3 bytes a pixel in memory.
MAX_PIXELS = 60_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
FEED_WIDTH = 1080
THUMB_WIDTH = 400
# Hashes this close (of 64 bits) are the same photo, recompressed or lightly cropped.
DUPLICATE_BITS = 6
PRIVATE_KINDS = {"proof"}
CHECKED_KINDS = {"portfolio", "look"}


def _jpeg(image, max_width=None, max_edge=None):
    img = image.copy()
    if max_edge:
        img.thumbnail((max_edge, max_edge))
    if max_width and img.width > max_width:
        img = img.resize((max_width, round(img.height * max_width / img.width)))
    buffer = io.BytesIO()
    # Saved without exif=: nothing from the original's metadata survives.
    img.convert("RGB").save(buffer, "JPEG", quality=85, optimize=True, progressive=True)
    return ContentFile(buffer.getvalue())


def difference_hash(image):
    """64-bit dHash: robust to resizing and recompression, cheap to compare."""
    small = image.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
    pixels = list(small.getdata())
    bits = 0
    for row in range(8):
        for col in range(8):
            left, right = pixels[row * 9 + col], pixels[row * 9 + col + 1]
            bits = (bits << 1) | (1 if left > right else 0)
    return f"{bits:016x}"


def near_duplicate(phash, owner_id):
    """
    Another account's photo within DUPLICATE_BITS of this one, if any.
    ponytail: compares against every checked hash in Python; fine for thousands of
    portfolio photos, move to a BK-tree or pg extension if it reaches millions.
    """
    target = int(phash, 16)
    candidates = (
        Media.objects.filter(kind__in=CHECKED_KINDS)
        .exclude(owner_id=owner_id)
        .exclude(phash="")
        .values_list("id", "phash")
    )
    for media_id, other in candidates:
        if bin(target ^ int(other, 16)).count("1") <= DUPLICATE_BITS:
            return media_id
    return None


# What media_url() hands out: a public copy (any size) or the owner-only view.
_PUBLIC_PATH = re.compile(r"(uploads/[0-9a-f-]{36}/[0-9a-f]{32})(?:_w\d+)?\.jpg$")
_PRIVATE_PATH = re.compile(r"/api/media/([0-9a-f-]{36})/?$")


def own_media(user, uri, public=True):
    """
    The upload an address points at, if this person made it; None otherwise. Every
    photo someone attaches comes through here, so it has been through /api/uploads/
    (re-encoded, fingerprinted, moderated) and isn't someone else's upload or an
    outside server that would see who looks at it.
    """
    path = urlsplit(str(uri or "")).path
    match = _PUBLIC_PATH.search(path)
    if match:
        return Media.objects.filter(
            owner=user, full_path=f"{match.group(1)}.jpg", visibility="public"
        ).first()
    match = _PRIVATE_PATH.search(path)
    if match and not public:
        return Media.objects.filter(owner=user, pk=match.group(1)).first()
    return None


def media_url(request, media, path):
    """
    Public copies are plain URLs; private ones go through the owner-only view. Both
    on the public address when one is set, so a photo's link is the same whichever
    address (yasante.com or api.yasante.com) the upload came in on.
    """
    relative = f"/api/media/{media.pk}/" if media.visibility == "private" else default_storage.url(path)
    base = settings.PUBLIC_BASE_URL.rstrip("/")
    return f"{base}{relative}" if base else request.build_absolute_uri(relative)


class UploadRequestSerializer(serializers.Serializer):
    file = serializers.ImageField()
    kind = serializers.ChoiceField(choices=["look", "portfolio", "avatar", "proof", "other"], required=False)
    visibility = serializers.ChoiceField(choices=["public", "private"], required=False)
    source = serializers.CharField(required=False)


class UploadResponseSerializer(serializers.Serializer):
    id = serializers.CharField()
    uri = serializers.CharField()
    feed_uri = optional(serializers.CharField())
    thumb_uri = optional(serializers.CharField())
    photo_aspect = serializers.FloatField()


@extend_schema_view(post=extend_schema(request={"multipart/form-data": UploadRequestSerializer}, responses={201: UploadResponseSerializer}))
class UploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is None:
            return Response({"message": "Choose a photo to upload"}, status=400)
        if upload.size > MAX_BYTES:
            return Response({"message": "That photo is too large"}, status=400)
        try:
            image = Image.open(upload)
            # Read from the header, before anything is decoded.
            if image.width * image.height > MAX_PIXELS:
                return Response({"message": "That photo is too large"}, status=400)
            # Turn it the right way up before the orientation tag is dropped.
            image = ImageOps.exif_transpose(image)
        except Image.DecompressionBombError:
            return Response({"message": "That photo is too large"}, status=400)
        except (UnidentifiedImageError, OSError):
            return Response({"message": "That file isn’t a photo"}, status=400)

        kind = request.data.get("kind", "other")
        kind = kind if kind in dict(Media.KIND_CHOICES) else "other"
        source = request.data.get("source", "camera_roll")
        source = source if source in dict(Media.SOURCE_CHOICES) else "camera_roll"
        private = kind in PRIVATE_KINDS or request.data.get("visibility") == "private"

        folder = "private" if private else "uploads"
        name = f"{folder}/{request.user.pk}/{uuid.uuid4().hex}"
        full = default_storage.save(f"{name}.jpg", _jpeg(image, max_edge=MAX_EDGE))
        feed = default_storage.save(f"{name}_w{FEED_WIDTH}.jpg", _jpeg(image, FEED_WIDTH))
        thumb = default_storage.save(f"{name}_w{THUMB_WIDTH}.jpg", _jpeg(image, THUMB_WIDTH))
        phash = difference_hash(image)
        duplicate = near_duplicate(phash, request.user.pk) if kind in CHECKED_KINDS else None
        media = Media.objects.create(
            owner=request.user,
            kind=kind,
            visibility="private" if private else "public",
            source=source,
            full_path=full,
            feed_path=feed,
            thumb_path=thumb,
            width=image.width,
            height=image.height,
            phash=phash,
            moderation_status="flagged" if duplicate else "ok",
            duplicate_of_id=duplicate,
        )
        return Response(
            {
                "id": str(media.pk),
                "uri": media_url(request, media, full),
                "feed_uri": None if private else media_url(request, media, feed),
                "thumb_uri": None if private else media_url(request, media, thumb),
                "photo_aspect": round(image.width / image.height, 4) if image.height else 1,
            },
            status=201,
        )


@extend_schema_view(get=extend_schema(responses={(200, "image/jpeg"): OpenApiTypes.BINARY}))
class PrivateMediaView(APIView):
    """GET /api/media/:id/ — only its owner or an admin sees a private photo."""

    # The app sends its token; staff open it from the admin with their session.
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        media = Media.objects.filter(pk=pk).first()
        allowed = media and (media.owner_id == request.user.pk or request.user.is_staff)
        if not allowed:
            return Response({"message": "We couldn’t find that. It may have been removed."}, status=404)
        if settings.PRIVATE_MEDIA_ACCEL:
            # nginx sends the file (location /protected/ is internal): fast, and the
            # file itself is never reachable by URL.
            response = HttpResponse(content_type="image/jpeg")
            response["X-Accel-Redirect"] = f"/protected/{media.full_path.removeprefix('private/')}"
            return response
        return FileResponse(default_storage.open(media.full_path, "rb"), content_type="image/jpeg")

