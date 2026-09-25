# Findings

Confirmed issues, each with the run that showed it. Candidates still to be tested live in
the plans' audit notes.

| # | Found | Area | Finding | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| F1 | 25-09-2026 | auth | **Sign-out never reaches the server.** `logout()` in `src/features/auth/store.ts` only clears tokens on the device; nothing in the app calls `POST /api/auth/logout/` or `/logout-all/`, though the backend has both. The refresh token (7 days) stays valid after signing out, so a copied token outlives the sign-out. | Run `SETUP-smoke-1011`, steps P6b–P6e: no logout line in `server.log`; `dbcheck` shows `revoked=0`. Code search: no caller. |
| F2 | 25-09-2026 | backend seed | **Every seeded account is unconfirmed.** `seed_db` predates email verification and leaves `email_verified=False`, so signing in as any seeded person goes to the code screen. Test data only, but it hides the normal signed-in path in local work. | Same run, P5b: `Check your email` after a correct sign-in; `dbcheck` before verifying shows `verified=False`. |
