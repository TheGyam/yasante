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
    # On an impression: what the ranking knew about the look when it was shown, so the
    # weights can be learned from what people did next (manage.py tune_feed).
    features = models.JSONField(default=dict, blank=True)
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


class LookStats(models.Model):
    """
    How each look is doing, for ranking: totals, the last 3 days for what's rising, and
    what the feed recorded. Nothing here says who; refreshed every 10 minutes.
    """

    look = models.OneToOneField("looks.Look", primary_key=True, on_delete=models.CASCADE, related_name="stats")
    impressions = models.PositiveIntegerField(default=0)
    opens = models.PositiveIntegerField(default=0)
    dwell_ms = models.BigIntegerField(default=0)
    likes = models.PositiveIntegerField(default=0)
    saves = models.PositiveIntegerField(default=0)
    comments = models.PositiveIntegerField(default=0)
    bookings = models.PositiveIntegerField(default=0)
    not_for_me = models.PositiveIntegerField(default=0)
    open_reports = models.PositiveIntegerField(default=0)
    # The last 3 days, for what's rising now.
    recent_impressions = models.PositiveIntegerField(default=0)
    recent_engagements = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "feed_look_stats"


class LookNeighbour(models.Model):
    """People who engaged with this look also engaged with that one: top 50 per look."""

    look = models.ForeignKey("looks.Look", on_delete=models.CASCADE, related_name="neighbours")
    neighbour = models.ForeignKey("looks.Look", on_delete=models.CASCADE, related_name="+")
    score = models.FloatField()

    class Meta:
        db_table = "feed_look_neighbour"
        ordering = ["-score"]
        constraints = [models.UniqueConstraint(fields=["look", "neighbour"], name="one_neighbour_row_per_pair")]


class FeedWeights(models.Model):
    """Weights learned from what people did (manage.py tune_feed). The newest is used."""

    weights = models.JSONField()
    metrics = models.JSONField(default=dict)
    impressions = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feed_weights"
        ordering = ["-created_at"]
