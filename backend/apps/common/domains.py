"""
Which part of the body a record is about. Hair is the only one today; the marker is
on every profile, log, product and shelf row from the start so skin (Phase 4) slots
in beside hair without migrating or re-labelling anything that already exists.
"""

from django.db import models

HAIR = "hair"
DOMAIN_CHOICES = [(HAIR, "Hair")]


def domain_field():
    return models.CharField(max_length=20, choices=DOMAIN_CHOICES, default=HAIR, db_index=True)
