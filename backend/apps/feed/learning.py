"""
Learning the feed's weights from what people did (docs/FEED_PLAN.md, section 11).

Each impression recorded the look's features when it was shown. For each action (save,
like, open) a logistic regression learns how likely that action is from those features,
with lower positions weighted up (a look further down is seen less, whatever its worth:
inverse propensity weighting). It's only kept when it predicts better than the hand-set
scoring on the most recent fifth of impressions, which it never trained on.

Plain Python, no new dependency; the sample is capped so it runs in seconds.
"""

import math
import random
from datetime import timedelta

from django.core.cache import cache
from django.utils import timezone

from . import weights as W
from .models import FeedEvent, FeedWeights

WINDOW = timedelta(days=30)
# Did she act on it within a day of seeing it?
ACTED_WITHIN = timedelta(days=1)
SAMPLE = 20_000
MIN_IMPRESSIONS = 5_000
# Learned must beat hand-set by at least this, on saves, to be used.
MUST_BEAT_BY = 0.005
POSITION_BUCKETS = (0, 5, 10, 20, 40)


def vector(features, position=0):
    """The model's inputs: logs of the multiplying parts, the pulls as they are, and where."""
    def log(name):
        return math.log(max(float(features.get(name, 0) or 0), 1e-6))

    return [
        1.0,
        *(log(f"p_{a}") for a in ("save", "book", "comment", "like", "open")),
        *(float(features.get(k, 0) or 0) for k in ("style", "people", "similar", "hair", "near", "searched")),
        log("fresh"), log("quality"), log("penalty"),
        math.log1p(position or 0),
    ]


def _sigmoid(z):
    return 1 / (1 + math.exp(-max(min(z, 30), -30)))


def fit(xs, ys, sample_weights, epochs=25, rate=0.05, l2=1e-4, seed=7):
    """Logistic regression by stochastic gradient descent."""
    rng = random.Random(seed)
    w = [0.0] * len(xs[0])
    order = list(range(len(xs)))
    for epoch in range(epochs):
        rng.shuffle(order)
        step = rate / (1 + epoch * 0.2)
        for i in order:
            x, y, s = xs[i], ys[i], sample_weights[i]
            error = (_sigmoid(sum(a * b for a, b in zip(w, x))) - y) * s
            for j, value in enumerate(x):
                w[j] -= step * (error * value + l2 * w[j])
    return w


def predict(w, x):
    return _sigmoid(sum(a * b for a, b in zip(w, x)))


def auc(scores, labels):
    """How often a look acted on is scored above one that wasn't (0.5 is a coin toss)."""
    pairs = sorted(zip(scores, labels), key=lambda p: p[0])
    positives = sum(labels)
    negatives = len(labels) - positives
    if not positives or not negatives:
        return None
    rank_sum, i = 0.0, 0
    while i < len(pairs):
        j = i
        while j < len(pairs) and pairs[j][0] == pairs[i][0]:
            j += 1
        average_rank = (i + j + 1) / 2
        rank_sum += average_rank * sum(label for _, label in pairs[i:j])
        i = j
    return (rank_sum - positives * (positives + 1) / 2) / (positives * negatives)


def _bucket(position):
    return max(i for i, start in enumerate(POSITION_BUCKETS) if (position or 0) >= start)


def _examples(now):
    """[(when, features, position, {action: 0/1})] for recent impressions, oldest first."""
    from apps.looks.models import LookLike

    from .stats import _saved_looks

    rows = list(
        FeedEvent.objects.filter(kind="impression", created_at__gte=now - WINDOW, user__isnull=False)
        .exclude(features={})
        .order_by("-created_at")
        .values_list("created_at", "user_id", "look_id", "session", "position", "features")[:SAMPLE]
    )
    rows.reverse()
    opened = set(FeedEvent.objects.filter(kind="open", created_at__gte=now - WINDOW).values_list("session", "look_id"))
    since = now - WINDOW
    likes, saves = {}, {}
    for user, look, when in LookLike.objects.filter(created_at__gte=since).values_list("user_id", "look_id", "created_at"):
        likes.setdefault((user, look), when)
    from apps.planner.models import CollectionItem

    for user, ref, when in CollectionItem.objects.filter(kind="look", created_at__gte=since).values_list(
        "collection__user_id", "ref_id", "created_at"
    ):
        saves.setdefault((user, str(ref)), when)

    def soon(found, when):
        return int(found is not None and when <= found <= when + ACTED_WITHIN)

    return [
        (
            when,
            features,
            position,
            {
                "open": int((session, look) in opened),
                "like": soon(likes.get((user, look)), when),
                "save": soon(saves.get((user, str(look))), when),
            },
        )
        for when, user, look, session, position, features in rows
    ]


def tune(now=None, min_impressions=MIN_IMPRESSIONS, save=False):
    """Fit, compare with the hand-set scoring, and keep the result only if it's better."""
    now = now or timezone.now()
    examples = _examples(now)
    report = {"impressions": len(examples), "saved": False, "actions": {}}
    if len(examples) < min_impressions:
        report["reason"] = f"Only {len(examples)} impressions with features; needs {min_impressions}."
        return report

    # How much less often each position gets opened than the top: lower ones count up.
    shown, acted = [0] * len(POSITION_BUCKETS), [0] * len(POSITION_BUCKETS)
    for _, _, position, labels in examples:
        shown[_bucket(position)] += 1
        acted[_bucket(position)] += labels["open"]
    rates = [a / s if s else 0 for a, s in zip(acted, shown)]
    top = rates[0] or max(rates) or 1
    propensity = [min(max(top / r, 1.0), 10.0) if r else 10.0 for r in rates]

    cut = int(len(examples) * 0.8)
    train, test = examples[:cut], examples[cut:]
    learned = {}
    for action in W.LEARNED_ACTIONS:
        xs = [vector(f, p) for _, f, p, _ in train]
        ys = [labels[action] for *_, labels in train]
        sample_weights = [propensity[_bucket(p)] for _, _, p, _ in train]
        w = fit(xs, ys, sample_weights)
        test_labels = [labels[action] for *_, labels in test]
        learned_auc = auc([predict(w, vector(f, 0)) for _, f, _, _ in test], test_labels)
        hand_auc = auc([float(f.get("score", 0)) for _, f, _, _ in test], test_labels)
        report["actions"][action] = {
            "positives": sum(ys) + sum(test_labels),
            "learned_auc": learned_auc,
            "hand_set_auc": hand_auc,
        }
        learned[action] = w

    saves = report["actions"]["save"]
    better = (
        saves["learned_auc"] is not None
        and saves["hand_set_auc"] is not None
        and saves["learned_auc"] >= saves["hand_set_auc"] + MUST_BEAT_BY
    )
    if not better:
        report["reason"] = "The learned weights don't predict saves better than the hand-set ones."
        return report
    if save:
        FeedWeights.objects.create(weights=learned, metrics=report["actions"], impressions=len(examples))
        cache.delete("feed:learned")
        report["saved"] = True
    return report


def learned_weights():
    """The newest learned weights, or None to use the hand-set scoring."""
    found = cache.get("feed:learned")
    if found is None:
        latest = FeedWeights.objects.first()
        found = latest.weights if latest else {}
        cache.set("feed:learned", found, 600)
    return found or None


def learned_value(features, learned):
    """What a look is worth with learned weights: each action's chance times its value."""
    x = vector(features, 0)
    return sum(W.VALUE[action] * predict(learned[action], x) for action in W.LEARNED_ACTIONS if action in learned)
