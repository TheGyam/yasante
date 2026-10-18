# Featured stylists: the plan

This file is part of the brief for tasks 009, 010, 011 and 012. Read all of it
before you read your own task. Where your task and this file disagree, stop and
ask (set `status: blocked`); do not pick one.

## The problem

Yasante launches with almost no stylists, so clients would open an empty app.
Stylists ignore cold messages asking them to "join an app". So we turn it
around: with a stylist's permission, Yasante builds her page for her from her
public Instagram posts, and clients can already find her work, see what each
style is, and join a waitlist for her. When she wants to, she claims the page in
a couple of minutes, sets her prices and hours, and everyone waiting is told she
now takes bookings.

The only thing she ever has to do before claiming is say "yes" in a message.

## How it works, start to finish

1. **Staff ask.** Someone at Yasante messages her on Instagram: "Can we feature
   some of your braids on Yasante? We'll credit you and link to your Instagram.
   You don't need to do anything." She says yes.
2. **Staff build her page** on the staff site (task 010): her name, Instagram
   handle, area and photo, then her photos, saved from her public posts, each
   tagged with its style and hair type. A look can have up to 5 photos, as
   anywhere else. They write down where and when she said yes.
3. **Staff can show her before it goes live.** Her private link
   (`yasante.com/claim/<code>`) opens her page as it will look, whether or not it
   is live yet. Staff send it in the same Instagram chat.
4. **Staff put it live.** Her page, her looks and her styles now show in the app
   and on the website, marked **Featured**. There is no price, no booking, no
   reviews, nothing she hasn't said herself. Instead:
   - **Book on Instagram** opens her Instagram profile.
   - **Join the waitlist** lets a signed-in client be told when she takes
     bookings. It changes to **On the waitlist** with a tick; tapping again
     leaves it.
   - At the bottom: **Is this you? Make this page yours.**
5. **She claims it, whenever she likes.** She opens her link, signs up or signs
   in the normal way (email and password, email code, Apple or Google), and
   taps **Make it yours**. The page, its photos and looks become hers. The link
   is spent.
6. **She finishes her page** on a short checklist (**Finish your page**):
   - **Price your styles.** One question per style her photos are tagged with:
     "6 of your photos are knotless braids. What do you charge?" Answering
     creates the service on her menu and links those photos and looks to it in
     one step.
   - **Set your hours.** The existing hours screen.
   - **Check your tags.** "We tagged your photos for you. Fix any we got
     wrong."
7. **She takes bookings.** The first moment her page has at least one service
   and working hours, the **Featured** label becomes **Book**, and everyone on
   her waitlist gets one notification: "{name} is taking bookings. You joined
   the waitlist for {name}. Book now on Yasante." Then the waitlist is emptied.
8. **If she ever says no,** staff press **Take the page down** and everything
   staff made for her (page, photos, looks, waitlist) is deleted at once. The
   files go too.

**Is this you?** Anyone can tap it, so it must never hand over the page. It
opens a short note: "Message @yasantebeauty on Instagram from @{handle} and we'll send
you a link to make this page yours." Staff check that the message really came
from the Instagram account saved on the page, then send her a fresh link in
that chat. There is no code to type; the proof is which account sent the
message.

## Words we use

Yasante is **@yasantebeauty** on Instagram (`https://www.instagram.com/yasantebeauty/`) and **@yasante_beauty** on TikTok (`https://www.tiktok.com/@yasante_beauty`), as in the site footer.

**Instagram, TikTok or both.** A stylist may be on either or both (`instagramHandle`, `tiktokHandle`; at least one on a featured page). Their Yasante address is the Instagram handle, else the TikTok one. The book button is **Book on Instagram**, or **Book on TikTok** when they're only on TikTok; with both, Instagram leads and an **Also on TikTok** link sits beside it. The claim note names the app(s) they're on: "Message @yasantebeauty on Instagram from @{instagram}, or @yasante_beauty on TikTok from @{tiktok}, and we'll send you a link to make this page yours." Server messages say "Message @yasantebeauty on Instagram or @yasante_beauty on TikTok".

Use exactly these words in every screen, button, message and error. Plain,
friendly, short. Never use the words placeholder, unclaimed, claim token,
redeem, provisioned or featured page in anything a person sees (they are fine in
code). Refer to the stylist by her name or handle, not "she" or "they", so the
copy never guesses anyone's pronouns.

| Where | Words |
| --- | --- |
| Label on her page and her looks | **Featured** |
| Line under her name | Not taking bookings on Yasante yet |
| Button to her Instagram | **Book on Instagram** |
| Waitlist button | **Join the waitlist** → **On the waitlist** (with a tick) |
| Under the waitlist button | We'll let you know when {name} takes bookings. |
| Signed out, taps the waitlist | Sign in to join the waitlist |
| Footer link | Is this you? Make this page yours. |
| Footer note | Message @yasantebeauty on Instagram from @{handle} and we'll send you a link to make this page yours. |
| Her link, top | This is your page, {name} |
| Her link, waiting count (only if more than 0) | 14 people are waiting to book you |
| Her link, button | **Make it yours** |
| Her link, signed out | Sign up or sign in, then this page is yours. |
| Her link, done | It's yours. Next, add your prices. |
| Link used or expired | This link has already been used or has run out. Message @yasantebeauty on Instagram for a new one. |
| Already has a page | You already have a page on Yasante. Message @yasantebeauty on Instagram and we'll put the two together. |
| Checklist title | **Finish your page** |
| Price step | {count} of your photos are {style}. What do you charge? (one photo: "1 of your photos is {style}.") |
| Tags step | We tagged your photos for you. Fix any we got wrong. |
| Notification to the waitlist | Title: {name} is taking bookings. Body: You joined the waitlist for {name}. Book now on Yasante. |
| Staff section | **Featured stylists** |
| Staff buttons | Add a featured stylist · They said yes · Put the page live · Copy their link · Make a new link · Take the page down |

## Principles (these are review criteria, not suggestions)

**Intuitive.** A client should understand a featured page without reading
anything: it looks like every other stylist page, with one honest difference.
A stylist claiming her page should never meet a form she doesn't need. Every
screen has one obvious next step. Errors say what happened and what to do next,
in a sentence. Empty states say what will appear there. Nothing is a dead end.

**Ingenious.** Each piece should do more than one job with less:
- Her link is the preview, the proof she owns the Instagram account (it only
  ever goes to her inbox) and the way in, all in one.
- Her tags become her menu: pricing a style creates the service and makes
  every photo of it bookable at once.
- The waitlist turns waiting clients into the reason she claims, and tells us
  which stylists clients want most.
- Featured pages reuse every existing screen, list and endpoint. A featured
  page is a normal stylist page owned by a stand-in account, so nothing that
  shows stylists needs a second path.

**Fast.** Industry-grade speed is a requirement:
- No new N+1 queries. Every list adds at most one query per page for
  "featured", however long the page. Prove it with `django_assert_max_num_queries`.
- Indexes on every new column used to filter or sort.
- Waitlist taps are one indexed write; the count is one indexed `COUNT`.
- The notification fan-out runs in a background (Celery) task after the
  transaction commits, never inside a request.
- The app and website update the waitlist button at once (optimistic) and
  roll back on error.
- No new dependencies anywhere.

**Secure.** This feature hands a page over to whoever holds a link, so:
- The claim code is `secrets.token_urlsafe(24)`. Only its SHA-256 hash is
  stored. The plain code is shown to staff once, when the link is made; a new
  link replaces the old one, which then stops working.
- A link works once and runs out after 7 days.
- Claiming runs in one transaction with the page locked (`select_for_update`),
  so two people opening the same link at once can't both claim it.
- Claiming needs a signed-in account with a confirmed email (an Apple or
  Google sign-in counts as confirmed). An account that already has a stylist
  page is refused.
- Stand-in accounts can never sign in: unusable password, an email at
  `yasante.invalid`, and every sign-in path refuses them anyway.
- Who is on a waitlist is never shown to anyone, not even the stylist. The
  number is shown only to staff and to whoever holds her link.
- The page's Instagram handle is fixed by staff while the page is featured;
  nobody else can change where "Book on Instagram" points.
- Every staff action and every claim is written to the staff audit log.
- Staff endpoints need staff sign-in, CSRF and the model's permission, like
  the rest of the staff site.
- Featured pages are `noindex` and left out of the sitemap: she agreed to be
  on Yasante, not to be put in search engines before she owns the page.
- Claim pages send `Referrer-Policy: no-referrer` so the code never leaks to
  another site.

**Honest.** Show only what is real: no made-up prices, reviews, ratings or
availability. Business numbers (metrics, insights, digests) never count
featured pages as stylists on Yasante.

## How it fits the code

- A featured page is an ordinary `StylistProfile` with `featured=True`, owned
  by a stand-in `User` that only exists to own it. Its looks, portfolio photos
  and media are owned by that stand-in. Claiming moves all of it to her real
  account and deletes the stand-in.
- Staff-only facts live in a new `FeaturedPage` row, one-to-one with the
  profile: the Instagram handle she agreed from, when and how she said yes, who
  added her, the link's hash and expiry, and when it was claimed and by whom.
- The waitlist is a new `PageWaitlist` row per client and page. It is not the
  existing slot waitlist (`SlotInterest`, "Tell me if a slot opens"), which
  waits for a free day with a stylist who already takes bookings.

## The tasks

| Task | What | Who | Needs |
| --- | --- | --- | --- |
| 009 | Server: models, claiming, waitlist, staff endpoints, every rule above | Codex | — |
| 010 | Staff site: the Featured stylists section | Codex | 009 merged |
| 011 | Website: featured pages, waitlist, claiming, Finish your page | Codex | 009 merged |
| 012 | App: the same as 011, in the app | Codex | 009 merged |

010, 011 and 012 touch different folders and can run side by side once 009 is
merged. The website (011) matters most: the apps aren't in the stores yet, so a
stylist who taps her link on her phone lands on the website.
