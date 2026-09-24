"""
Media files go when what they belong to goes: a deleted Look, portfolio photo or
account leaves nothing behind on disk. (Account deletion cascades to Media, and a
deleted Media row deletes its files.)
"""

from urllib.parse import urlparse

from django.core.files.storage import default_storage
from django.db.models.signals import post_delete
from django.dispatch import receiver


def _storage_path(url):
    """https://yasante.com/media/uploads/x.jpg -> uploads/x.jpg (ours only)."""
    path = urlparse(url or "").path
    return path.split("/media/", 1)[1] if "/media/" in path else ""


def delete_media_for(url, owner_id):
    from .models import Media

    path = _storage_path(url)
    if path:
        for media in Media.objects.filter(full_path=path, owner_id=owner_id):
            media.delete()


@receiver(post_delete, sender="common.Media")
def delete_media_files(sender, instance, **kwargs):
    for path in instance.paths():
        try:
            default_storage.delete(path)
        except OSError:
            pass  # Already gone: the row going is what matters.


@receiver(post_delete, sender="looks.Look")
def delete_look_media(sender, instance, **kwargs):
    delete_media_for(instance.photo_uri, instance.author_id)


@receiver(post_delete, sender="stylists.PortfolioPhoto")
def delete_portfolio_media(sender, instance, **kwargs):
    delete_media_for(instance.uri, instance.stylist.account_id if instance.stylist_id else None)
