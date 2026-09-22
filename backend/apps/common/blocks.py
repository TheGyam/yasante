"""Mutual blocking. Either direction hides people and content both ways."""

from django.db.models import Q


def blocked_account_ids(user):
    if not user or not user.is_authenticated:
        return set()
    from apps.looks.models import Block

    ids = set()
    for blocker_id, blocked_id in Block.objects.filter(
        Q(blocker=user) | Q(blocked=user)
    ).values_list("blocker_id", "blocked_id"):
        ids.add(blocker_id)
        ids.add(blocked_id)
    ids.discard(user.pk)
    return ids


def is_blocked(a, b) -> bool:
    if not a or not b or a.pk == b.pk:
        return False
    from apps.looks.models import Block

    return Block.objects.filter(
        Q(blocker=a, blocked=b) | Q(blocker=b, blocked=a)
    ).exists()
