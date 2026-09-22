"""
POST /api/uploads/ — a photo, stored with a grid-sized copy.

Returns the permanent URL, a ~400px-wide copy for grids (`thumbUri`), and the
width ÷ height ratio (`photoAspect`) so the app can size tiles before they load.
Location metadata is dropped by re-encoding; huge originals are scaled down.
"""

import io
import uuid

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import permissions
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

MAX_BYTES = 15 * 1024 * 1024
MAX_EDGE = 2048
THUMB_WIDTH = 400


def _jpeg(image, max_width=None, max_edge=None):
    img = image.copy()
    if max_edge:
        img.thumbnail((max_edge, max_edge))
    if max_width and img.width > max_width:
        img = img.resize((max_width, round(img.height * max_width / img.width)))
    buffer = io.BytesIO()
    img.convert("RGB").save(buffer, "JPEG", quality=85, optimize=True)
    return ContentFile(buffer.getvalue())


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
            # Turn it the right way up before the orientation tag is dropped.
            image = ImageOps.exif_transpose(image)
        except (UnidentifiedImageError, OSError):
            return Response({"message": "That file isn’t a photo"}, status=400)

        name = f"uploads/{request.user.pk}/{uuid.uuid4().hex}"
        full = default_storage.save(f"{name}.jpg", _jpeg(image, max_edge=MAX_EDGE))
        thumb = default_storage.save(f"{name}_w{THUMB_WIDTH}.jpg", _jpeg(image, THUMB_WIDTH))
        return Response(
            {
                "uri": request.build_absolute_uri(default_storage.url(full)),
                "thumb_uri": request.build_absolute_uri(default_storage.url(thumb)),
                "photo_aspect": round(image.width / image.height, 4) if image.height else 1,
            },
            status=201,
        )
