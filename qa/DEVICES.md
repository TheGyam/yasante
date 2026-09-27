# Emulator or phone

Most of what we test is app logic and server behaviour, and that runs the same on any
Android. So the **emulator is the default**: nothing personal is on it, it can be wiped,
nobody has to keep it flat or dismiss popups, and two can run side by side (client and
stylist). The **owner's phone** (Samsung S948B, One UI, Android 16) is for what an
emulator cannot show, gathered into one device plan that runs now and then.

Emulators on this laptop (`qa/bin/emus`): `client` emulator-5554, `stylist` emulator-5556,
`client2` emulator-5558. All three are Pixel 8, Android 14 x86_64, on London time with
autofill off. TheGyam's dev-client APK (`qa/apk/dev-client.apk`, gitignored) includes x86_64.

## Emulator (default)

| Area | Why the emulator is enough |
| :--- | :--- |
| Every form's checks and messages (sign-in, sign-up, reset, profile, booking forms) | Pure app and server logic |
| Server state: throttles, codes, lockouts, token revocation, booking state machine | Checked in `server.log` and `dbcheck`, not on screen |
| Sessions: restart, sign-out, leaving mid-flow | App storage behaves the same |
| Links as `yasante://…` | The router is the same code |
| Looks feed, likes, saves, comments, reports, account gates | Logic and server |
| Booking between two accounts | Two emulators at once, which the phone can't do |
| Planner, hair profile quiz, shelf, settings, notification switches | Logic and server |
| Offline and slow-network messages | The emulator can cut or throttle its network on demand, which is easier than on the phone |
| Dark/light theme, large text, TalkBack labels | Emulator settings, and the labels are in the UI tree |
| Photo **uploads** (posting a look, avatar, portfolio) | Pick from test photos we put on the emulator. On the phone, the picker would show the owner's own photos |

## Phone only

| Area | Why it needs the real device |
| :--- | :--- |
| **Crashes and timing bugs** found on the emulator (F3) | Confirm they happen on real hardware and the current Android |
| Scroll smoothness, animation, how fast screens open | The README requires these to be measured on a real Android phone. An emulator's speed means nothing |
| Samsung keyboard, autofill and Samsung Pass / Google "save password" | One UI behaviour; these prompts showed up on the phone in every sign-in run |
| Text entry itself | The emulator's typing sometimes scrambles text (`ama` → `maa`, an extra `.dev`), so a typing bug seen only on the emulator isn't a bug |
| `https://yasante.com/…` links opening the app | Needs the signed release build and Android's link verification, not the dev client (on the emulator the dev client didn't take them at all) |
| Camera capture (taking a photo inside the app) | The emulator's camera is fake |
| Push notifications and the "Yes, I'm coming" / "I can't make it" buttons | Needs working Firebase credentials in the build (the dev build logs that they're missing) and a real Google Play device. **Blocked on both until TheGyam adds FCM credentials** |
| App killed in the background, battery saver, reminders arriving on time | Samsung's aggressive background limits |
| Android 16 behaviour (edge-to-edge, back gesture) and the 1440×3120 screen | The emulator is Android 14; an Android 16 image could narrow the gap |

## How that shapes the plans

- Each plan says **Device: emulator** or **Device: phone** at the top.
- Emulator plans can be run end to end unattended.
- `PHONE-01` (to write) gathers the phone-only rows above into one session with the owner
  present: confirm F3, feel the scrolling, one sign-up with the real keyboard and password
  prompt, one yasante.com link, one camera photo, one background kill.
