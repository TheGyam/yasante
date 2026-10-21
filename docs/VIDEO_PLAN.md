# Video posts, and the infrastructure under them: design and plan

Yaw asked on 21 October 2026 for a plan for video posts, as good as the best apps in
every way: speed, performance, security, safety, privacy, cost. He also asked for the
infrastructure and subscriptions it needs, and anything else worth upgrading while
we're there. **This is a plan only.** Nothing here is built yet. Everything that costs
money, adds a service that handles people's data, or changes a policy waits for
Yaw's yes (section 17).

Prices were checked on 21 October 2026 (sources at the end). They change: check them
again before signing up to anything.

## 1. Where things stand today

- The `video_posts` feature switch exists, but **nothing reads it**. Turning it on does
  nothing.
- A look is photos only (`Look.photo_uri`, `LookPhoto`). "Post a look" only picks
  photos. The feed, the look page and yasante.com only show photos.
- Photos go through our own server (`apps/common/uploads.py`): re-encoded (which strips
  location data), stored in three sizes, fingerprinted for the stolen-photo check.
- `expo-video` is installed, and `src/shared/ui/VideoPlayer.tsx` plays the hair care
  library's videos, which we host, not users.
- **Infrastructure:** one AWS server in Stockholm runs everything: the website and
  API (gunicorn behind nginx), Postgres, Redis, Celery (worker and beat), and every
  uploaded photo, on its own disk. There's no CDN. Database backups are daily
  `pg_dump`s **kept on the same disk** (7 kept). Uploaded photos aren't backed up
  anywhere else. Sentry is wired into the backend but only on if `SENTRY_DSN` is set.
  The app and the website have no crash reporting.

That last point matters more than video: if the server's disk is lost, every photo
and every backup goes with it. Section 13 fixes that first.

## 2. What "top grade" means here: targets

Video at the level of Instagram, TikTok and Pinterest, measured:

| What | Target |
| --- | --- |
| A video in the feed starts playing after it scrolls into view | under 1 second at the 75th percentile, on 4G |
| The poster image shows | instantly, like a photo tile |
| Playback stalls (rebuffering) | under 1% of watch time |
| Videos that fail to start | under 1% |
| Uploads that succeed | 98% or more, including on mobile data and if she leaves the app |
| From finishing the upload to live | under 30 seconds typically, under 2 minutes at worst |
| Scrolling the feed with videos | no dropped frames on a mid-range Android (3 to 4 GB RAM) |
| Memory | flat after scrolling 200 tiles: players are reused, not piled up |
| Data | autoplay never streams more than the screen needs; a setting for less |
| Crash-free sessions | unchanged from today |

## 3. How the big apps do it, and what Yasante takes

- **TikTok and Reels:** short videos, recorded or picked, trimmed on the phone,
  **compressed on the phone before upload**, uploaded in the background while she
  carries on, played muted in the feed and with sound once opened. What people watch
  to the end is the strongest signal they have.
- **Instagram:** the post shows in her feed straight away as "Posting…" with a progress
  bar; if the upload fails, it says so there with "Retry". One sound setting for the
  whole app: once she unmutes, videos play with sound until she mutes again. "Use less
  mobile data" lowers quality and stops preloading.
- **Pinterest:** videos sit in the same grid as images, autoplay muted while most of
  the tile is on screen, and only a few at a time.
- **YouTube:** adaptive streaming (each video stored at several qualities, the player
  switching as the connection changes), starting low so the first frame is fast.

**What Yasante takes:** short videos (up to 60 seconds at launch), compressed on the
phone, uploaded in the background straight to a video service (never through our one
server), streamed adaptively, autoplayed muted in the grid one at a time, sound on in
the look page. Watching to the end becomes a ranking signal.

## 4. The experience

### Posting
1. "Post a look" offers **photos or one video** (a look is either, not a mix, at
   launch).
2. She picks or records a video. It must be **3 to 60 seconds**. On iPhone she can trim
   in the picker. A trimmer on both phones comes in phase 2.
3. She picks a **cover**: a frame from the video (default: the first clear frame).
   The cover is what the grid shows before the video plays, and what older versions
   of the app show.
4. Optional: **"Remove the sound"** (for music she doesn't own, section 11).
5. The same style, caption, products, who-did-it and who-sees-it fields as photos.
6. She taps Post and is free to carry on. The look appears at the top of her feed as
   **"Posting…"** with progress, then **"Processing…"**, then it's live. If the upload
   fails, "Couldn't post. Retry". It keeps going anywhere in the app. If she leaves
   the app, or the phone closes it, nothing is lost: it carries on from where it
   stopped when she's back.

### Watching
- **In the grid:** the cover shows like a photo, with a small duration badge
  ("0:42"). The tile that's most on screen plays, **muted and looping**. Only one plays
  at a time. Scrolling it away pauses it.
- **On the look page:** plays **with sound** (unless her phone is on silent on iPhone),
  tap to pause, a thin progress bar to scrub, a mute button. The rest of the page is
  as now: comments and More like this.
- **Sound** is one setting for the whole app, remembered.
- **Settings → Videos:** Autoplay "On mobile data and Wi-Fi" (default), "Wi-Fi only",
  "Never". Android's Data Saver or iPhone's Low Data Mode are respected automatically.
- **Reduce Motion** on her phone means no autoplay: covers with a play button.

### On yasante.com
- Look pages play the video (hls.js; Safari plays it natively), with the cover as the
  link preview image and proper video link-preview tags, so a shared link plays in
  WhatsApp and iMessage.

### Accessibility
- Never autoplays with sound. Play, pause and mute are reachable by screen readers
  and labelled. The caption is read out as the description.
- Captions for speech: phase 2, through automatic transcription (section 6 costs).

## 5. How it works

### Upload, straight to the video service
Our server stays out of the heavy lifting. Video bytes never pass through it.

1. The app compresses the video on the phone to **1080p, H.264, about 6 to 8 Mbps,
   AAC audio**, keeping its frame rate (30 or 60). A 60-second iPhone 4K clip of about
   350 MB becomes about 50 to 60 MB. This also drops the original's location data
   (checked in a test, section 9).
2. The app asks our server to start: `POST /api/videos/` with the size, duration and
   whether to remove the sound. The server checks she's allowed (signed in, not
   restricted, under her daily limit), creates a `Video` record ("uploading"), creates
   the video at the service, and returns a **one-time, short-lived upload signature for
   that one video**. The service's secret key never leaves our server.
3. The app uploads with **tus** (the standard for resumable uploads): in chunks, picking
   up where it stopped after a dropped connection or a restart. The phone gives an app
   only a short time to keep working once she leaves it, so the upload saves its place
   and resumes when she's back. (A fully background upload, as Instagram has, needs
   native upload sessions: phase 10.)
4. The service encodes it and calls our **webhook** (`POST /api/videos/hook/`), which
   we verify (signature, timestamp, the video is ours) and which can safely arrive
   twice. The video becomes "processing".
5. Our Celery worker runs the **checks** (section 10): automatic moderation on frames
   and the copy check. Then the video is "ready". If a check holds it, it's "in review"
   and only she sees it, as "Being checked".
6. Her look goes live once its video is ready.

A Celery beat task cleans up uploads that never finished (after 24 hours) and asks the
service to delete them.

### Data model
- `Video`: owner, provider and provider id, status (`uploading`, `processing`,
  `in_review`, `ready`, `failed`, `removed`), duration, width, height, aspect, cover
  URL, playback URL, sound removed, moderation result, frame fingerprints, created
  and updated times.
- `Look.video`: nullable, one per look. **`Look.photo_uri` holds the cover**, so
  everything that reads a look's photo keeps working: older app versions, the website,
  notifications, link previews, staff tools.
- `Media.kind` gains `video_cover`, so covers go through the same photo pipeline.

### API
- The look payload gains `video: {playbackUri, coverUri, durationMs, aspect, hasSound}`
  (absent for photo looks). Regenerate `openapi.yaml` and the typed clients.
- Older apps ignore `video` and show the cover. That's acceptable for the weeks before
  everyone updates.
- A look whose video isn't ready is never in anyone's feed but hers.

### Deleting
Deleting a look, or her account, deletes the video at the service the same day, and
it's recorded. A nightly beat task reconciles our records against the service's list,
so nothing is left behind.

## 6. The video service: options and recommendation

All three below encode for free, stream adaptively from a global CDN, take tus uploads
signed by our server, call a webhook, and make cover images.

| | Bunny Stream | Cloudflare Stream | Mux |
| --- | --- | --- | --- |
| Company and data | Slovenia (EU); storage in Frankfurt by default | US; global | US; global |
| Encoding | Free (standard) | Free | Free (basic quality) |
| Storage | $0.01 per GB a month | $5 per 1,000 minutes a month, prepaid | $0.003 per minute a month (1080p) |
| Delivery | $0.01 per GB (Europe and North America) | $1 per 1,000 minutes | first 100,000 minutes a month free, then $0.001 a minute (1080p) |
| Watching analytics (start time, stalls) | Basic | Basic | **Best (Mux Data)** |
| Minimum | $1 a month | none | none ($20 a month plan optional) |

**Rough monthly cost** (1080p, videos averaging 40 seconds; estimates, not quotes):

| | Early: 300 videos a month, 2,400 minutes stored after a year, 30,000 minutes watched a month | Growing: 3,000 videos a month, 24,000 minutes stored, 500,000 minutes watched |
| --- | --- | --- |
| Bunny Stream | about $9 | about $125 |
| Cloudflare Stream | about $45 | about $620 |
| Mux | about $7 | about $470 |

**Recommendation: Bunny Stream.** It's the cheapest at every size, it's an EU company
with storage in Frankfurt (which keeps our privacy story simple: everything stays in
the EU, like AWS today), and it has what we need. Its weaker spot is analytics, so we
measure start time and stalls ourselves from the app (section 14). **Mux** is the
pick if Yaw would rather pay more for the best tooling. Its free 100,000 minutes make
it cheap early, but it gets expensive with growth, and it's US-based. **Cloudflare
Stream** is simple and solid, but costs the most here.

Not chosen: building it ourselves on AWS (S3, MediaConvert, CloudFront). It keeps one
provider, but means more to build and run, and delivery costs more than Bunny.
Encoding on our own server isn't an option: it would starve the website and API.

**Encoding:** 1080p, 720p, 480p and 360p, H.264 (plays on every phone), AAC audio,
2 to 4 second segments, a keyframe every 2 seconds, starting playback at 480p or 720p
so the first frame is fast. The 1080p original is kept in case we re-encode (for
example to HEVC or AV1 later, which save 30 to 50% of data).

## 7. Speed and performance in the app

- **A small pool of players (2 or 3), reused.** Creating a player per tile is the most
  common way video feeds run out of memory on Android. FlashList recycles tiles; the
  pool hands the playing tile a player and takes it back when it scrolls away.
- **Which tile plays:** the one most on screen, at least 60% visible for 300 ms, so
  fast flicks don't start and stop videos.
- **Covers are photos.** They use the existing photo pipeline and image cache, so a
  video tile looks ready as fast as a photo tile. The video fades in over the cover
  only once its first frame is ready, so there's never a black box.
- **Preload just enough:** the cover of everything near the screen, the first segment
  of only the next video, and nothing on Data Saver or "Wi-Fi only" over mobile data.
- **Pause everything** when the screen is covered, the app goes to the background, or
  the look scrolls away. Release players on leaving the screen.
- **Upload work stays off the main thread:** compression runs natively; progress
  updates at most a few times a second.
- **Tested on a mid-range Android,** not just the emulator, with a throttled 4G
  connection, watching memory over a long scroll.

## 8. Security

- **Upload signatures** are made by our server, for one video, expiring within two
  hours. The service's API key lives only in the server's settings, never in the app
  or the repo.
- **Webhooks** are verified (signature and timestamp, rejected if old), and handling
  one twice changes nothing.
- **Limits:** 3 to 60 seconds, at most 500 MB before compression, at most 10 videos
  a day per account (fewer for accounts under a week old), and per-IP limits on
  starting uploads. The service enforces the duration too, so a doctored app can't
  get round it.
- **Nothing is public until it's ready and checked.**
- **Playback:** public looks use the service's hotlink protection (allowed referrers
  and the app). "Just me" looks use **signed playback links** that expire, issued by our
  server only to her.
- **Covers** go through `store_image`, so they're re-encoded and fingerprinted like
  any photo.
- **Files are never trusted:** the service decodes them in its own sandbox, not us.
- The staff site plays videos from signed links, and every staff decision is logged
  as now.

## 9. Privacy

- **Location data:** phone videos carry where they were filmed. Compression on the
  phone drops it, the service re-encodes again, and we keep no original with metadata.
  An automated test uploads a video with GPS tags and checks nothing comes out with
  them.
- **New processor:** Bunny (or whichever is chosen) joins the list in the privacy
  policy, with a data processing agreement signed. The policy also gains what's
  recorded about watching (section 12). **Wording needs Yaw's approval before it's
  published.**
- **DPIA** (`docs/DPIA.md`): add video, the processor, and watch-time signals.
- **Deleting** a look or an account deletes the video at the service the same day.
  Her data download includes her videos' links.
- Watch-time signals follow the feed's rules: only while `ranked_feed` is on for her,
  kept 90 days, never sold.

## 10. Safety and moderation

The Online Safety Act expects a **new risk assessment before a significant change**,
and video is one (`docs/ONLINE_SAFETY.md` says today there's no video). So before
launch:

- **Update the illegal content and children's risk assessments** for video, and the
  moderation guide (`docs/MODERATION.md`) for reviewing videos. Caleb Kyei, as the
  accountable person, signs it off.
- **Automatic checks before a video goes public:** frames sampled every 2 seconds are
  checked for nudity, sexual content and violence by an image moderation service
  (Amazon Rekognition, in an EU region, so no new provider beyond AWS). A clear hit is
  held for a person to check; a weak hit goes live but into the staff queue.
  Estimated cost: about $0.02 per 40-second video.
- **Use the same check on photos.** They currently have no automatic check, only
  reports. At about $0.001 a photo, this closes that gap too.
- **Copy check:** fingerprints of the cover and of frames at a quarter, half and three
  quarters through, compared with other accounts' looks and portfolio, like photos
  today. A stolen video is flagged.
- **Reports** work as for any look. The staff site's queues play the video, and
  "Remove" also removes it at the service.
- **Known child abuse material:** Ofcom's codes expect hash matching from services at
  high risk of it, with the size thresholds in the codes, and from large services. We
  assessed Yasante as low risk and it's small, so it isn't expected now. Video raises
  the risk, so the reassessment before launch checks this against the codes as they
  stand then, and we check again as users grow.

## 11. Copyright and music

Most hair videos have music, and Yasante has no music licence (TikTok and Instagram
pay for theirs).

- **"Remove the sound"** at posting, and the guidelines say to post only sound she has
  the right to use.
- **"Not their work"** reports and the copy check cover stolen videos. A takedown
  removes it at the service.
- Later, if wanted: a licensed music library (for example Epidemic Sound for business)
  so people can add music safely. That's a cost and a contract for Yaw to decide.

## 12. The feed and ranking

- New feed events: **play started**, **watched (milliseconds)**, **watched to the end**,
  **unmuted**. They're recorded like impressions, only while the ranked feed is on.
- `LookStats` gains total watch time and completions. The ranking adds **watched to
  the end out of plays** (the signal TikTok leans on most), adjusted for length so
  short videos don't win just by being short.
- Videos and photos compete on the same value model (saves, bookings, likes), so video
  doesn't take over the feed just by moving. `mix` keeps variety, at most one video in
  any 3 tiles at launch, then tuned from data.
- `tune_feed` learns the new weights once there's enough data.

## 13. Infrastructure and subscriptions

Some of this video needs. **Most of it the app needs now**, video or not. In order of
priority:

| # | What | Why | Cost (estimate) |
| --- | --- | --- | --- |
| 1 | **Backups off the server**: nightly database dumps copied to an S3 bucket in Stockholm with versioning and a 30-day lock, and a restore tested every month | Today the backups sit on the same disk they protect | under $1 a month |
| 2 | **Photos to S3** (the setting `MEDIA_STORAGE_BACKEND=s3` already exists), with versioning; private photos stay private behind signed links | Photos are on one disk with no copy; S3 is built not to lose files | about $0.025 per GB a month (about $2.50 for 100 GB) |
| 3 | **A CDN for photos**: CloudFront in front of the bucket, with long cache times (file names never change) | Photos load from near the person, not from Stockholm, and the server stops serving files | free up to 1 TB a month, then about $0.085 per GB |
| 4 | **Crash and error reporting** in the app and the website (Sentry), and switch it on for the backend | We find out about crashes from people, if at all | free to start; about $26 a month (Team) when needed |
| 5 | **Uptime and server monitoring**: an outside check every minute that alerts Yaw, and CloudWatch alarms for disk, memory and CPU | Today nothing tells us the site is down | free tiers |
| 6 | **The video service** (section 6) | Video | about $9 a month early |
| 7 | **Image and video moderation** (Rekognition) | Section 10 | a few dollars a month early |
| 8 | **EAS Update** for over-the-air fixes | JavaScript fixes reach phones in minutes, not after store review | within Expo's plan; check the limits |
| 9 | **Secrets in AWS Systems Manager Parameter Store** instead of the server's `.env`, and a key per service with only the access it needs | Limits the damage if one key leaks | free (standard parameters) |
| 10 | **A managed database** (Amazon RDS for Postgres, in Stockholm): automatic backups, restore to any minute, easy upgrades | The database stops depending on one server; the next step after #1 | about $30 to $60 a month |
| 11 | **Transactional email** through Amazon SES instead of IONOS mail | Better delivery of sign-up codes and resets, with bounce tracking | about $0.10 per 1,000 emails |
| 12 | **Room to grow:** the website and API on two servers behind a load balancer, Redis managed (ElastiCache), Celery on its own server | Only once traffic needs it; the steps above make it a small move | when needed |

Items 1 to 5 should happen **before video**, whatever is decided about video. They're
cheap and remove the biggest risks. Item 1 is the most urgent.

## 14. Measuring

- **In the app**, for each play: time to first frame, stalls and their length, failures,
  quality reached, network type. These are sent with the feed events (no personal
  details), with a staff insight showing the 75th and 95th percentiles per day and app
  version.
- **Uploads:** success rate, time from Post to live, where failures happen
  (compression, upload, processing, checks).
- **Cost:** minutes stored and delivered, and moderation calls, in the staff insight,
  with an alert if the month heads past budget.
- **Health:** crash-free sessions (Sentry), memory on long scrolls, battery on a
  15-minute session.
- **Does it help:** saves, bookings and return visits, for people who see videos versus
  those who don't (the switch's percentage mode).

## 15. Testing

- **Backend:** upload start (limits, permissions), webhook (signature, replay, out of
  order, twice), every status change, deleting, the nightly reconcile, moderation
  outcomes, a look not appearing before its video is ready, and older-app payloads
  still valid. The service is faked in tests; one smoke test runs against a test
  library.
- **App:** posting states (posting, processing, failed, retry, resumed after a
  restart), only one tile playing, pausing when covered or backgrounded, the sound
  setting, autoplay settings, Reduce Motion.
- **Real devices:** a mid-range Android and an older iPhone, throttled 4G, a 200-tile
  scroll for memory, airplane mode halfway through an upload.
- **Privacy:** a video with GPS tags comes out without them.

## 16. Phases

Each phase is one PR, merged when its checks are green, behind the `video_posts` switch
until launch.

| # | What | Done when |
| --- | --- | --- |
| 0 | Infrastructure items 1 to 5 (section 13) | Backups and photos off the server, CDN serving photos, crash reporting live, alerts reaching Yaw |
| 1 | Decisions (section 17), accounts, processor agreement signed | Yaw has said yes |
| 2 | Backend: `Video`, the service client, upload start, webhook, statuses, cleanup, deleting, reconcile | Tests above pass; schema regenerated |
| 3 | Checks: frame moderation, copy check, staff review with playback; the same check on photos | A test nudity frame is held; a copied video is flagged |
| 4 | App posting: picker, trimming on iPhone, cover choice, compression, background resumable upload, Posting and Processing states | An upload survives airplane mode and an app restart |
| 5 | App watching: player pool, autoplay rules, look page player, sound setting, autoplay settings | Targets in section 2 met on a mid-range Android |
| 6 | Website: player and link-preview tags | A shared link plays in WhatsApp |
| 7 | Feed signals and ranking (section 12) | Events recorded; ranking uses them; tuned later |
| 8 | Policies: Online Safety assessment, moderation guide, DPIA, privacy policy, terms and guidelines | Approved by Yaw (privacy policy) and signed off by Caleb Kyei (safety) |
| 9 | Launch: staff, then 10%, then everyone, watching section 14 | Two weeks at 10% within targets |
| 10 | Later: a trimmer on both phones, captions, fully background uploads, HEVC or AV1, a licensed music library, longer videos | As decided |

## 17. Decisions for Yaw

1. **Video service:** Bunny Stream (recommended), Mux, or Cloudflare Stream.
2. **Longest video:** 60 seconds at launch (recommended), or 90.
3. **Automatic moderation** with Amazon Rekognition for videos **and photos**
   (recommended), or reports only.
4. **Infrastructure items 1 to 5** now (recommended), and when to move to a managed
   database (item 10).
5. **Sentry plan:** start free, move to Team when we outgrow it.
6. **Music:** "Remove the sound" and guidelines at launch (recommended); a licensed
   library later or never.
7. **New app dependencies** this needs, each to approve: `tus-js-client` (resumable
   uploads), `react-native-compressor` (compression on the phone), `@sentry/react-native`,
   and on the website `hls.js` and `@sentry/react`.
8. **Policy wording:** the privacy policy, terms and guidelines changes, approved in chat
   before they're published.

## Sources (prices checked 21 October 2026)

- Bunny Stream pricing: https://bunny.net/docs/stream/pricing
- Bunny Stream resumable uploads: https://bunny.net/docs/stream/tus-resumable-uploads
- Cloudflare Stream pricing: https://developers.cloudflare.com/stream/pricing/
- Cloudflare Stream direct creator uploads: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads
- Mux video pricing: https://www.mux.com/docs/pricing/video
- AWS Elemental MediaConvert pricing: https://aws.amazon.com/mediaconvert/pricing
- Amazon Rekognition video moderation: https://aws.amazon.com/blogs/machine-learning/how-to-decide-between-amazon-rekognition-image-and-video-api-for-video-moderation/
- Ofcom, Illegal Content Codes of Practice (hash matching): https://www.ofcom.org.uk/siteassets/resources/documents/online-safety/information-for-industry/illegal-harms/overview.pdf
- Ofcom amendments on hash matching for intimate image abuse (in force 30 September 2026): https://www.ofcom.org.uk/siteassets/resources/documents/online-safety/information-for-industry/illegal-harms/detecting-intimate-image-abuse/amendments-to-illegal-content-codes-of-practice-for-user-to-user-services.pdf
