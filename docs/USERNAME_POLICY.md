# Public username and handle policy

The server owns this policy. Account usernames and stylist handles share the same
reservations in `backend/apps/common/identifier_policy.json`; development mocks
read that file too. Live clients always use the server's availability endpoints.
Account signup uses email; public usernames are chosen through profile setup.

## What is blocked

- Existing app/site routes, infrastructure and standard service names: `links`,
  `api`, `postmaster`, `webmaster`, `noreply`, `autodiscover`, `robots.txt`, and more.
- Staff, support, safety, payment and verification identities: `admin`, `staff`,
  `security`, `billing`, `moderator`, `official`, and related names.
- Yasante branding, including compounds, separator variants and common numeric
  lookalikes. The former name `kalon` is also reserved as an exact name.
- Reserved-name comparisons ignore case and dots/underscores/hyphens. Authority
  names also reject numeric suffixes, common lookalikes (`adm1n`, `adrnin`), and
  authority terms separated by dots/underscores (`support.london`). This is a
  deliberately scoped heuristic, not a complete Unicode-confusable detector.
- Well-known companies and brands, so nobody can pose as them. Distinctive names
  (`instagram`, `tiktok`, `paypal`, `sephora`, `monzo` and about 60 more) are blocked
  anywhere in a name (`instagram_braids`). Companies whose names are also ordinary
  words or names (`apple`, `dove`, `boots`, `nike`, `amazon`) are blocked as the whole
  name, with an official-sounding word (`apple_support`) or a number (`apple1`), but
  not inside a longer name (`applepiebraids`, `nikeshabraids`).
- Abuse: slurs and sexual terms with no innocent reading are blocked anywhere, through
  separators and lookalikes (`f.u.c.k`, `sh1t`). Short words that hide inside ordinary
  ones are blocked only as the whole name or a dotted part (`sex.braids`, but not
  `essexbraids`, `scunthorpe.hair`, `peacockhair` or `therapist.ama`). Personal names
  that some filters wrongly block (`isis`, `jihad`, `kikelomo`, `nazir`) are allowed.
- Misspellings of Yasante (`yassante`, `yasantee`) and pages a social app has or will
  have (`inbox`, `reels`, `trending`, `gift-cards`).
- New public names use ASCII letters, digits, dots and underscores. They must
  start/end with a letter or digit and cannot repeat separators. Usernames have
  3–30 characters; stylist handles have 3–24, matching the app and website.
  Unicode lookalikes, invisible controls and mixed scripts are rejected rather
  than transliterated. Personal display names remain Unicode-capable.

The policy does not ban arbitrary substrings from ordinary names. For example,
`rootedbeauty`, `supportivecurls`, `admina`, and `yasmin` remain valid. The lists
cover the companies, brands and abuse people most often reach for; no finite list
covers every trademark, slur or language, so reports and moderation remain the
backstop, along with display names, photos and bios, which this policy doesn't cover.
Add to the JSON as cases come up; the tests hold ordinary names that must stay valid.

## Names given up are held

A username or handle someone gives up, by choosing a new one or deleting their
account, is held for 14 days (`NAME_HOLD_DAYS`), as Instagram and X do: nobody else
can take it and pass themselves off as the person who had it. Its last owner can
take it back meanwhile. Holds keep only the name and the old account ID, and are
deleted by the daily retention job once over.

## Where it is enforced

Username lookup and profile writes, stylist lookup/creation/edits, Django model
forms (including the staff workspace), and ordinary model creation/save all use
the shared policy. Direct API calls cannot bypass UI checks. Invalid/reserved
handle requests receive no suggestions; other suggestions must pass the policy.
Existing case variants are checked case-insensitively for name availability.
These lookups use functional indexes, built concurrently so deployment does not
block ordinary writes while building them.
Availability is advisory, not a reservation; this change does not redesign the
existing cross-table username/handle uniqueness mechanism.

Database SQL, `QuerySet.update`, `bulk_create` and `bulk_update` bypass model hooks.
Do not use them to assign public names. Use normal model saves or validate with
the shared policy before controlled migrations/imports. Staff status is not an
automatic exemption for creating reserved identities.

## Existing names and maintenance

Existing public names are never silently renamed or deleted. Their current owner
may save an unchanged legacy name; changing it must satisfy the current policy.
Another account cannot claim it. Review legacy names with the read-only command:

```sh
cd backend
python manage.py audit_reserved_names
```

It prints only the model, record ID, public name and reason; no email or phone.
Review brand impersonation before arranging any rename with the account owner.
Bulk imports should be audited after completion. Add new site routes to the JSON
policy; a regression test flags unreserved static public route prefixes. Changing
the JSON requires tests and a backend deployment. Existing app versions receive
the new rules immediately through the API.

The categories follow [django-registration's reserved-name guidance](https://django-registration.readthedocs.io/en/stable/validators.html),
with server-side allowlist validation as described by
[OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html).
The ASCII restriction avoids mixed-script public identifiers discussed in
[Unicode UTS #39](https://www.unicode.org/reports/tr39/); this implementation does
not claim full UTS #39 confusable matching.
