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
- New public names use ASCII letters, digits, dots and underscores. They must
  start/end with a letter or digit and cannot repeat separators. Usernames have
  3–30 characters; stylist handles have 3–24, matching the app and website.
  Unicode lookalikes, invisible controls and mixed scripts are rejected rather
  than transliterated. Personal display names remain Unicode-capable.

The policy does not ban arbitrary substrings from ordinary names. For example,
`rootedbeauty`, `supportivecurls`, `admina`, and `yasmin` remain valid. It does not
attempt to reserve every person's name, trademark, offensive word or language.
Those require a separate moderation policy; no finite list prevents every form
of impersonation, especially through display names, photos or biographies.

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
