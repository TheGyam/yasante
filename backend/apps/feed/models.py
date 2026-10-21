"""
What people do in the feed, recorded on the server so it can learn what to show: a
look seen, opened, and how long she stayed. Only while the `ranked_feed` switch is on
for her, kept 90 days, deleted with her account and in her data download.
"""

from django.conf import settings
from django.db import models

# The switch every new feed signal and the ranked feed sit behind.
SWITCH = "ranked_feed"


class FeedEvent(models.Model):
    KIND_CHOICES = [
        ("impression", "Seen"),
        ("open", "Opened"),
        ("dwell", "Time on the look"),
    ]
    SURFACE_CHOICES = [
        ("home", "Home"),
        ("looks", "Looks"),
        ("related", "More like this"),
    ]

    # Empty when signed out: counted, never followed.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name="feed_events"
    )
    # One scroll of the feed, from opening it (or pulling to refresh) to leaving it.
    session = models.CharField(max_length=40, db_index=True)
    look = models.ForeignKey("looks.Look", on_delete=models.CASCADE, related_name="feed_events")
    kind = models.CharField(max_length=12, choices=KIND_CHOICES)
    surface = models.CharField(max_length=12, choices=SURFACE_CHOICES)
    # Where in the feed it was: what's lower down gets seen less, whatever its worth.
    position = models.PositiveIntegerField(null=True, blank=True)
    # Which candidate source put it there (see apps.feed.ranking), when ranked.
    source = models.CharField(max_length=20, blank=True, default="")
    dwell_ms = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "feed_event"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"]), models.Index(fields=["look", "kind"])]
        constraints = [
            # A look seen twice in one scroll counts once.
            models.UniqueConstraint(
                fields=["session", "look"], condition=models.Q(kind="impression"), name="one_impression_per_session"
            ),
        ]
