"""
Every number the ranking uses, in one place, so tuning it is one edit and learned
weights (manage.py tune_feed) can replace the hand-set ones. See docs/FEED_PLAN.md,
sections 4 to 6.
"""

# How much each action is worth: saves and bookings are what Yasante is for.
VALUE = {"save": 4.0, "book": 3.0, "comment": 2.0, "like": 1.5, "open": 1.0}

# Rates to start from until the feed has recorded enough to know its own.
DEFAULT_RATES = {"save": 0.02, "book": 0.002, "comment": 0.005, "like": 0.05, "open": 0.10}
# Below this many impressions in all, the defaults above stand.
OWN_RATES_AFTER = 1000
# A look's own rate counts as much as this many impressions of the average.
PRIOR_STRENGTH = 20

# Her pull toward a look, each 0..1, times these, added to 1.
LIFT = {"style": 1.0, "people": 1.2, "similar": 0.8, "hair": 0.6, "near": 0.4, "searched": 0.5}

# New looks lead; good older ones never vanish.
FRESH_DAYS = 3.0
FRESH_FLOOR = 0.35

# Small nudges for a look that's complete and bookable, 0.95 to 1.25 in all.
QUALITY_BASE = 0.95
QUALITY = {"caption": 0.05, "photos": 0.05, "stylist": 0.05, "bookable": 0.1, "verified": 0.05}

# Penalties.
SEEN = 0.35  # per showing to her in the last week
SEEN_WINDOW_DAYS = 7
OPENED = 0.6  # she's already opened it
REPORTED = 0.2  # two or more open reports, until a person decides
REPORTS_TO_DEMOTE = 2
NOT_FOR_ME_ONCE = 0.5  # a style she's said Not for me to once (twice removes it)
RECENT_REMOVAL = 0.5  # a poster with something removed in the last 30 days
REMOVAL_WINDOW_DAYS = 30

# Candidates from each source, at most.
QUOTAS = {
    "own": 10,
    "similar": 200,
    "people": 100,
    "style": 150,
    "hair": 150,
    "near": 100,
    "searched": 100,
    "trending": 150,
    "fresh": 150,
    "evergreen": 100,
    "new_creators": 50,
}
TOP_STYLES = 5
TOP_PEOPLE = 30
RECENT_ENGAGED = 30
FRESH_WINDOW_DAYS = 3
NEW_CREATOR_DAYS = 14
OWN_PINNED_HOURS = 24

# Variety.
AUTHOR_GAP = 4  # no poster or stylist twice within any 4 in a row
STYLE_WINDOW = 5  # no style more than twice within any 5 in a row
STYLE_REPEATS = 2
SEEN_PER = 10  # at most one look she's seen before in any 10

# Exploration: every 8th slot goes to a look still finding its audience.
EXPLORE_EVERY = 8
EXPLORE_UNDER_IMPRESSIONS = 200

# How many looks one feed session ranks.
SESSION_SIZE = 400

# Which source explains a look, when it came from several: the most personal first.
SOURCE_ORDER = [
    "own",
    "similar",
    "people",
    "style",
    "hair",
    "near",
    "searched",
    "trending",
    "new_creators",
    "fresh",
    "evergreen",
]
