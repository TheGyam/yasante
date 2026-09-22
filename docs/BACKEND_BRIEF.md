# Yasante backend brief

Everything the server has to do for the Yasante app: every endpoint, the rules each one enforces, the jobs that run on their own, and how fast it all has to be. The app is built and waiting; this is the contract it already speaks.

*Phase 1 · client and stylist apps · base paths under `/api/` · written 22 September 2026*

---

## Contents

1. [What matters most](#1-what-matters-most)
2. [Speed and efficiency requirements](#2-speed-and-efficiency-requirements)
3. [Conventions](#3-conventions)
4. [Rules that never bend](#4-rules-that-never-bend)
5. [Accounts and sign-in](#5-accounts-and-sign-in)
6. [Hair profile, consent and personal data](#6-hair-profile-consent-and-personal-data)
7. [Stylist page, menu and payment details](#7-stylist-page-menu-and-payment-details)
8. [Portfolio, and sharing it to Looks](#8-portfolio-and-sharing-it-to-looks-new)
9. [Working hours and free times](#9-working-hours-and-free-times)
10. [Bookings](#10-bookings)
11. [Reviews and check-ins](#11-reviews-and-check-ins)
12. [Looks feed](#12-looks-feed)
13. [Comments, replies and likes](#13-comments-replies-and-likes)
14. [Reports and blocking](#14-reports-and-blocking)
15. [Collections, care plans and the product shelf](#15-collections-care-plans-and-the-product-shelf)
16. [Stylist numbers, summary and labels](#16-stylist-numbers-summary-and-labels)
17. [Background jobs](#17-background-jobs)
18. [Notifications](#18-notifications)
19. [Needed, but not in the app yet](#19-needed-but-not-in-the-app-yet)
20. [Definition of done](#20-definition-of-done)

---

## 1. What matters most

Two things, in this order, and neither is optional:

1. **It works, exactly as specified.** Every rule below is enforced by the server, not trusted to the app. The app shows state; the server decides it. A request the rules don't allow is refused with a clear message.
2. **It is fast at any size.** Built from day one for thousands of people posting, liking and commenting at once, and for millions of rows. Industry-grade speed means the feed, a look, its comments and a stylist's page load as quickly as they do on the biggest social apps.

> **The executable spec.** The app currently runs against a mock server in `src/mocks/` of the app repo. Each file there is a working, tested version of the endpoints in this brief, with the same URLs, request bodies, response shapes and error messages. When a detail here is ambiguous, the mock's behaviour is the answer. Its tests (`src/mocks/__tests__/`) are the scenarios your implementation has to pass.

When an endpoint of yours goes live, the app team deletes that endpoint's mock and the app talks to you. Nothing on the app side changes as long as the shapes match.

---

## 2. Speed and efficiency requirements

These are targets measured at the server, under realistic load, on production-sized data.

| What | p50 | p95 | Notes |
| --- | --- | --- | --- |
| Feed page, a look, its comments, a stylist page | ≤ 60 ms | ≤ 150 ms | The screens people scroll. Anything slower is felt. |
| Other reads | ≤ 80 ms | ≤ 200 ms | Bookings, collections, shelf, numbers. |
| Likes, saves, comment likes | ≤ 40 ms | ≤ 120 ms | The app updates instantly and trusts the server to agree. |
| Other writes | ≤ 120 ms | ≤ 300 ms | Bookings, posts, comments. |
| Free times for a stylist | ≤ 80 ms | ≤ 200 ms | 28 days of slots, computed or cached. |
| Availability | | | 99.9% monthly. Errors under 0.1% of requests. |

### How to get there

- **Cursor pagination everywhere.** Every list that can grow (feed, comments, replies, bookings, a stylist's reviews) takes `cursor` and `limit` and returns `{ data, nextCursor }`. Never offset pagination: it slows down with depth and skips or repeats items as new ones arrive. The cursor is opaque to the app. Cap `limit` at 50.
- **Counts are stored, not counted.** Like counts, comment counts, reply counts, save counts and comment-like counts are kept on the row and updated atomically with the action. A feed page must never count likes or comments by scanning.
- **No per-item queries.** A page of 20 looks is a fixed, small number of queries however many likes, comments or authors it involves. The same goes for "did I like / save this" flags: fetch them for the whole page at once.
- **Indexes for every access path in this brief.** Feed by recency with each filter (hair, style, area), comments by look, replies by thread, bookings by stylist and status and by client, slots by stylist and time, collections by owner.
- **Images are served small.** Every uploaded photo gets a grid-sized copy (about 400 px wide) and its width-to-height ratio, returned as `thumbUri` and `photoAspect`. The feed uses the small copy; the app sizes each tile from the ratio so nothing jumps while loading. Images are served from edge caches with long cache lifetimes; a changed image gets a new URL.
- **Cache what's public.** The signed-out feed, style taxonomy, areas, and public stylist pages are cacheable for short periods. Personal flags (`liked`, `saved`, `mine`) are merged per request, not cached with the shared data.
- **Small responses.** Only the fields in this brief; compressed; no nested objects the screen doesn't use. A feed page of 20 should be well under 30 KB before images.
- **Heavy work off the request.** Notifications, emails, image processing, moderation queues and analytics ingestion happen in the background. A request never waits on them.
- **Safe to retry.** Likes, saves and blocks are idempotent (liking twice is still one like). Creating a booking request, a comment or a look accepts an `Idempotency-Key` header so a retried request on a bad connection never creates two.
- **Rate limits** on sign-in, phone codes, posting, commenting and reporting, returning `429` with a message saying when to try again.
- **Load-test before launch** at ten times expected launch traffic: sustained feed scrolling, bursts of likes on one popular look, and many clients asking for the same stylist's slots at once.

---

## 3. Conventions

- **JSON in and out**, field names in `camelCase`, as in this brief. Paths end with a slash (`/api/looks/`); accept both.
- **Times** are ISO 8601 in UTC (`2026-09-22T10:00:00.000Z`). Days without a time are `yyyy-MM-dd`. Stylist hours are local wall-clock strings, `"09:00"`, in the stylist's time zone (UK for now).
- **Money** is pounds as a number (`120`, `45.5`). Yasante never takes payments; these are the stylist's own prices.
- **Auth**: `Authorization: Bearer <accessToken>`. A `401` makes the app refresh once with the refresh token, then sign out if that fails.
- **Errors** return `{ "message": "..." }`. **The app shows the message to the person as written**, so write it for them: short, plain, and saying what to do ("Verify your mobile number before you book", "Someone has just asked for that time. Pick another").
- **Status codes**: `400` invalid input · `401` not signed in · `403` not allowed · `404` not found or hidden (blocked, private, draft) · `409` conflicts with current state · `410` gone (used invite) · `429` too many.

---

## 4. Rules that never bend

These protect the people using Yasante. Each is enforced on the server, on every endpoint that could leak or break it.

| Rule | What it means for the server |
| --- | --- |
| A stylist's address is never shown before a booking is confirmed | `address` is omitted from every booking response unless its status is `confirmed` or `completed`, and only to its own client and stylist. Public pages carry the district (`baseArea`) only. |
| A client's early cancellations are never shown | The client record a stylist sees counts attended, no-shows and *late* cancellations only. Cancelling in time is free and invisible. |
| A client never sees her own record | `clientRecord` and `clientHair` go on the stylist's copy of a booking only. |
| Yasante never handles money | Deposits are paid straight to the stylist. The server stores how to pay her and whether she marked it received, nothing more. |
| Payment details are private | `paymentMethods` never appear on a public page; a client sees the one chosen method only once her request is accepted. |
| Verification photos are private | `proofPhotoUri` is for the verification queue only, never in a public response. |
| Blocking runs both ways | Once either person blocks the other, neither sees the other's looks, comments, replies or page, and neither can like, comment on or reply to the other's content. |
| Private looks are private | A look with `visibility: "private"` is returned to its author only, never in any feed, count or search. |
| Credit can't be faked | A client credits a stylist only through her own completed booking with that stylist, never by typing a name. A stylist's own post credits her. |
| Reviews come from real appointments | Only the client of a completed booking can review it, once, and a review is `pending` until moderation publishes it. Public pages show published reviews only, with the reviewer's first name only. |
| Reports are anonymous | The person reported is never told who reported them. |
| Analytics only with consent | Events from an account whose latest analytics consent is withdrawn are dropped, not stored. |
| Prices are the server's | A booking is priced from the stylist's menu at the moment of the request and stored, so later menu changes never rewrite it. The app's estimate is never trusted. |

---

## 5. Accounts and sign-in

| Endpoint | Does |
| --- | --- |
| `POST /api/auth/signup/` | `{ name, email, password, role: "client"\|"stylist", age_confirmed: true, invite_code? }`. Refuses without `age_confirmed` (18+) and a taken email. A valid unused invite gives the stylist role and is marked used. Returns `{ user, accessToken, refreshToken, expiresAt }`. |
| `POST /api/auth/login/` | `{ email, password }` → same session shape. |
| `POST /api/auth/refresh-token/` | `{ refreshToken }` → `{ accessToken, expiresAt }`. Refresh tokens are rotated and revocable. |
| `POST /api/auth/forgot-password/` | Emails a reset link. Always answers the same way whether or not the email exists. |
| `POST /api/auth/reset-password/` | Sets a new password from the emailed token. |
| `POST /api/auth/phone/start/` | `{ phone }`. UK mobiles only, normalised to E.164. Sends a 6-digit code by SMS. Another code only after 30 s (`429` "Wait 12s before asking again"). Returns `{ resendInSeconds: 30, expiresInSeconds: 600 }`. |
| `POST /api/auth/phone/verify/` | `{ phone, code }`. Five tries per code, then `429`. On success sets `phone` and `phoneVerified: true` and returns the user. A verified phone is required to send a booking request and to publish a stylist page. |
| `GET /api/invites/:code/` | Stylist invites. `{ code, role, invitedBy, expiresAt }`; `404` unknown, `410` used. |
| `POST /api/invites/:code/redeem/` | Adds the stylist role to the signed-in account and marks the invite used. |

**User**: `{ id, name, email, phone?, phoneVerified, roles: ("client"|"stylist"|"admin")[], avatarUri?, hairProfile?, createdAt, updatedAt }`. One account can hold several roles; stylist mode needs `stylist`.

---

## 6. Hair profile, consent and personal data

| Endpoint | Does |
| --- | --- |
| `GET /api/users/:id/` | The user. |
| `PATCH /api/users/:id/` | Name, avatar and similar. Own account only. |
| `PATCH /api/users/:id/hair-profile/` | Merges the fields sent into the profile. **Every change is also kept as a dated snapshot** (append-only): the length history is a growth curve and must never be overwritten. |
| `POST /api/users/:id/export/` | Queues a full data export, emailed to the account. Returns `{ requestedAt }`. |
| `DELETE /api/users/:id/` | Deletes the account and what's hers: stylist page, menu, portfolio, collections, care plans, shelf, looks, comments, reviews, snapshots, waitlist entries, analytics, likes. Bookings stay for the stylist's records with the client's name replaced by "Deleted account". |
| `POST /api/consents/` | `{ consents: [{ purpose, granted, policyVersion, recordedAt, source? }] }`. Stored as a history (append-only), never as a switch. The app records choices on the device first and syncs them, so accept past `recordedAt` values. |
| `POST /api/events/` | `{ events: [{ name, at, localAt }], anonymousId? }`. Batched analytics. Dropped when the account's latest analytics consent is withdrawn. Signed-out events carry `anonymousId`. |

**HairProfile** (every field optional; the profile fills in over time):

```text
texture: straight | wavy | curly | coily | kinky
length:        cropped | ear | chin | shoulder | armpit | bra-strap | mid-back | waist | hip | tailbone   (stretched)
shrunkLength:  same values                                                                               (as it shrinks)
lengthMeasuredAt, density: fine | medium | thick, porosity: low | medium | high,
goals: (growth | health | moisture | strength | color | style)[],
scalp: (balanced | dry | oily | flaky | sensitive)[],
chemicals: (relaxer | texturiser | colour | bleach | keratin)[]   (empty list = "none, ever", which is an answer)
area, budget: under_50 | 50_100 | 100_150 | 150_plus, photoUri, completedAt
```

> **Changed recently.** `length` is the stretched length and `shrunkLength` is the length as it shrinks: two separate answers. The old `lengthStretched` flag is gone.

---

## 7. Stylist page, menu and payment details

| Endpoint | Does |
| --- | --- |
| `GET /api/stylists/handle-available/?handle=` | `{ handle, available, suggestions? }`. Handles are lowercase and unique, and can't be a reserved word or one of the website's own paths (the app's `NOT_HANDLES` list), because `yasante.com/{handle}` is her page. |
| `POST /api/stylists/` | Creates her page as a draft (`published: false`, `verificationTier: 0`) and adds the stylist role. `409` if the handle was just taken. |
| `GET /api/stylists/me/` | Her full profile, private fields included. `404` if she has none. |
| `PATCH /api/stylists/me/` | Profile fields, hours (`availability`), policies and `paymentMethods`: at most 5, each `{ id, label ≤ 40, details ≤ 200 }`, incomplete ones dropped. |
| `POST /api/stylists/me/publish/` | Puts the page live. `403` until her phone is verified. |
| `GET /api/stylists/by-handle/:handle/` | Public page: `{ profile, menu, photos, confirmedStyles, reviews (latest 10 published), rating?: { average, count }, responseHours?, timingLabel? }`. `404` for drafts and when either side has blocked the other. Counts a page view unless it's her own. Omits `proofPhotoUri` and `paymentMethods`. |
| `GET /api/stylists/me/menu/` | Her services. |
| `POST /api/stylists/me/menu/` | Adds a service. |
| `PATCH /api/stylists/me/menu/:id/` | Edits one. |
| `DELETE /api/stylists/me/menu/:id/` | Removes one. |
| `POST /api/stylists/me/menu/import/` | `{ items: MenuItemDraft[] }`: many at once, from a pasted price list. Each validated like a single add. |

**StylistProfile**: `id, accountId, displayName, handle, bio?, avatarUri?, serviceModels: ("salon"|"home"|"mobile")[], baseArea, travelRadiusMiles?, instagramHandle?, policies, availability?, paymentMethods?, proofPhotoUri?, verificationTier: 0|1|2, published, createdAt`.

**Policies**: `{ noticeHours, depositType: "none"|"fixed"|"percent", depositAmount?, rescheduleFreeOnce: true }`. Fixed deposits are pounds; percent deposits are a percentage of the price.

**MenuItem**: `{ id, name, price > 0, fromPrice, durationMinutes?, note?, hairIncluded?, options?: PriceOption[] }`. A service needs a name and a price.

**PriceOption**: `{ id, group: "length"|"size", label, add ≥ 0, addMinutes? }`. The first option in each group is the base price. Malformed options are dropped.

**Pricing a choice** (used by booking and free times): price is the base plus each chosen option's `add`; minutes are the base duration plus each option's `addMinutes`. A service with option groups isn't fully priced until every group has a choice.

---

## 8. Portfolio, and sharing it to Looks *(new)*

| Endpoint | Does |
| --- | --- |
| `GET /api/stylists/me/portfolio/` | Her photos, newest first. |
| `POST /api/stylists/me/portfolio/` | `{ photos: [{ uri, serviceId? }], postAsLooks: boolean }`. Adds up to 20 at once and returns the created photos, each with `lookId` when it was shared. |
| `PATCH /api/stylists/me/portfolio/:id/` | Re-tag: `{ serviceId }`; an empty value clears it. |
| `DELETE /api/stylists/me/portfolio/:id/` | Removes a photo. A look already shared from it stays up; she can take it down separately. |

When a stylist adds work, "Also post to Looks" is on by default. With `postAsLooks: true`, the server creates one public look per photo, but only when **all** of these hold:

- her page is published (a draft page shares nothing);
- the photo is tagged with a service from her menu;
- that service's style can be told from its name: a taxonomy style whose name the service name contains, or which contains it, and otherwise a distinctive word of the style's name other than "braids" ("Boho knotless" is `knotless`). The app applies the same rule to tell her beforehand how many photos will be shared.

The look carries her as author and credited stylist, the photo, the service, its current price, and the style. Photos that don't qualify stay portfolio-only. Sharing is one transaction with the upload: either the photo and its look both exist or neither does.

---

## 9. Working hours and free times

**Availability**: `{ week: [Sun, Mon, …, Sat] each { start: "09:00", end: "18:00" } | null, blocked: ["yyyy-MM-dd", …] }`. Until she sets hours, treat every day as 09:00–18:00.

| Endpoint | Does |
| --- | --- |
| `GET /api/stylists/by-handle/:handle/slots/?service=&options=` | Public. `options` is comma-separated option ids. Returns `{ minutes, days: [{ date: "yyyy-MM-dd", times: [ISO, …] }] }`, listing only days with at least one time. |

The free times for a job:

- the job's length is the priced minutes of that service and those options (two hours if unknown);
- times start on the half hour, from opening, and the job must finish by closing; a job longer than her whole day may start at opening;
- nothing on blocked days or days she's off;
- nothing sooner than 3 hours from now, and nothing beyond 28 days;
- nothing overlapping her diary: every booking that is `requested`, `awaiting_deposit` or `confirmed` holds its time (the scheduled time, else a pending suggested time, else the requested time) for its length.

This endpoint is hit hard (every client choosing a service), so it has to be fast: keep each stylist's held ranges indexed by time, or cache the result per stylist and job length and invalidate it whenever her hours, menu or bookings change.

---

## 10. Bookings

The server owns the state machine. Every transition not listed here is refused with `409`.

| From | Can become |
| --- | --- |
| `requested` | `awaiting_deposit`, `confirmed`, `declined`, `expired` |
| `awaiting_deposit` | `confirmed`, `expired`, `cancelled_in_time`, `cancelled_late` |
| `confirmed` | `completed`, `no_show`, `cancelled_in_time`, `cancelled_late`, `cancelled_by_stylist` |
| everything else | final |

### Endpoints

| Endpoint | Who | Does |
| --- | --- | --- |
| `GET /api/bookings/?role=&status=` | Either | Her bookings as `client` or `stylist`, optionally filtered by comma-separated statuses. Newest first. Paginate once lists grow. |
| `GET /api/bookings/:id/` | Either side | One booking, shaped for whoever asks (see the privacy rules). |
| `POST /api/bookings/` | Client | `{ stylistId, serviceId, options?, bringingOwnHair, requestedTimes: [ISO], notes?, policyVersion }`. Refused when: phone not verified (`403`), stylist not published, booking herself, service not on the menu, an option group unchosen ("Pick your size so she knows what to quote"), a day she doesn't work, outside her set hours, or **clashing with her diary (`409` "Someone has just asked for that time. Pick another")**. Check the clash and create the booking atomically so two clients can't take the same time. Prices it from her menu and stores price, `fromPrice`, `optionLabels`, `durationMinutes`, `hairIncluded` and her policies with the version ticked. Holds the address (not sent yet). Lapses in 48 hours. |
| `POST /api/bookings/:id/accept/` | Stylist | `{ scheduledFor, deposit?: { amount, method } }`. No deposit: `confirmed`. A deposit: `awaiting_deposit`, with 24 hours to pay. Records her response time. |
| `POST /api/bookings/:id/propose/` | Stylist | Suggests another time (and deposit) instead. The client has 48 hours to answer. |
| `POST /api/bookings/:id/proposal/` | Client | `{ accept }`. Yes takes the suggested time as an accept would; no declines it ("The suggested time didn't work"). |
| `POST /api/bookings/:id/decline/` | Stylist | `{ reason? }` → `declined`. |
| `POST /api/bookings/:id/deposit-received/` | Stylist | Marks the deposit received → `confirmed`, which reveals the address to the client. |
| `POST /api/bookings/:id/cancel/` | Either | By the stylist: `cancelled_by_stylist`. By the client: `cancelled_late` if fewer than `noticeHours` remain before the appointment, else `cancelled_in_time`. Any cancellation releases the slot to the waitlist. |
| `POST /api/bookings/:id/attending/` | Client | "Yes, I'm coming", on a confirmed booking only. |
| `POST /api/bookings/:id/move/` | Either | `{ scheduledFor }` in the future, on a confirmed booking. One move is free; a second is refused ("Cancel it and book again instead"). Only one move can wait for an answer at a time. |
| `POST /api/bookings/:id/move/answer/` | The other side | `{ accept }`. Accepting moves it, counts the move, and clears the attendance answer. |
| `POST /api/bookings/:id/close/` | Stylist | `{ outcome: "attended"\|"no_show", timing?, actualPrice? }`. A no-show only after the start time. **Timing is never minutes**: `{ outcome: early\|on_time\|over, bucket?: under_30\|30_60\|1_2h\|2h_plus, reason? }`; a bucket is required unless on time, and the reason comes from the fixed list (each reason is client-side or stylist-side). |
| `POST /api/bookings/:id/started-on-time/` | Client | `{ onTime }`, once, after completion. |
| `POST /api/bookings/:id/contest/` | Client | `{ what: "no_show"\|"timing" }`, once each. |
| `GET / POST /api/slot-interests/` | Client | Waitlist: `{ stylistId, from, to }` (days). Returns entries with `openedOn` once a slot opened in the range. |
| `DELETE /api/slot-interests/:id/` | Client | Leave the waitlist. |

**Timing reasons** (the fixed list):

| Client-side | Stylist-side |
| --- | --- |
| `client_late`, `hair_not_prepped`, `wrong_hair`, `old_style_in`, `style_changed`, `long_breaks` | `took_longer`, `more_hair`, `previous_overran`, `working_alone`, `supplies`, `own_delay` |

**Booking** fields the app reads: `id, status, clientId, clientName, clientHair?, clientRecord?, stylistId, stylistName, stylistHandle, serviceId, serviceName, optionLabels?, price, fromPrice, durationMinutes?, bringingOwnHair, hairIncluded?, notes?, calendarUrl?, requestedTimes, scheduledFor?, expiresAt?, proposal?, attendanceConfirmedAt?, moves, moveRequest?, deposit?, area, address?, policy, policyVersion, reason?, completedAt?, actualPrice?, timing?, startedOnTime?, contested?, review?, checkInDue?, createdAt, updatedAt`.

**Client record** (stylist's copy only): `{ attended, noShows, lateCancellations }`, counted from her history.

---

## 11. Reviews and check-ins

| Endpoint | Does |
| --- | --- |
| `POST /api/bookings/:id/review/` | Client of a completed booking, once. `{ rating: 1–5, body? ≤ 1000 }`. Starts `pending`; published after moderation. Stores the first name only as the author. |
| `POST /api/reviews/:id/report/` | `{ reason: not-real\|private\|hate\|other, note? }` to moderation. |
| `POST /api/bookings/:id/check-in/` | `{ week: 2\|4, holding: fresh\|okay\|tired, scalp: comfortable\|itchy\|sore, again: yes\|maybe\|no }`. Only while that check-in is open: week 2 from day 14 to 28 after completion, week 4 from day 28 to 42, each answered once. |

The client's copy of a booking carries `review: { rating, status }` once she's reviewed it and `checkInDue` while a check-in is open.

---

## 12. Looks feed

Home is a grid of looks people post: a stylist's work, or a client's own hair crediting who did it. The feed is public; signing in adds likes, saves, blocks and her own.

| Endpoint | Does |
| --- | --- |
| `GET /api/looks/?cursor=&limit=&hair=&style=&area=` | Public, newest first, 20 per page by default. Filters combine (hair texture, style id, stylist's district). Excludes private looks and anyone blocked either way. |
| `GET /api/looks/:id/` | Public. `404` if private (unless hers), blocked, or gone. |
| `GET /api/looks/mine/` | Her own, private included. |
| `POST /api/looks/` | `{ photoUri, caption?, serviceId?, bookingId?, styles: [id], hairTexture?, productIds?, visibility? }`. Needs a photo and at least one taxonomy style (at most 3). A client credits her stylist only via her own completed `bookingId`; a published stylist's post credits herself and may tag her own service. Service name and price are copied from the menu at posting time. `productIds` must be catalogue products, at most 5. |
| `DELETE /api/looks/:id/` | Her own only. |
| `POST / DELETE /api/looks/:id/like/` | Idempotent like and unlike. |
| `GET /api/styles/` | The style taxonomy: `[{ id, name }]`. Cache for an hour. |
| `GET /api/looks/areas/` | Districts that have looks, sorted. |

**Look**: `id, authorId, authorName, authorHandle?, authorAvatarUri?, photoUri, thumbUri, photoAspect, caption?, stylist?: { id, name, handle? }, serviceId?, serviceName?, price?, fromPrice?, styles, hairTexture?, area?, products?: [{ id, brand, name }], visibility, likeCount, liked, commentCount, saveCount, saved, createdAt, mine`.

- `commentCount` counts comments and replies.
- `saveCount` is the number of distinct people with the look in any of their collections (saving it into two collections counts once); `saved` is whether the viewer has it in one.
- Author name, handle and avatar are the author's current ones, so a renamed stylist shows her new name everywhere.

---

## 13. Comments, replies and likes

Threads are one level deep, the way social apps show them: a reply to a reply joins the same thread and names who it answers.

| Endpoint | Does |
| --- | --- |
| `GET /api/looks/:id/comments/?cursor=&limit=` | Public. Top-level comments only, **newest first**, 20 per page, each with `replyCount`. |
| `GET /api/comments/:id/replies/?cursor=&limit=` | Public. One thread's replies, **oldest first**, 10 per page. Loaded only when someone opens a thread, so a look with thousands of replies still opens with one small request. |
| `POST /api/looks/:id/comments/` | `{ body, replyTo? }`. Body trimmed, 1–500 characters. `replyTo` may be any comment on that look, top-level or reply; the new reply's `parentId` is always the thread's top-level comment and `replyToName` names the person answered. Refused if either side has blocked the other. Returns the comment as the lists do. |
| `DELETE /api/comments/:id/` | Her own only. Deleting a top-level comment removes its thread; deleting a reply removes only that reply. |
| `POST / DELETE /api/comments/:id/like/` | Idempotent like and unlike, on comments and replies alike. |

**Comment**: `id, lookId, authorId, authorName, authorAvatarUri?, body, createdAt, mine, parentId?, replyToName?, replyCount? (top-level only), likeCount, liked`.

The app shows new comments immediately and patches its own copy of the thread instead of reloading it, so the response must be the complete comment.

---

## 14. Reports and blocking

| Endpoint | Does |
| --- | --- |
| `POST /api/looks/:id/report/` | `{ reason, note? }` into the moderation queue. |
| `POST /api/comments/:id/report/` | Same. |
| `POST /api/stylists/:accountId/report/` | Same. |
| `POST /api/blocks/` | `{ accountId }`. Mutual from that moment: looks, comments, replies, pages and interactions disappear both ways. |

Report reasons: `not-their-work` (not for comments), `nudity`, `hate`, `scam`, `other`. The reported person is never told who reported them.

Moderation needs internal tooling (not part of the app): review queue, reports, and stylist verification (proof photo, then setting `verificationTier`).

---

## 15. Collections, care plans and the product shelf

### Collections

| Endpoint | Does |
| --- | --- |
| `GET /api/collections/` | `[{ id, name, isPrivate, createdAt, itemCount, coverUri? }]`. |
| `POST /api/collections/` | `{ name, isPrivate }`. |
| `PATCH / DELETE /api/collections/:id/` | Rename, change privacy, or delete. |
| `GET /api/collections/:id/items/` | `[{ id, kind, refId, imageUri?, title?, addedAt }]`. |
| `POST /api/collections/:id/items/` | `{ kind: "look"\|"content", refId, title?, imageUri? }`. For a look, the server fills image and title from the look. Updates that look's `saveCount` when this is the person's first collection holding it. |
| `DELETE /api/collections/:id/items/:itemId/` | Removes it; lowers `saveCount` when it was her last copy. |

### Care plans

CRUD at `/api/care-plans/` and `/api/care-plans/:id/`. A plan is:

```text
{ id, name,
  frequency: daily | every-2-days | weekly | specific-days,
  specificDays?: 0–6[],            // Sunday = 0
  timeOfDay: morning | afternoon | evening | night,
  remindersOn, steps: [{ id, text }], lastDoneAt?, createdAt }
```

The app sends steps as text in order; the server assigns ids. Sessions: `GET / POST /api/care-plans/:id/sessions/`, append-only `{ id, completedAt, notes? }`; logging one sets `lastDoneAt`.

### Products and shelf

| Endpoint | Does |
| --- | --- |
| `GET /api/products/?q=&limit=` | Catalogue search: every word must match brand, name or category. `limit` up to 50. |
| `GET /api/shelf/` | Her shelf, most recently started first. |
| `POST /api/shelf/` | `{ productId }`; `409` if already on it. Starts as `using`, bought once. |
| `PATCH /api/shelf/:id/` | `rating` 1–5 (stored together with her hair profile at that moment, so ratings can later be read against hair like hers); `status: "finished"` sets `finishedAt`; `"repurchased"` from finished puts it back in use and adds one to `timesBought`. |
| `DELETE /api/shelf/:id/` | Removes it. |

### Content and favourites

The education library and favourites already call `/api/content/content/…` and `/api/favorites/favorites/…` on the existing API. Keep those working as they are.

---

## 16. Stylist numbers, summary and labels

| Endpoint | Does |
| --- | --- |
| `GET /api/stylists/me/summary/` | `{ pendingRequests, appointmentsToday }`. Drives the badge on the mode switch, so keep it cheap. |
| `GET /api/stylists/me/numbers/` | `{ weekOf, thisWeek, lastWeek, timing }`. Weeks start Monday 00:00. Each week: `views, requests, confirmed, completed, noShows, lateCancellations, earned` (sum of recorded `actualPrice` on completed appointments). |

- **Timing per service** (private to her, any sample size): `{ serviceId, serviceName, quotedMinutes, typicalMinutes, sample, early, onTime, over, clientSide }`. Typical minutes is the median of each close-out's quoted length moved by the middle of its bucket (15, 45, 90 or 150 minutes), earlier or later. `clientSide` counts overruns with a client-side reason.
- **Public timing label** ("Usually finishes on time"), shown only when earned: at least 10 completed appointments and 6 usable timing records in the last 12 months, and one outcome at 60% or more. A record isn't usable if it's contested or its reason is client-side, so a late client can never cost her the label. Returns `{ outcome, count, sample }`.
- **Response time**: the median hours between a request arriving and her answering it (accept, suggest or decline).
- **Rating**: the average of all published reviews, one decimal, with the count.

Precompute these as bookings change rather than calculating them on each page view: public stylist pages are among the most-read responses.

---

## 17. Background jobs

These run on their own, on time, without anyone opening the app.

| Job | When | Does |
| --- | --- | --- |
| Request lapses | 48 h after a request or a suggested time with no answer | → `expired`; releases the slot; counts against her response rate. |
| Deposit lapses | 24 h after accepting with a deposit, unpaid | → `expired`; releases the slot. |
| Auto-complete | 24 h after an appointment's end if nobody closed it | → `completed`. |
| Attendance reminder | The day before a confirmed appointment | Push to the client with the "Yes, I'm coming / I can't make it" buttons. |
| Slot released | On any cancellation or lapse | Everyone on that stylist's waitlist for that day gets `openedOn` set and a notification, except the client whose booking it was. |
| Check-ins | Day 14 and day 28 after completion | Ask how the style is holding up. |
| Data export | On request | Email the account's data. |

Every read must reflect these state changes at their due time, even if a job runs slightly late: a request past its lapse time must never be accepted.

---

## 18. Notifications

Push notifications carry a `data` object the app acts on when tapped:

```json
{
  "mode": "client | stylist",
  "url": "/requests/bk_123",
  "bookingId": "bk_123"
}
```

- `mode` says which side of the app to open, `url` the screen, and `bookingId` is for notifications with answer buttons.
- The day-before reminder is sent with the category `attendance` and `bookingId`. The app registers its buttons, `coming` and `cant`: "coming" calls `/attending/`, "cant" opens the booking with its cancel warning.
- Send one for: a new request, an accept or suggested time, a deposit to pay, a deposit marked received, a cancellation, a move asked or answered, a lapse, a slot opening, a check-in due, and a review published.
- Stylist-side notifications use `mode: "stylist"` so the app switches to stylist mode before opening.
- Queue and send them in the background, and never twice for the same event.

---

## 19. Needed, but not in the app yet

These have no mock yet. Build them to the shapes below; the app team will wire them in.

| What | Needed |
| --- | --- |
| Photo upload *(new)* | An endpoint that gives the app a short-lived upload target, and on completion returns the photo's permanent URL, a grid-sized copy (`thumbUri`), and `photoAspect` (width ÷ height). Strip location metadata; resize huge originals. Used by posting a look, adding work, avatars, the hair profile photo and the verification photo. Every URL in the rest of this brief (`photoUri`, `uri`, `avatarUri`) is one of these. |
| Push token registration *(new)* | `POST /api/devices/` `{ token, platform }` on sign-in, `DELETE` on sign-out, so notifications go to the right phones. |
| Calendar link | `calendarUrl` on confirmed bookings: an .ics file for that appointment, with the address once confirmed. |
| App links | The website serves `/.well-known/apple-app-site-association` (team ID + `com.yasante.app`) and `/.well-known/assetlinks.json` (package name + signing certificate SHA-256), so yasante.com links open the app. |
| SMS and email delivery | Phone codes, password resets and data exports. |
| Moderation tools | Reviews, reports, and stylist verification. |

---

## 20. Definition of done

- Every endpoint above returns the shapes and messages described, and the app works against it with that endpoint's mock deleted.
- Every scenario in the app's mock tests passes against the real server: the booking state machine, pricing, free times and clashes, the privacy rules, threaded replies, likes, saves, blocking, private looks, posting and credit, portfolio sharing, payment methods, timing labels and numbers.
- Every rule in section 4 has an automated test on the server.
- The speed targets in section 2 hold in a load test at ten times expected launch traffic, on production-sized data (at least a million looks and ten million likes and comments).
- The background jobs fire on time and survive a restart without losing or repeating work.

> **Questions.** If anything here disagrees with how the app behaves, the app's mock (`src/mocks/`) is the reference for now. Raise the difference rather than guessing, and we'll settle it in this brief.
