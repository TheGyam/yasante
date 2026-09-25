"""
Custom permissions used across apps.
"""

from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """Object-level: the request user owns the object."""

    def has_object_permission(self, request, view, obj):
        # Works for objects with `user`, `owner`, or `account` FK
        for attr in ("user", "owner", "account", "author"):
            owner = getattr(obj, attr, None)
            if owner is not None:
                if hasattr(owner, "pk"):
                    return owner.pk == request.user.pk
                return owner == request.user.pk
        # Fallback: check if object IS the user
        return getattr(obj, "pk", None) == request.user.pk


class IsStylist(BasePermission):
    """Requires the user to have the stylist role."""

    message = "You need a stylist account for this."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and "stylist" in (request.user.roles or [])
        )


class IsAdmin(BasePermission):
    """Requires the user to have the admin role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and "admin" in (request.user.roles or [])
        )


class IsAuthenticatedOrReadOnly(BasePermission):
    """Allow read-only for unauthenticated, full access for authenticated."""

    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return bool(request.user and request.user.is_authenticated)
