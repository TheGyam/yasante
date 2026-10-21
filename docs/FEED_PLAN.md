# The feed: design, plan and progress

Yaw asked on 21 October 2026 for a feed as good as the best: what appears, suggestions,
and what brings people back, the way Instagram, TikTok, Pinterest and Facebook do it.
He approved this plan in advance and asked for the work to continue without stopping
to ask. This file is the design, the plan and the progress log, so any session can
pick up where the last stopped. Update the log after each step.

## 0. Working rules

- **Don't merge anything** (billing issue, 21 Oct 2026). One branch and PR per phase,
  each stacked on the previous phase's branch (the PR's base is that branch). Yaw says
  when to merge. CI may not run: run every check in AGENTS.md locally and put the real
  results in the PR.
- Don't stop to ask (Yaw, 21 Oct 2026). Make the sensible call and record it in the
  log. Nothing is published until Yaw merges, so policy text goes on branches and he
  reads it then.
- The new ranking, and every new signal it records, is behind the feature switch
  `ranked_feed`, off in production, until Yaw merges the privacy policy lines it needs.
- Follow CLAUDE.md, AGENTS.md, ARCHITECTURE.md and docs/DATA_AND_CONSENT_PLAN.md: no
  AI credit anywhere, plain English, tests named as behaviour, comments that say why.
- Before usage runs low, schedule a one-shot CronCreate for about 7 minutes after the
  next 5-hour reset (see `mcp__ccd_session_mgmt__get_usage`), with the continuation
  prompt at the end of this file.

## 1. What the feed is for

Yasante is where people find a style and the person to do it. So the feed is judged by
**meaningful actions**, not time spent:

1. **Saves** (planning a style), **stylist page visits** and **booking requests** count
   most.
2. **Likes, comments and opening a look** count, less.
3. **"Not for me"**, reports and quick scroll-pasts count against.

This is the "value model" the big apps use (Facebook's meaningful interactions,
Pinterest's saves, TikTok's completion): predict how likely each action is, weight
each by how much it matters, add them up. Time spent alone is never the goal.

Guardrails that always win over the score: blocks, Not for me, removed or hidden
content, private looks, draft Featured pages, and the privacy rules in section 9.

## 2. How the big apps do it, and what Yasante takes

| Idea | Who does it | Yasante |
| --- | --- | --- |
| Two stages: gather a few thousand candidates cheaply, then score them carefully | All of them | Yes, sized for our data: about 1,000 candidates from 10 sources |
| Several candidate sources, each with a quota | Instagram Explore, Pinterest | Yes (section 4) |
| Value model: weighted sum of predicted actions | Facebook, Instagram | Yes (section 5) |
| Smoothed rates, so a look with 2 views and 1 save doesn't beat one with 1,000 views and 200 saves | All | Yes: Bayesian smoothing with a prior from all looks |
| "People who saved this also saved" (item-to-item) | Pinterest (Pixie), Amazon | Yes: co-engagement neighbours, computed nightly |
| Re-ranking for variety: no runs of one author or one style | Instagram, TikTok | Yes (section 6) |
| Exploration: new posts and new creators get a fair first audience | TikTok | Yes: about 1 slot in 8, Thompson sampling |
| Adapting within a session to what she just did | TikTok | Yes: each next page re-ranks the rest using this session's actions |
| Seen-before is pushed down | All | Yes, from impressions |
| Learning the weights from what people actually do | All | Yes, a training command fits the weights from logged impressions (section 11) |
| Explanations ("Why am I seeing this?") | Facebook, Instagram, required for large EU platforms | Yes, in the look's menu |
| A non-personalised option | Required for very large EU platforms; good practice | Yes: "Latest" next to "For you" |
| Suggestions beyond the feed: related items, accounts to try | All | "More like this" and "Stylists for you" |
| Notifications that bring people back | All | Comment replies, a daily summary for creators, an opt-in weekly "picked for you" |
| A/B testing with guardrail metrics | All | The `ranked_feed` switch's percentage mode plus a staff insight comparing the two groups |

What Yasante deliberately doesn't do: autoplay, streaks, fake urgency, "you might
miss out" notifications, infinite notification nudges, and anything that would learn a
person's hair type, ethnicity, health or income from what they do.

**Follows.** Instagram and Facebook start from a follow graph. Yasante has no follows
today, and adding them is a product feature in its own right (buttons, counts, lists).
TikTok shows a feed can be excellent without one. So affinity to a stylist or poster is
learned from what she does (saves, likes, comments, opens, page visits and above all
bookings) instead of a follow button. If follows are added later, they become one more
candidate source and one more affinity signal; nothing else changes.

## 3. Signals

Explicit, already stored by the service: likes, saves (collection items), comments,
bookings (requests and completed), Not for me (look, stylist, style), reports, blocks,
stylist page views (signed in).

New, recorded server-side only while `ranked_feed` is on for that person, kept 90
days, deleted with the account, included in their data download:

| Event | When | Why |
| --- | --- | --- |
| `impression` | A look is at least half on screen for at least half a second in a feed | Rates need a denominator; seen-before; exploration |
| `open` | She opens a look from a feed | Interest stronger than a scroll past |
| `dwell` | She leaves a look she opened: how long she stayed | Interest; a quick back-out counts against |

Each event carries the feed session, the position, the surface (home, looks, more
like this) and which source the look came from. Signed-out impressions are kept
without anyone attached, only to count.

Look features: styles, the stylist credited, the author, age, number of photos,
caption, the stylist's verification tier and whether she takes bookings, and
**hair texture, used only to match a viewer who has given the hair consent**.

Viewer features: affinities computed on request from her own actions (style weights,
author and stylist weights), her hair texture and area **only with the hair consent**,
and the styles her phone sends from her recent searches (never kept).

Never used as a viewer feature: price (that would be guessing income), a hair type
learned from behaviour, analytics events (those are for their own consent only).

## 4. Candidates

Each source returns up to its quota of public, live looks, newest-first unless said
otherwise, with the source recorded for explanations and learning:

| Source | Quota | What |
| --- | --- | --- |
| `affinity_style` | 150 | Looks in her five strongest styles |
| `affinity_author` | 100 | From posters and stylists she's engaged with or booked |
| `similar` | 200 | Co-engagement neighbours of the last 30 looks she engaged with |
| `hair` | 150 | Looks on hair like hers (only with the hair consent) |
| `near` | 100 | Looks from her area (only with the hair consent, which covers area) |
| `searched` | 100 | Styles from her recent searches, sent by the phone |
| `trending` | 150 | Highest engagement velocity in the last 3 days |
| `fresh` | 150 | Posted in the last 3 days |
| `evergreen` | 100 | Best smoothed save rate of all time |
| `new_creators` | 50 | From people whose first look was in the last 14 days |

Signed out: `trending`, `fresh`, `evergreen`, `new_creators`.

Her own looks from the last 24 hours go first, so she sees what she just posted. Older
ones of hers aren't in her feed.

## 5. Scoring

For each candidate, smoothed rates from the look's stats (section 7):

    p(action) = (count + m * global_rate) / (impressions + m),   m = 20

Then a personal lift from her affinities:

    lift = 1 + 1.0 * style_affinity + 1.2 * author_affinity + 0.8 * similar
             + 0.6 * hair_match + 0.4 * near + 0.5 * searched

And the score:

    value = 4 * p(save) + 2 * p(comment) + 1.5 * p(like) + 1 * p(open)
            + 3 * p(stylist visit or booking from it)
    score = value * lift * freshness * quality * penalties

- `freshness = 0.35 + 0.65 * exp(-age / 3 days)` so new looks lead without old great
  ones vanishing.
- `quality`: a caption, more than one photo, a credited stylist, a verified stylist
  who takes bookings each add a little (between 0.9 and 1.3 in all).
- `penalties`: seen before by her (x0.35 per showing in the last 7 days, x0.6 if she
  opened it), two or more open reports (x0.2), a style she's said Not for me to once
  (x0.5; twice removes it, as today).

All weights live in one place (`ranking/weights.py`) and can be replaced by learned
weights (section 11).

## 6. Re-ranking for variety

Greedy, from the top score down, with these rules:

- No poster or credited stylist twice within any 4 in a row.
- No style more than twice within any 5 in a row.
- At most one look she's seen before in any 10.
- Every 8th slot (8, 16, 24 ...) is **exploration**: a look with fewer than 200
  impressions, picked by Thompson sampling on its save rate (Beta with the global prior),
  so new posts and new creators get a fair first audience and the good ones rise.

## 7. Data pipeline

- `LookStats` (one row per look, no personal data): impressions, opens, total dwell,
  likes, saves, comments, Not for me, open reports, stylist visits and booking
  requests that came from it, plus the same over the last 3 days for velocity.
  Refreshed every 10 minutes for looks with recent activity, nightly for all.
- `LookNeighbour` (look, neighbour, score; top 50 per look): from people who engaged
  with both in the last 60 days. Saves count 3, comments 2, likes 2, opens 1.
  Cosine similarity with heavy users damped, computed nightly.
- Viewer affinities are computed on request from her last 200 actions (saves,
  likes, comments, opens, long dwells, bookings, Not for me), each fading with a
  14-day half-life, and cached for 10 minutes.

## 8. Feed sessions and paging

- The first page (no cursor) ranks up to 400 looks and keeps the ranked list in the
  cache for 30 minutes as a feed session. The cursor is the session and the position,
  so scrolling never repeats or skips.
- Each later page **re-ranks what's left** using what she did in this session
  (TikTok-style): styles and people she saved, liked or opened rise; styles she
  scrolled past fall.
- Pull to refresh starts a new session. If a session has expired, a new one starts
  without the looks already served in it.
- Filters (hair like mine, a style, an area, a search) keep today's behaviour. Ranking
  is for the everyday feed.
- "For you" (ranked) and "Latest" (newest first, nothing personal) are side by side
  at the top of the feed. The choice is remembered on the phone.
- Signed out: one shared ranking, cached for 5 minutes.

## 9. Privacy

- Hair texture and area only with the hair consent, as today. The look's hair type is
  never part of a learned affinity, so liking looks on a hair type never makes the
  feed treat her as that hair type. A test proves it.
- Price is never a viewer feature (no guessing income).
- Searched styles come from the phone per request and are never stored (as now).
- New events: only while the switch is on, kept 90 days, deleted with the account, in
  the data download, never in research.
- Explanations show only to her, and never say a look is there because she searched
  (Yaw, 21 Oct 2026: don't tag anything "because you searched").
- Privacy policy lines (drafted in phase 7, on a branch, for Yaw before merging): what
  the feed uses to choose and order looks, the new events and how long they're kept,
  "Latest", and "Why am I seeing this".

## 10. Integrity

- Looks whose photo is flagged as a near-copy and still waiting for review are left
  out.
- Two or more open reports: pushed far down until a person decides.
- A poster with a removal in the last 30 days: their looks count for less (x0.5).
- Exploration never picks looks with open reports.

## 11. Learning the weights

- Every impression records the look's source, position and the main features at the
  moment it was shown.
- `manage.py tune_feed` fits a logistic regression (pure Python, no new dependency)
  for each action (save, like, open) from the last 30 days of impressions, with
  position bias corrected by weighting each impression by the inverse of how often
  that position gets engaged with. It prints how well it predicts (log loss and AUC
  against the hand-set weights) and, with `--save`, stores the weights, which the
  scorer then uses. It refuses to save with fewer than 5,000 impressions or if the
  learned model doesn't predict better than the hand-set one.

## 12. Suggestions

- **More like this** under a look: its co-engagement neighbours, other looks of the
  same styles and by the same stylist, scored for her and re-ranked for variety.
- **Stylists for you**: a row at the top of the feed. Stylists whose work matches her
  style affinities, people she's engaged with, near her (with the hair consent), with
  a smoothed rating, a verified tier and taking bookings. Not stylists she's blocked,
  said Not for me to, or is.
- **Why am I seeing this**, in a look's menu: the main reason, such as "You've saved
  looks in Knotless braids", "You've booked Ama before", "Popular this week", "New
  on Yasante", "Matches your hair" (only she sees it). Never "because you searched".

## 13. Notifications that bring people back

Each respects her notification settings and is never sent twice for the same thing:

- **Replies and comments** (new category "Comments and replies", on by default): a
  comment on her look, or a reply to her comment. Several within an hour come as one.
- **Activity on your looks** (same category): once a day at most, "Your look got 14
  saves and 9 likes today". Counts only, never who.
- **Picked for you** (new opt-in category, like News): once a week, new looks in the
  styles she loves, only if there are at least three.

## 14. Measuring

A staff insight "Feed" compares people with `ranked_feed` on and off, per day:
sessions, looks seen, opens per look seen, saves and likes per session, stylist visits
and booking requests within a day of a session, Not for me per 1,000 looks seen,
and how many different posters got seen. Turn it on for staff, then a percentage,
then everyone, watching that saves and bookings go up and Not for me doesn't.

## 15. Speed

The first page in under 300 ms on the server: candidates are about 10 indexed
queries, scoring is in memory over about 1,000 looks, stats and neighbours are
precomputed, and later pages come from the cache.

## 16. Phases

Each phase is one branch and PR, stacked on the one before, with tests.

| # | Branch | What | Done when |
| --- | --- | --- | --- |
| 0 | `docs/feed-design` | This design | It's in the repo |
| 1 | `feed/1-signals` | `FeedEvent` model and `POST /api/feed/events/`, the `ranked_feed` switch, retention, deletion, data download; the app records impressions, opens and dwell when the server asks | Events are stored only while the switch is on; tests for each rule |
| 2 | `feed/2-stats` | `LookStats`, `LookNeighbour`, the jobs that fill them, viewer affinities | Tests show the stats, neighbours and affinities, and that hair type is never learned |
| 3 | `feed/3-ranking` | Candidates, scoring, re-ranking, exploration, integrity | Tests for order, variety, exploration and privacy rules |
| 4 | `feed/4-sessions` | Feed sessions, paging, in-session re-ranking, "For you" and "Latest" in the app | Scrolling never repeats; switch off means today's feed exactly |
| 5 | `feed/5-suggestions` | More like this, Stylists for you, Why am I seeing this | Endpoints and app screens with tests |
| 6 | `feed/6-notifications` | Comments and replies, daily activity, weekly Picked for you | Tests for limits, settings and no duplicates |
| 7 | `feed/7-learning` | Impression features, `tune_feed`, the staff insight, policy lines on the branch | Training refuses bad models; insight compares the groups |

Separate, from master: `docs/stylist-terms-guidelines` with the approved wording below.

## 17. Stylist terms and guidelines (approved by Yaw, 21 Oct 2026)

New versions via a migration like `0018_terms_reporting_and_complaints.py`:

- Stylist terms, section 5, first sentence: "We may check your phone number, a photo
  of your work and your Instagram, or meet you in person or on video."
- Guidelines: "textured hair" becomes "hair" in the first line; the broken character
  after "everything you post" becomes " — "; the contact becomes support@yasante.com;
  "Reporting and blocking" matches the new terms (anyone can report by emailing
  support@yasante.com, illegal or dangerous content first, complaints answered within
  14 days).

## 18. Log

- 21 Oct 2026: plan written; Yaw approved it in advance, asked for it to be thorough,
  for no merging, and for work to continue without stopping.
- 21 Oct 2026: full design written (this file), PR #99. Stylist terms and guidelines on
  `docs/stylist-terms-guidelines`, PR #100 (the "broken" dash in the guidelines was a
  terminal display problem; the stored text is a proper dash, so it's unchanged).
- 21 Oct 2026: phase 1 done on `feed/1-signals`: new `apps/feed` with `FeedEvent`,
  `POST /api/feed/events/`, the `ranked_feed` switch (seeded off), 90-day retention,
  deletion with the account, in the data download, superusers only on the staff site.
  The feed's first page carries a `session` while the switch is on; the app records
  impressions (half visible for half a second), opens and dwell against it, in batches,
  and drops anything queued when the account changes. Two query-count tests now warm
  the switch cache before counting (they still catch per-row queries). Next: phase 2.

## Continuation prompt

> The usage limit has reset. Continue Yaw's work in
> C:\Users\yawop\Downloads\Coding\survey (a git worktree; never touch the main
> checkout's funky branch). Read docs/FEED_PLAN.md on the latest feed branch (see its
> log) and carry on from the next unfinished step, following its working rules: no
> merging, one stacked branch and PR per phase, every check run locally, no stopping
> to ask, the log kept up to date, and another one-shot CronCreate scheduled before
> usage runs low.
