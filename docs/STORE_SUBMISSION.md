# Submitting Yasante to the App Store and Google Play

Everything the stores ask for, in the order you'll meet it. The app side is done:
permissions trimmed, privacy manifest, account deletion in the app and on the web,
reporting and blocking, community guidelines, Sign in with Apple beside Google.

## Before you start

| What | Where | Why |
|---|---|---|
| A reviewer account | Sign up in the app with a new email, e.g. `review@yasante.com`, and fill in a hair profile. Make a second one that's a stylist with a published page. | Apple and Google can't review what they can't sign into. |
| `support@yasante.com` | IONOS → Email → add it as an alias of admin@yasante.com (free). | The terms mention it. The app and site now use admin@yasante.com. |
| Server settings | Add to the server `.env`: `APPLE_TEAM_ID=` (developer.apple.com → Membership). Once Play Console shows its app signing key, add that SHA-256 to `ANDROID_CERT_SHA256` after the existing one, comma-separated. | Links to yasante.com open in the app. |
| Google sign-in | See "Google sign-in setup" below. | The button only appears once it's set up. |
| Apple sign-in key | developer.apple.com → Keys → + → Sign in with Apple. Put the Key ID in `APPLE_SIGN_IN_KEY_ID`, and the `.p8` contents (line breaks as `\n`) in `APPLE_SIGN_IN_PRIVATE_KEY`. | Apple requires deleting an account to also undo its Sign in with Apple link. |

## App Store Connect

**App information**
- Name: Yasante
- Subtitle (30): Braiders, booked by their work
- Category: Lifestyle (secondary: Health & Fitness)
- Privacy Policy URL: https://yasante.com/privacy
- Support URL: https://yasante.com
- Content rights: the app shows content people post. You have the rights you need through the terms.

**Age rating** (the questionnaire): user-generated content, yes. Moderated, with reporting and blocking. Everything else, none. Expected result: 13+ or 16+ under Apple's new ratings. Accept what it gives.

**Description**
> Find a braider by their work, not their follower count.
>
> Yasante is for textured hair: braids, locs, twists, cornrows and natural styles. Scroll real looks from real people, save the ones you love into collections, and book the stylist who did them in a few taps.
>
> • See a stylist's actual work, menu, prices and policies before you book
> • Request a time that suits you; your stylist confirms and tells you the deposit
> • Keep a hair profile: your texture, porosity, length and what works for you
> • Track the products on your shelf; scan a barcode to add one
> • Get reminders before your appointment, with directions and what to bring
>
> For stylists: one link for your bio with your work, menu, availability and deposit rules. Requests arrive ready to accept.

**Keywords (100)**: braids,braider,box braids,knotless,locs,cornrows,natural hair,hairstylist,booking,twists,afro

**App Review notes**
> Sign-in details are above (a client account, and a stylist account with a published page).
> Deposits are paid by the client directly to the stylist, for a hair appointment in person. No payment goes through the app (guideline 3.1.3(e), goods and services used outside the app).
> Looks, comments and stylist pages each have a ⋯ menu to report them or block the person. Reviews can be reported too. Reports are reviewed by a person within 24 hours. Account deletion: Profile → Settings → Privacy and data → Delete account.

**App Privacy** (the nutrition label). Data linked to the user, none used for tracking:
- Contact info: name, email address, physical address (a stylist's street, given only to clients whose booking she has confirmed). Used for app functionality.
- Location: coarse location. A stylist's country, which sets her currency and is shown on her page, and her area name, which we turn into a rough point to measure distances. She types both; we never read the phone's location. Used for app functionality.
- User content: photos, customer support messages, other user content (posts, comments, reviews, hair profile). Used for app functionality.
- Identifiers: user ID. Used for app functionality.
- Usage data: product interaction (only if they agree to analytics). Used for analytics.
- Tracking: no. There's no advertising and no third-party analytics.

**Screenshots**: iPhone 6.9" (1320×2868). Five is enough: the feed, a look, a stylist's page, booking, hair profile. iPad isn't needed; the app is iPhone-only.

## Google Play Console

**Before production**: a personal developer account made after November 2023 must first run a **closed test with at least 12 testers for 14 days in a row**. Start that on day one. Upload the first build to Closed testing and add testers by email.

**Store listing**: same name, description and screenshots (phone, at least 1080px wide). Short description (80): Find braiders by their real work, save looks and book in a few taps.

**App content**
- Privacy policy: https://yasante.com/privacy
- App access: some features need signing in. Give the reviewer account.
- Ads: no.
- Content rating: user-generated content with moderation, no violence or gambling.
- Target audience: 18+ (the terms say 18 or over).
- Data safety:
  - Collected: name, email, user ID, address (stylists who see clients at home or in a salon), approximate location (a stylist's country and area, typed by her and shown on her page), photos, other user-generated content, app interactions (optional).
  - Location and address: collected, not shared, required for stylists only, used for app functionality. Not collected in the background and not read from the phone.
  - Shared with third parties: no. Service providers acting for you don't count as sharing. That includes Photon (komoot's OpenStreetMap search), which sees the letters a stylist types in the area field to suggest names. Nothing that identifies her is sent with them.
  - Encrypted in transit: yes.
  - Users can request deletion: yes, in the app and at https://yasante.com/delete-account.
- Account deletion URL: https://yasante.com/delete-account
- Government, financial or health app: no.

**Permissions you'll be asked about**: camera only (photos and barcode scanning). Microphone, calendar and "display over other apps" are blocked from the build.

## Building for the stores

```bash
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest build --platform android --profile production
```

Android production now builds an `.aab`, which Play requires. The preview profile still builds an `.apk` for installing directly.

## Google sign-in setup

1. console.cloud.google.com → project **yasante** (the Firebase one) → APIs & Services → OAuth consent screen. External; app name Yasante; support email admin@yasante.com; privacy https://yasante.com/privacy; terms https://yasante.com/terms. Publish it.
2. Credentials → Create OAuth client ID, three times:
   - **Web application**, named "Yasante server". No URLs needed.
   - **iOS**, bundle ID `com.yasante.app`.
   - **Android**, package `com.yasante.app`. SHA-1 from `npx eas-cli credentials` (Android → production). Add a second Android client later with Play's app signing SHA-1.
3. Send me the web and iOS client IDs, or add them yourself:
   - `eas.json`, in each build profile's `env`: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - server `.env`: `GOOGLE_CLIENT_IDS=<web id>,<ios id>,<android id>`
