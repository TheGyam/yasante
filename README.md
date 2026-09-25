# Yasante

Yasante is a home for textured hair. It's where you find a style you love, book the
stylist who can do it, and look after your hair between appointments.

It brings together three things that usually live in separate places: a feed of real
looks from real people, a booking flow built around how independent hair stylists
actually work, and a planner that keeps your care routine on track. Stylists get their
own side of the app too, with a page, a menu, a calendar and a simple way to run their
day.

The app is built with Expo and React Native. The backend is Django, and it runs live at
[yasante.com](https://yasante.com).

---

## What's inside

**For clients**

- **Looks.** A feed of hairstyles you can like, save, comment on and share. Open one
  and the photo grows out of the grid into its own page. Filter by style, by hair like
  yours, or by area.
- **Booking.** Pick a service, choose your size and options, see the price and the
  stylist's free times, and send a request. If you booked from a look, the stylist sees
  that exact photo. You follow along as it goes from asked, to accepted, to confirmed
  and done.
- **Planner.** Collections for the looks you're saving up, shown as little stacks of
  their newest photos. Care plans for your routine (wash day, oiling, protective
  styling), with a consistency ring, the last two weeks at a glance, and a satisfying
  flip when you mark today done.
- **Your hair profile.** A short quiz about texture, length and porosity, a log of trims
  and washes, and measured length over time.
- **Your shelf.** The products you use, so you can remember what works.

**For stylists**

- A public page with a menu, prices, portfolio, hours and policies, plus a link for your
  bio.
- Requests you can accept, move or decline, with deposits paid straight to you.
- Your week at a glance, reminders, and a nudge to post the result after each
  appointment.

**Everywhere**

- Usernames for clients, brand names for stylists.
- Push notifications for the moments that matter, each one switchable in settings.
- Reporting, blocking and appeals, with staff moderation in the admin.
- Error messages in plain words, never codes.
- Light and dark themes, reduced-motion support, and screen-reader labels throughout.

---

## Getting started

You'll need Node 18 or newer, and either an Android phone, an Android emulator or an
iOS simulator. For the backend you’ll also want Python 3.11 or newer, and Docker.

### Run the app

```bash
git clone https://github.com/TheGyam/yasante.git
cd yasante
npm install
npm start
```

By default the app talks to the live backend at yasante.com. You can change that in
`.env.development`:

| Setting                    | What it does                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL` | Which backend the app talks to. Use your computer's LAN IP to reach a local backend from a phone.                                               |
| `EXPO_PUBLIC_API_MOCKS`    | Set to `true` to answer every request from the built-in mock data in `src/mocks`, so no backend is needed at all. Great for working on screens. |
| `EXPO_PUBLIC_API_LOGGING`  | Set to `true` to log each request and response while developing.                                                                                |

`npm run web` opens the app in a browser, which is handy for quick layout work.

### Run the backend

The backend lives in `backend/`. Postgres and Redis run in Docker; Django runs on your
machine.

```bash
cd backend
docker compose up -d db redis
python -m venv venv
venv/Scripts/activate        # or: source venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env         # then set SECRET_KEY; the database defaults match Docker
python manage.py migrate
python manage.py seed_db     # optional: fills the database with sample data
python manage.py runserver 0.0.0.0:8000
```

`seed_db` loads the same people, stylists, looks and bookings the app's mock data uses.
Every seeded account has the password `password123`, so it's for local use only.

Background jobs (reminders, check-ins, weekly digests) run on Celery:

```bash
celery -A config worker -B -l info
```

---

## How the code is organised

```
app/               The screens, one file per route (Expo Router).
src/features/      Everything that belongs to one part of the product:
                   looks, booking, planner, profile, stylist, shelf, auth, education.
src/shared/        The design system, theme, API client and helpers used everywhere.
src/mocks/         The mock backend used when EXPO_PUBLIC_API_MOCKS is on.
backend/apps/      The Django apps, one per area, matching the features above.
```

A feature only exposes what's in its `index.ts`, and `shared/` never reaches into a
feature. [ARCHITECTURE.md](ARCHITECTURE.md) explains the rules and the reasoning behind
them, and is worth a read before a big change.

**The API contract.** The backend describes itself in `openapi.yaml`, and the app's
types are generated from it:

```bash
npm run api:types
```

CI fails if either file is out of date, and the backend's tests check every response
against the schema. So when an endpoint changes, regenerate both and commit them
together.

---

## Tests and checks

```bash
npm test                          # app tests
npm run lint                      # lint
npx tsc --noEmit                  # types
cd backend && pytest              # backend tests (needs Postgres running)
```

All of these run in CI on every push.

---

## Performance

Speed matters here as much as features. A few habits keep the app feeling quick:

- **Motion stays off the JavaScript thread.** Animations move only position, rotation
  and transparency, run on the UI thread with Reanimated, and quiet down when the
  phone asks for reduced motion.
- **Screens open with what's already known.** Data is cached with TanStack Query and
  kept on the phone between launches, so the app opens on what was there last time
  while fresh copies load. Likely next taps, such as a collection under your finger or
  a stylist's page from their look, start loading early.
- **Heavy things wait their turn.** A page builds only what its opening animation needs,
  and the rest arrives a step at a time once it has landed.
- **The server stays lean.** Responses are compressed, and a test holds the busiest
  endpoints to a fixed number of database queries however much they return.

Changes that touch motion or lists are measured on a real Android phone, not just in a
simulator.

---

## Building and releasing

Builds are made with EAS. There are three profiles in `eas.json`:

- **development** for a dev client you can load code into,
- **preview** for an installable APK to test on real phones,
- **production** for the stores.

```bash
npx eas-cli build --platform android --profile preview
```

Build minutes are limited, so check before starting one.

**Deploying the backend** happens automatically. Pushing to `master` with changes under
`backend/` runs CI, and if it passes, deploys to yasante.com and rolls back on its own
if anything goes wrong. The details are in
[backend/deploy/README.md](backend/deploy/README.md).

---

## License

Private. All rights reserved.
