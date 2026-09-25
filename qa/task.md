# QA task list

- [x] ~~25-09-2026 10:10~~ Local test harness: `env-up`/`metro`/`env-down` bring up Postgres+Redis (podman), seeded Django and Metro, with the app pointed at localhost via a gitignored `.env.development.local` — Expo's dev runtime lets the committed `.env.development` (live API) beat shell variables, so exporting alone sent traffic to production.
- [x] ~~25-09-2026 10:10~~ `qadb`: the only door to the owner's phone — refuses actions/captures unless Yasante has focus, app-only UI tree and logs, link allowlist, hashed journal per run. `mailbox` and `dbcheck` give ground truth to check reports against.
- [x] ~~25-09-2026 10:10~~ `qa/AGENTS.md` executor rules and plan AUTH-01 (sign-in, sign-out, sign-up, email code, reset, stylist sign-up).
- [/] ~~25-09-2026 10:05~~ Phone connected (SM-S948B, Android 16). Installed Yasante 1.0.0 (code 1) is a preview/production build with no dev launcher, so its API is baked to api.yasante.com and cannot be tested locally — needs an EAS `development` build from TheGyam or a local dev-client build.
- [ ] Antigravity runs AUTH-01 part P + A; Claude audits.
- [ ] AUTH-01 parts B–D; audit.
- [ ] Next plans: looks feed, booking lifecycle (two accounts), client/stylist mode switch.
