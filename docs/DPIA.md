# Data protection impact assessment

**A draft for Yaw and a lawyer to review.** It isn't legal advice and hasn't been
signed off. Written 20 October 2026, alongside privacy policy version 2026-10-20.
Review it again before launch, and whenever Yasante starts using data in a new way.

## 1. Why an assessment is needed

Yasante handles hair details at scale. Hair texture can reveal someone's ethnic
background, and scalp concerns are health information: both are special category data
under the UK GDPR and EU GDPR. Yasante also plans to use this data, with consent, for
personalisation and for anonymous research shared with hair brands and universities.
That combination (special category data, new uses, sharing of results) is why the law
expects an assessment before the processing starts.

## 2. What data, and why

| Data | From whom | Why | Lawful basis |
| --- | --- | --- | --- |
| Name, email, phone, password (scrambled), Apple or Google sign-in ID | Everyone | Running the account | Contract |
| Hair profile: texture, length, density, porosity, goals, scalp, chemical treatments, photos, history of changes | Clients who choose to fill it in | Matching looks, stylists and products; insights for the person | Explicit consent (`personalisation`), because texture and scalp are special category |
| Check-ins after a style: how it's holding, scalp comfort, would book again, whether it's still in | Clients after an appointment | Insights for the person; how long styles last | Explicit consent for the scalp question (once 6.5 is built); contract for the rest |
| Hair diary: wash days, trims, take-downs, with weekday and hour | Clients who log them | Insights and reminders for the person | Contract: it's the person's own record. Using it to personalise (6.7) needs `personalisation` consent |
| Area and UK postcode, and a rough map point worked out from them | Clients (optional) and stylists | Distances to stylists | Contract |
| Bookings, attendance, reviews | Clients and stylists | Running bookings; trust between both sides | Contract; legitimate interest for attendance records |
| Stylist page, services, prices, address, verification evidence | Stylists | Running the stylist's page; safety checks | Contract; legitimate interest for verification |
| Usage events: actions in the app, time, local time, app version | People who said yes | Finding what's slow or confusing | Consent (`analytics`) |
| Searches | Everyone | Making search work; seeing what people can't find | Legitimate interest (see open question 1) |
| Technical logs and error reports | Everyone | Security and fixing faults | Legitimate interest |
| Anonymous research totals | Built from people who said yes | Reports for hair brands, studies with universities | Explicit consent (`research`) |

Never collected: ethnicity or race, precise or background location, contacts, other
apps, advertising IDs. No ad networks and no third-party tracking.

## 3. Who can see what

- **The person:** everything about themselves, in the app and in the data export.
- **A stylist they book:** their name, the request, attendance record, and their hair's
  texture, length and porosity (only with `personalisation` consent, once 6.5 is
  built). Never the scalp, diary or check-in answers.
- **Other people on Yasante:** only what the person posts publicly and their public
  profile.
- **Yasante staff:** the staff site, behind staff sign-in. Money and analytics insights
  are superusers only. Hair breakdowns in staff reports will come only from people who
  agreed to research, in groups of at least 20.
- **Service providers** (under contract, acting for Yasante): Amazon Web Services
  (hosting, EU), IONOS (email, EU), Expo, Firebase Cloud Messaging and Apple Push
  Notification service (notifications), Photon by komoot (area names typed by stylists
  outside the UK), postcodes.io (UK postcodes). The map services are sent only the text
  or postcode, from the server, with nothing about the person.
- **Hair brands and universities:** only anonymous totals (section 5).

## 4. Risks to people, and how each is reduced

| Risk | How likely, how serious | What reduces it | Status |
| --- | --- | --- | --- |
| Hair details used without real consent | Was certain: hair details were pre-ticked on | Every consent starts off; no pre-ticked boxes; equal "Allow" and "Not now"; consent checked on the server; old answers from before this policy count as unanswered | Built (6.1, 6.2, 6.3); the questions themselves come in 6.4 |
| Hair texture used as a stand-in for ethnicity, for example to target or exclude people | Possible, serious | Never infer ethnicity, health or income; never collect ethnicity; matching only for the person's own feed and suggestions | Rule in the plan; enforced in review |
| Scalp or health details seen by people who shouldn't | Possible, serious | Stylists see only texture, length and porosity; scalp, diary and check-ins stay with the person | Built |
| Someone identified from research results | Possible, serious | Only people who said yes; totals never rows; groups of at least 20; area or region, never postcode; weeks or months, never times; no free text; no photos | Planned (6.5 `research_participants()`, 6.9 report) |
| Withdrawal doesn't take effect | Possible, moderate | Each consent is read from the latest record on the server; turning off takes effect on every device; research queries exclude people from that moment | Built for reading; enforcement in 6.5 |
| Usage tracking without agreement | Was possible | Analytics off until yes, on the phone and on the server; the queue is dropped when it's turned off | Built (6.1, 6.2) |
| Location more precise than needed | Possible, moderate | No phone location at all; postcodes turned into a rough point; coordinates kept server-side only or removed if nothing needs them | Review in 6.5 |
| Data kept longer than needed | Possible, moderate | Events and searches deleted after a year; searches and page views anonymised after 90 days; error reports after 90 days; account data deleted with the account | Built |
| A breach exposes hair or health details | Unlikely, serious | Encrypted in transit; tokens in secure storage; private photos never public; staff access restricted; backups overwritten within 7 days | Built |
| Under-18s sign up | Possible, moderate | Terms say 18+; age confirmed at sign-up | Built |
| A partner misuses research results | Possible, moderate | No partner until Yaw agrees one; results are anonymous totals only; CSV export only for an agreed partner | Planned (6.9) |

## 5. Research, in detail

Research uses only people whose latest `research` answer is yes. Results are totals,
never individual records, and every group shown has at least 20 people; smaller groups
are merged into "Other" or hidden. Places are by area or region and times by week or
month. Names, photos and anything people have written are never included. Turning
research off removes the person from every query from that moment. Totals already
published can't be recalled; the privacy policy says so.

A future paid photo programme and any selling or licensing of data are out of scope
and would need a new assessment.

## 6. How long things are kept

| What | How long |
| --- | --- |
| Account, hair profile, posts, shelf, consent records | Until the account is deleted |
| Appointment records held by a stylist | Kept without the client's name after deletion |
| Usage events | 12 months |
| Searches | Linked to the person for 90 days, deleted after 12 months |
| Stylist page views | Viewer removed after 90 days; counts kept |
| Security logs and error reports | Up to 90 days |
| Backups | Overwritten within 7 days |

## 7. Open questions for review

1. **Searches are logged for everyone**, not only people who agreed to analytics. Is
   legitimate interest enough, or should search logging follow the analytics consent?
2. **Check-in scalp answers** are collected today without the hair details consent.
   The plan skips the question without consent (6.5); until then, is that acceptable?
3. **Registrations:** the ICO fee must be paid before launch, and the EU representative
   named in the policy.
4. **Contracts:** data processing terms should be confirmed with each service provider,
   including the two free map services.
