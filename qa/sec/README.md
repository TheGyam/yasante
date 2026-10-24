# Security checks

Security is tested in three layers, so that no verdict rests on an agent's say-so:

1. **Machine checks (this folder, `qa/bin/secscan`).** Claude runs them; each answer is
   a test result or a scanner's output.
2. **Browser plans with canaries (`qa/plans/SEC-*.md`, `qa/bin/canary`).** Antigravity
   opens the pages; whether hostile text ran is read from `qaweb`'s hashed journal,
   not from the report.
3. **Claude audits** every run, as for the other plans.

## Running layer 1

```
qa/bin/secscan <RUN>              # needs only Postgres (started if it isn't)
qa/bin/env-up <RUN> && qa/bin/web-up <RUN> && qa/bin/secscan --dynamic <RUN>
```

Raw output goes to `qa/runs/<RUN>/sec/` (gitignored); `SUMMARY.txt` has one line per tool.

| Check | What it answers |
| :--- | :--- |
| `test_access.py` | every `/api/` route with an ID, tried by another client, another stylist and a signed-out visitor: refused, and nothing anyone owns changes. A new upstream route fails `test_every_route_is_classified` until it is placed here. |
| `test_tokens.py` | tokens as the app sends them (sign-in, Bearer header, refresh) |
| `test_headers.py` | the headers Django sends on site and API responses |
| `test_input.py` | bodies of the wrong shape get a 4xx, not a crash; feed events, notification preferences and care-plan text (F64) |
| `test_calendar.py` | line breaks in names can't add lines to someone's `.ics` |
| `test_rendering.py` | the server-written HTML of yasante.com (title, meta, JSON-LD, page data) keeps user text as text; `qaweb` can't see this layer locally, since Vite serves the pages there |
| `test_media_origin.py` | a look's photo and an avatar must be the person's own upload, not any address (F33) |
| `test_own_record.py` | her own profile update and sign-up can't set staff, roles, verified flags, phone or id; a new email must be proved again |
| `test_limits.py` | unauthenticated doors are rate limited: sign-in (control), forgot and reset password (F34) |
| `test_uploads.py` | HTML, SVG, empty and truncated "photos" get a 400 and store nothing; a decompression bomb (F35); only JPEG, PNG and WebP are decoded (F41) |
| `test_staff_hidden.py` | staff without the reveal permission can't learn a hidden phone or hair detail by a list filter or search (F42), or from a form sent back with an error (F46) |
| `test_research.py` | the hair trends report keeps the research rules: groups of 20 people, not bookings; whole months (F45) |
| `test_suggestions.py` | "More like this" doesn't show what one person saved, opened or booked in private (F47) |
| `test_shared.py` | a shared collection or care plan link gives a stranger only the listed fields (no email, phone, notes or history), and dies with a closed account; the rest of sharing is in upstream's `tests/test_sharing.py` |
| `test_devices.py` | push tokens can't be deleted or (F36, candidate) taken over by another account |
| `test_staff_csrf.py` | every write under the staff workspace's `/data/`, and staff sign-in, needs the CSRF token |
| `pip-audit`, `osv-scanner` | published advisories for the backend, app and website dependencies |
| `gitleaks` | secrets in git history; only hits not in `gitleaks-baseline.json` count |
| `bandit`, `semgrep` | risky code patterns |
| `check --deploy` | Django's production checklist, on a copy without `backend/.env` |
| `schemathesis` (dynamic) | every documented operation fuzzed as a client; any 500 is a finding |
| ZAP baseline (dynamic) | passive scan of the site and the API |

**Known findings are `xfail(strict=True)`** with their `F` number, so the suite stays
green and a fix shows up as an `XPASS` failure: then remove the mark and update
`qa/findings.md`.

**Each test was shown to catch the bug it guards:** private media opened to anyone,
JSON-LD left unescaped. The test failed both times, naming the route and the user.

## Triaged scanner output (05-10-2026)

These are not findings. Re-check them only if the code around them changes.

- bandit B310 (`urlopen`): the URLs are constants (Apple, postcodes.io, Expo push,
  Open Beauty Facts, IndexNow).
- bandit B324 / semgrep sha1: cache keys and error fingerprints, not security.
- bandit B308/B703 `mark_safe` in `web/site.py`: JSON for `<script>` blocks with `<`
  escaped; `test_rendering.py` guards it.
- semgrep `csv-writer-injection` (`staff/views/browser.py`): the export prefixes `'` to
  formula-like cells (confirmed live in STAFF-01).
- semgrep `nan-injection` (`staff/views/session.py`): no float parsing there.
- gitleaks baseline (22): password-reset links from local test runs in old AUTH-01
  reports (local database, long expired), example passwords in tests and docs, and the
  Firebase key in `google-services.json`, which ships inside every Android build and is
  public by design (it should be restricted to the app in Google Cloud: TheGyam to
  confirm).
- ZAP's header alerts on the site: locally the pages come from Vite's dev server, not
  Django. Django sets nosniff, frame-deny and Permissions-Policy (`test_headers.py`).
  CSP is the real gap (F23).

## Tools on this machine

`uv tool install semgrep pip-audit bandit schemathesis`; `osv-scanner` 2.6.0 and
`gitleaks` 8.30.1 from their GitHub releases (checksums verified) in `~/.local/bin`;
ZAP as `ghcr.io/zaproxy/zaproxy:stable` (podman). For Claude in this repo only: the
Trail of Bits plugins `static-analysis`, `insecure-defaults`, `supply-chain-risk-auditor`,
`variant-analysis`, `differential-review` (`.claude/settings.local.json`).

## Triaged scanner output (23-10-2026)

- gitleaks: three "new" hits were baseline ones under new commit IDs after upstream's
  18-10 history rewrite (same file and line); added to the baseline, checked by file and line.
- osv (app, 71 high+; web, 3): build and dev tooling (Expo CLI, Metro, prebuild's xmldom,
  minimatch, shell-quote, node-forge), not shipped in the bundle or run on the server;
  `zod` on the website only validates what the visitor types in their own browser. A
  dependency refresh, not a finding.
- bandit B310 in `web/cards.py`: the share-card collage fetches its preview pictures over
  http(s). Since F33's fix those are Yasante's own uploads; looks posted before it may
  still hold outside addresses, which the server would then fetch (5 s, image bytes only).
  Low; recheck if a picture address can again come from outside.
- Design questions for the owner, not findings (code review, 23-10): feed events
  (`/api/feed/events/`) are stored without the analytics consent, as `docs/FEED_PLAN.md`
  §9 intends (only while the ranked feed is on, 90 days); withdrawing analytics consent
  deletes nothing already stored, though `AnalyticsEvent`'s docstring says it is dropped;
  `SearchLog.query` still keeps the typed words (no longer who typed them) for 12 months.
- The staff *Ranked feed* insight has no minimum group: with one person on the ranked
  feed, its per-100 figures are her own saves, booking requests and Not for me per day
  (checked 23-10: 3 saves show as 300.0). Superusers only, who can read feed events anyway,
  and it isn't research output, so a design note; becomes a finding if anyone else gets it.

## Triaged scanner output (24-10-2026)

- First dynamic scan since #82–#123 (`SEC-claude-20261024c`): schemathesis 3 server errors, all F64. ZAP adds nothing: API `Server` header (runserver), missing `nosniff` (runserver's static files and `debug_toolbar`), CSP report-only (`development.py` for the toolbar), `csrftoken` readable by scripts (Django's design) are all the local set-up; `test_headers.py` checks production's.
- Retention: every period in the privacy policy (analytics and searches 12 months, page viewers and feed events 90 days, error reports 90 days) has its delete in `enforce_retention`/`prune_client_errors`, both on the daily beat schedule. The staff trail (`admin.LogEntry`) has none; its personal part is F44.
