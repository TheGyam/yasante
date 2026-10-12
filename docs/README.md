# Documentation

This folder contains the specifications, requirements, and implementation guides for the Yasante app and backend. For the API, the generated `openapi.yaml` in the root is the source of truth, and typed clients are generated into `src/shared/lib/api/` and `web/src/shared/lib/api/`.

## Index

- [API_INTEGRATION.md](API_INTEGRATION.md) — **Out of date**. Describes an early API integration pattern and uses an incorrect base URL (`yasante.com` instead of `api.yasante.com`). Verified against `app.json`.
- [API_SERVICES_IMPLEMENTATION.md](API_SERVICES_IMPLEMENTATION.md) — **Out of date**. Lists services in `src/api/services/`, a folder that does not exist. Features now own their own API calls in `src/features/<name>/api.ts`. Verified against `src/features/`.
- [BACKEND_API_DOCUMENTATION.md](BACKEND_API_DOCUMENTATION.md) — **Out of date**. Claims a `/api/v1` prefix and structure that does not match the current API. Verified against `openapi.yaml`.
- [BACKEND_API_REQUIREMENTS.md](BACKEND_API_REQUIREMENTS.md) — **Out of date**. References the project as "Beauty app" instead of "Yasante". Verified against `README.md`.
- [BACKEND_BRIEF.md](BACKEND_BRIEF.md) — **Current**. The foundational brief for the backend API, covering all rules, endpoints, and the mock server behavior. For backend engineers.
- [BACKEND_QUICK_REFERENCE.md](BACKEND_QUICK_REFERENCE.md) — **Current**. A short summary of backend requirements, including cursor pagination and database indexing.
- [LOGOUT_IMPLEMENTATION.md](LOGOUT_IMPLEMENTATION.md) — **Out of date**. References `app/(tabs)/profile/` and `src/contexts/`, paths that have since moved or been renamed. Verified against `app/` and `src/features/auth/`.
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) — **Out of date**. Claims a `/api/v1` prefix and old data models. Verified against `openapi.yaml`.
- [README.md](README.md) — This index.
- [STORE_SUBMISSION.md](STORE_SUBMISSION.md) — **Current**. Preparation notes for App Store and Google Play submissions, including screenshots and privacy details.
- [USERNAME_POLICY.md](USERNAME_POLICY.md) — **Current**. The detailed policy for handles and usernames, including reserved words and length rules.

## App information

- **App Name**: Yasante
- **Package**: `com.yasante.app`
- **Deep Link Scheme**: `yasante` (verified against `app.json`)
