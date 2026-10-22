# Sharing collections and care plans: design and plan

Yaw asked on 21 October 2026 for people to share their collections and care plans. A
link opens in the app, where anyone can look and then **tag along** (it stays
in their Planner and updates as the author changes it, but they can't edit it) or
**make it theirs** (their own version, cut off from the author, to change as they
like). Care plans people tag along with still let people set their own days, times and
reminders. He asked for the design to be shown on the phone before anything else, and
for everything (flow, motion, speed, security, privacy) to be top grade.

**Status:** design approved by Yaw on 22 October 2026, with "Follow" renamed **Tag
along**. He approved the policy, terms and guidelines wording in Appendices A and B the
same day. Built on the branch for it, not yet merged: the server (sharing, tagging along,
making it yours, filtering, limits, the daily note to people tagging along), the app
against it, care plan reminders on the phone, yasante.com/c and /p pages, reporting and
the staff queue, and the policy versions 2026-10-24.

When something people tag along with stops being shared, they get a quiet notification
("Winter braids isn't shared any more") rather than a note in the Planner.

**Not built, on purpose:** the "Updated by Ama" note and the glow on a new step when
opening something that changed (the daily notification says it changed), and a collage
share image for /c links (they use the first picture).

## 1. What's true today

- **"Keep it private" does nothing.** Every collection is visible only to its owner,
  private or not, so nothing has leaked. But turning it off only removes the lock icon,
  and the app promises "A public one can be shared as a page", which doesn't exist.
- **Care plan reminders never fire.** The switch is saved; nothing schedules them.
- **Links into the app work.** yasante.com is verified for the app on iPhone and
  Android (`.well-known` files are live), and `app/+native-intent.tsx` routes paths.
- Only `yasante://collection/<id>` links exist, and only for the owner's own items.

## 2. How the best apps do it, and what Yasante takes

- **Spotify playlists:** "Add to library" follows a playlist live; "Add to other
  playlist" copies the songs into your own. Followers never edit; the owner sees a
  follower count, never who.
- **Pinterest boards:** a board can be secret or visible; a shared board link opens
  the board in the app; saving a single pin is separate from following a board.
- **Notion and Google Docs:** "Anyone with the link" sharing, stopped any time;
  "Duplicate" makes your own copy.
- **Apple Reminders and Calendar:** a shared list keeps one source; your alerts are
  your own.

**Yasante takes:** "Anyone with the link" sharing, off by default; **Tag along** (live,
read-only, like Spotify's library); **Make it yours** (a copy, like Duplicate);
counts the owner can see, never names; and for care plans, the author's steps with
**your own schedule** (like a shared calendar with your own alerts).

## 3. Words

| Where | Words |
| --- | --- |
| Who can see it | "Only you" / "Anyone with the link" |
| Share sheet title | "Share Winter braids" |
| Main buttons on a shared link | "Tag along" (then "Tagging along") and "Make it yours" |
| On something you tag along with | "By Ama" on the card; "Tagging along" on its page; a "Tagging along" section in the Planner |
| Leaving | "Stop tagging along" |
| On something you made yours | "Based on Winter braids by Ama" (Ama's name tappable) |
| Owner's numbers | "6 tagging along · 2 made it theirs" |
| Stopping | "Stop sharing" |
| Gone | "This isn't shared any more" |

"Based on" credits the author warmly and says it started from hers, without the
"copied" feel. The author's name stays as long as her account does.

## 4. Flows

### Sharing (the author)
1. On a collection or a care plan, the header has a **Share** button (beside Edit).
2. It opens a glass **share sheet**: a strip of the first cover photos (a collection)
   or the step count (a plan), then **Who can see it**: "Only you" or "Anyone with the
   link", each with one line saying what it means.
3. Choosing "Anyone with the link" shows **Share link** (the phone's own share sheet,
   which has Copy on both iPhone and Android) and the numbers: "6 tagging along · 2 made
   it theirs".
4. Sharing needs a username, so people see "@ama", not an email. If she has none, she's
   asked first (the same screen comments use), then returned to the sheet.
5. **Stop sharing**: switching back to "Only you". If people tag along, a confirm says
   "The 6 people tagging along will lose it. Versions people made theirs stay theirs."
   The link stops working at once. Sharing again makes a new link.
6. Under the collection's title, a quiet status line: a lock and "Only you", or a link
   icon and "Shared · 6 tagging along". Tapping it opens the sheet.

### Opening a shared link (anyone)
1. A yasante.com link opens the app straight on the **shared view**. Without the app,
   yasante.com shows the same page with "Open in Yasante" and the store badges.
2. **Collection:** a large mosaic of the first four photos, the name, the author (photo,
   name, @username), "14 looks · Updated 2 days ago", then **Tag along** (filled) and
   **Make it yours** (outlined), then the grid of looks and articles. Tapping one opens
   it as usual.
3. **Care plan:** a glass card with the name, the author, the author's rhythm ("Weekly ·
   Evenings") and the numbered steps, then **Tag along** and **Make it yours**.
4. Signed out: anyone can look. Tag along and Make it yours ask her to sign in or join, then
   bring her straight back and finish what she tapped.
5. Her own link opens her own collection or plan, not the shared view.
6. If it's stopped, deleted, or either has blocked the other: "This isn't shared any
   more", with a way back to Home.
7. The "…" menu: Share, Report.

### Tagging along
- **Collection:** one tap. The button turns into "✓ Tagging along" (a spring and a light
  haptic). It joins her Planner under **Tagging along**, with the author's photo on the card
  and "By Ama". Opening it shows the shared view with a "Tagging along" button whose
  sheet has **Make it yours** and **Stop tagging along**. She can still save any single look into
  her own collections.
- **Care plan:** Tag along opens a short sheet, **When will you do it?**, starting from the
  author's rhythm: how often, which days, morning to night, and Remind me. "Tag along"
  saves it. The plan sits in her care plans with "By Ama", works exactly like her own
  (the ring, the last two weeks, "I did this today", her own history), and its steps
  are the author's, kept up to date. Edit opens only her schedule. A line under the
  steps says "Steps by Ama Owusu · Kept up to date" with "Make it yours to change the
  steps".
- When the author changes it, the next time she opens it a small "Updated by Ama" note
  shows for that visit, and a new step glows once.
- If the author stops sharing or deletes it, it leaves her Planner; the next time she
  opens the Planner a one-line note says so.

### Making it yours
1. "Make it yours" opens a sheet with the name (hers to change; if she already has
   one called that, "Winter braids 2"), "Who can see it" set to "Only you", and one
   line: "You'll get your own version to change as you like. It won't change when Ama
   updates hers."
2. **Make it yours** creates it and opens it. Under the title: "Based on Winter
   braids by Ama".
3. From something she tags along with, it swaps in place: it becomes hers, and she
   stops tagging along.
4. A care plan keeps her schedule, and its steps become editable.

### Reminders (needed for care plans to mean anything)
Remind me schedules phone notifications on her days at her time of day (morning 8:00,
afternoon 13:00, evening 19:00, night 21:30, her local time), for her own plans and the
ones she tags along with. Turning it on asks for notification permission if needed, with a
clear reason first. Turning it off, deleting or stopping tagging along cancels them.

### Notifications about what she tags along with
At most one a day, only when something changed: "Ama added 3 looks to Winter braids",
"Ama changed the steps in Wash day". It has its own switch in Settings → Notifications:
"Collections and plans you tag along with", on by default.

## 5. Motion

All on the UI thread, springs with no bounce, respecting Reduce Motion (which swaps
movement for a short fade):

- **Share sheet:** the app's glass sheet (280 ms spring). The two "Who can see it" rows
  are a radio pair; the tick moves with a spring and the Share link button fades and
  rises in under it.
- **Tag along:** press scales to 0.97; on success, the label cross-fades to "Tagging
  along",
  a tick pops in, the fill eases from accent to glass over 220 ms, a light haptic.
- **Shared view:** the mosaic photos fade in as they load, never popping; the grid rises
  in rows, as the Planner does.
- **Make it yours:** the sheet closes and her new collection slides in, with a success
  haptic.
- **Updated by Ama:** the note fades in after the page settles; a new step glows once.

## 6. Speed

- The shared view is one request (the header and the first page of items), cached on
  the phone, with photos prefetched as it loads. Opening a link shows the page skeleton
  immediately, never a blank screen.
- Items she tags along with read the author's current content, cached and refreshed when opened;
  a pull refreshes.
- No new app dependencies: the share sheet is the phone's own; reminders use
  `expo-notifications`, already installed.

## 7. Security and privacy

- **Links carry a random 128-bit code**, not the collection's id, so they can't be
  guessed or counted through. Stopping sharing kills the code; sharing again makes a new
  one.
- **Off by default.** Every existing collection becomes "Only you", even ones with the
  old switch off, so nothing is shared by surprise.
- **Only what's meant to be seen:** a shared collection never shows the owner's
  private looks, removed or hidden looks, or anything from someone the viewer has
  blocked or who has blocked them. Each viewer's page is filtered for them.
- **What others see:** the name, the items, the author's display name, @username and
  photo. Never her email, hair profile, schedule or history. People tagging along see the plan's
  steps, never the author's history or reminders.
- **Owners see counts, never who.**
- **Not searchable:** shared pages carry `noindex` and aren't in the sitemap.
- **Limits:** tagging along and copies are rate-limited per account; the shared view
  per address.
- **Reports:** a shared collection or plan can be reported like a look (its name,
  steps or cover). The staff site gets a queue entry with the content and a "Stop
  sharing" action.
- **Deleting:** deleting an account deletes what it shared (people tagging along lose it) and
  removes its name from "Based on" lines. Versions others made theirs stay theirs. What
  she tags along with and what she's shared are in her data download.

## 8. Data (server)

- `Collection` and `CarePlan` gain `share_token` (unique, empty when not shared),
  `shared_at`, `source` (what it follows or was based on), `following` (true while it
  follows its source), and `based_on_name` and `based_on_author` (kept for the "Based
  on" line). `is_private` gives way to the share token; the API keeps returning
  `isPrivate` for older apps.
- A followed item is a row she owns that reads its source's items or steps. For a care
  plan, its own `frequency`, `specific_days`, `time_of_day` and `reminders_on` are hers;
  steps come from the source. Her `CarePlanSession`s are hers either way.
- The uniqueness of a name per person applies only to her own items, not followed ones.

### API
- `POST /api/collections/:id/share/` and `DELETE` (stop) → `{shareUrl, following, made}`.
- `GET /api/shared/collections/:code/` → the shared view (anyone).
- `POST /api/shared/collections/:code/follow/`, `DELETE` (unfollow).
- `POST /api/shared/collections/:code/make-mine/` → her new collection.
- `POST /api/collections/:id/make-mine/` (from something she follows).
- The same for care plans under `/api/care-plans/` and `/api/shared/care-plans/`, with
  the schedule in the follow request.
- yasante.com: `/c/<code>` and `/p/<code>`, with link previews (title, author, a collage
  image) and `noindex`.

## 9. Documents (approved by Yaw on 22 October 2026; published by merging)

- **Privacy policy:** sharing (what others see), tagging along, notifications about
  what you tag along with, the "Based on" credit, and that "More like this" now records what you see
  there too, like the feed.
- **Terms of use:** sharing your collections and plans, others tagging along or making
  them theirs, and that shared content follows the guidelines.
- **Community guidelines:** care plan steps must be safe (no dangerous chemical or
  medical advice); collection names follow the same rules as captions.
- **DPIA:** sharing, tagging along, reminders.
- **Online safety assessment:** shared collections and plans are new user content;
  how they're reported and moderated.
- **Moderation guide:** the new queue item and "Stop sharing".

## 10. Phases

| # | What |
| --- | --- |
| 1 | Design on the phone, against mock data, for Yaw's approval |
| 2 | Server: models, sharing, following, making it yours, filtering, limits, tests |
| 3 | App: share sheet, shared views, following, making it yours, the Planner |
| 4 | Reminders for care plans |
| 5 | Notifications about what she tags along with |
| 6 | Website pages and link previews |
| 7 | Reports and the staff queue |
| 8 | Documents, approved by Yaw before the privacy policy is published |

## Appendix A: privacy policy wording (approved; published as version 2026-10-24)

Yaw also asked, on 22 October, for the opening's broken "CYPA (privacy@yasante.com)."
to read "If you have a question about your information, email privacy@yasante.com.",
and for the sentence about the staff site's cookies to go.

The live policy is version 2026-10-22. These changes would make it 2026-10-24 (or the
day it's published), shown to everyone with the "We've updated" notice. Each is an
addition or a replacement of one sentence; nothing else changes.

**Section 1, "What you post and do"**: after "care plans with their steps and the
sessions you log", add: "collections and care plans you share, and the ones you tag
along with or make your own,".

**Section 6, "Who sees your information"**: add after the first sentence:

> If you share a collection or a care plan, anyone with its link can see its name and
> what's in it (for a care plan, its steps), with your name, username and photo. They
> can tag along, which keeps it in their Planner as you change it, or make their own
> version, which says it's based on yours and names you. You see how many people tag
> along and made it theirs, never who. Nothing else of yours is shown: not your hair
> details, your schedule, your reminders or the days you did a plan. You can stop
> sharing at any time, and the link stops working straight away.

**Section 7, "On your phone"**: add: "Care plan reminders are set on your phone itself,
for the days and time of day you choose."

**Section 8, "How long we keep it"**: after "care plans and consent records", add:
"Anything you shared stops being shared, so people tagging along lose it; versions
others made their own stay theirs, without your name." And replace "What you're shown
and open in the feed: 90 days." with "What you're shown and open in the feed and in
\"More like this\": 90 days."

## Appendix B: terms and guidelines wording (approved; published as version 2026-10-24)

**Terms of use, "Your content"**: add: "If you share a collection or a care plan, you
let others with the link view it, tag along and make their own version of it. You can
stop sharing at any time; versions others have made stay theirs."

**Community guidelines**, add under "What you post":
- "Care plans you share must be safe to follow. Don't share steps that could harm
  someone's hair, scalp or health, such as leaving chemicals on longer than their
  instructions say, or medical advice."
- "Collection and care plan names follow the same rules as captions."
