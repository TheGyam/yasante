# Documentation

This folder contains the specifications, requirements, and implementation guides for the Yasante app and backend. For the API, the generated `openapi.yaml` in the root is the source of truth, and typed clients are generated into `src/shared/lib/api/` and `web/src/shared/lib/api/`.

## Index

- [API_INTEGRATION.md](API_INTEGRATION.md) — **Out of date**. How the app was first wired to the API, for app developers. Gives the base URL as `yasante.com`; the app uses `api.yasante.com` (`apiBaseUrl` in `app.json`).
- [API_SERVICES_IMPLEMENTATION.md](API_SERVICES_IMPLEMENTATION.md) — **Out of date**. The app's early API service layer, for app developers. Lists services in `src/api/services/`, which no longer exists; each feature now makes its own calls in `src/features/<name>/api.ts`.
- [BACKEND_API_DOCUMENTATION.md](BACKEND_API_DOCUMENTATION.md) — **Out of date**. The original full API spec written for the backend engineer. Tells you to prefix endpoints with `/api/v1`; the API in `openapi.yaml` serves them under `/api/`.
- [BACKEND_API_REQUIREMENTS.md](BACKEND_API_REQUIREMENTS.md) — **Out of date**. An early list of backend requirements, for backend engineers. Calls the product "Beauty app" rather than Yasante (see the root `README.md`).
- [BACKEND_BRIEF.md](BACKEND_BRIEF.md) — **Current, partly ahead of the code**. The phase 1 contract for the backend: every endpoint, the rules each one enforces, and its background jobs. For backend engineers. Some endpoints it describes aren't in `openapi.yaml` yet, for example phone sign-in (`/api/auth/phone/start/`, `/api/auth/phone/verify/`).
- [BACKEND_QUICK_REFERENCE.md](BACKEND_QUICK_REFERENCE.md) — **Partly out of date**. Performance asks for the backend: cursor pagination, caching, image sizes and indexes. For backend engineers. `/api/content/` exists, but the `/api/content/new-posts` and `/api/content/batch` endpoints it asks for are not in `openapi.yaml`.
- [LOGOUT_IMPLEMENTATION.md](LOGOUT_IMPLEMENTATION.md) — **Out of date**. How sign-out works in the app, for app developers. Points at `app/(tabs)/profile/` and `src/contexts/`, neither of which exists now; auth lives in `src/features/auth/`.
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) — **Out of date**. A one-page summary of the original API spec, for backend engineers. Its base URL is `yasante.com` rather than `api.yasante.com` (`app.json`), and its Goals and Progress Photos endpoints (`/api/goals`, `/api/photos`) are not in `openapi.yaml`.
- [README.md](README.md) — This index.
- [STORE_SUBMISSION.md](STORE_SUBMISSION.md) — **Current**. How to submit to the App Store and Google Play: listings, privacy answers, store builds and Google sign-in setup. For whoever ships a release.
- [USERNAME_POLICY.md](USERNAME_POLICY.md) — **Current**. Which usernames and handles are blocked, how given-up names are held, and where that's enforced. For anyone touching sign-up or profiles.

## App information

- **App Name**: Yasante
- **Package**: `com.yasante.app`
- **Deep Link Scheme**: `yasante` (verified against `app.json`)
