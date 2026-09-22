/**
 * A full, lived-in Yasante for testing at scale: dozens of clients and stylists,
 * hundreds of looks with likes, comments and threaded replies, and the three
 * sign-in accounts given real histories — bookings in every state, reviews,
 * collections, a shelf and care plans.
 *
 * Dev only. Loaded by ./index after the handlers, never by the unit tests, which
 * keep the small fixed data in ./db. Seeded from a fixed number, so every reload
 * gives the same app. Photos are free-licence images from Unsplash.
 */
import type { Booking, BookingTiming, TimingReason } from '@/features/booking';
import type { HairLength, HairTexture, User } from '@/features/profile';
import type { Availability, MenuItem, StylistProfile } from '@/features/stylist';
import type { ShelfItem } from '@/features/shelf';
import { db } from './db';
import { productById } from './shelf';

// ── A seeded random, so the data is the same every time ────────────────────────
let state = 20260922;
const rand = () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
const chance = (p: number) => rand() < p;
const sample = <T>(list: readonly T[], n: number) => {
  const copy = [...list];
  const out: T[] = [];
  while (out.length < n && copy.length)
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
};

const DAY = 86_400_000;
const HOUR = 3_600_000;
const ago = (days: number, hours = 0) =>
  new Date(Date.now() - days * DAY - hours * HOUR).toISOString();
/** A day from today at a given hour, local time. */
const at = (daysFromNow: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// ── Photos ─────────────────────────────────────────────────────────────────────
const photo = (id: string, w = 800) => `https://images.unsplash.com/${id}?w=${w}&q=80`;

/** Free-licence photos, grouped by the style they show. Each one checked by eye. */
const POOLS: Record<string, string[]> = {
  braids: [
    'photo-1606416132922-22ab37c1231e',
    'photo-1614173968962-0e61c5ed196f',
    'photo-1638794249638-b97e05aaa900',
    'photo-1769694609721-98f8bab9735a',
    'photo-1775443601967-6026bd44eade',
    'photo-1594254773847-9fce26e950bc',
    'photo-1572955304332-bf714bd49add',
    'photo-1592328906746-0a3ca0bde253',
    'photo-1616166183781-0fdd2ef83374',
    'photo-1663851071150-b6617bbee927',
    'photo-1572954889228-2b12a55144d1',
    'photo-1648010035195-6b0a56e14667',
    'photo-1757866332825-42368c1105e8',
    'photo-1757866332840-230be07b786e',
    'photo-1757866332992-723bf8d6169c',
    'photo-1757866331952-8d6c8adc4dbe',
    'photo-1757866332818-781f8d7817e8',
    'photo-1576637348122-7d7c4f1bc4ee',
    'photo-1658497730270-b5f4fef00ae1',
    'photo-1757866332394-a2581b937482',
    'photo-1662593052863-8aae81d60d8d',
    'photo-1688592969417-953dd3c2b9d8',
    'photo-1757866332300-ba431d7d8aff',
    'photo-1658497732841-e5f1b5016ec0',
    'photo-1572955304453-f03b104b55e5',
    'photo-1472747624745-ce92d32d3c24',
    'photo-1547547700-b3954043b1b8',
    'photo-1673470907547-1c0c6a996095',
    'photo-1613099084406-4b9140fc780a',
    'photo-1612459284970-e8f027596582',
    'photo-1502823403499-6ccfcf4fb453',
    'photo-1483908046566-7389784ef261',
    'photo-1725114073768-b437fb81e26c',
  ],
  cornrows: [
    'photo-1718931202052-2996aac5ed85',
    'photo-1481385694031-f2b14f8621d5',
    'photo-1681585895398-258241e60c65',
    'photo-1698657056942-ea2e3dbd3ebe',
    'photo-1657042742546-b1ff81d52b74',
    'photo-1770182022686-879a575d4f09',
    'photo-1770182023641-def05e36a69e',
    'photo-1770182023775-4706ce1bed72',
    'photo-1774773132862-8434afac1738',
    'photo-1774773132713-52f8f7825e63',
    'photo-1762810548877-63512759805e',
    'photo-1774773134812-d1482432b4e4',
    'photo-1774773133824-4d3768cf8567',
    'photo-1768489134736-af8149e8fef1',
    'photo-1774773134440-bfff02591c7c',
    'photo-1774773135080-9f6561c0ee1a',
    'photo-1768489037970-601e0f2d50ba',
    'photo-1762810629910-5ad48ad9b181',
  ],
  locs: [
    'photo-1615046749250-e21a546b4074',
    'photo-1531423511487-c505fb5b5dbd',
    'photo-1614173515218-835035bcaff3',
    'photo-1765560215937-b6f356918ba2',
    'photo-1780038303485-a1d2bb07e427',
    'photo-1633590897746-f784aa98b914',
    'photo-1765560216461-5ed171a0d4fc',
    'photo-1730139784111-a8f97b19118e',
    'photo-1765560216686-56304581ad88',
    'photo-1764265149898-3401b609d4e0',
    'photo-1765560215006-3f55535b83ee',
    'photo-1625536658395-2bd89a631e37',
    'photo-1551493923-9a1b98921caa',
    'photo-1676293038867-84ee4e09c24b',
    'photo-1535146981003-d37e3e2428c3',
    'photo-1635627091599-aedcf8241102',
    'photo-1653263170120-573922b5b820',
    'photo-1606459249576-f00b2e5e0917',
    'photo-1625536658679-42d76fd167c0',
    'photo-1653263169788-9332cdbf07f5',
    'photo-1636718501625-39e05d11fc24',
  ],
  twists: [
    'photo-1709672262859-68cb9b39ae4f',
    'photo-1577806934037-32d94e326e84',
    'photo-1759756655332-d66200497312',
    'photo-1643956740911-62c19a5405f0',
    'photo-1759756655330-5c4f7567dc13',
    'photo-1612455253302-6e13a4a11bba',
    'photo-1612455037928-6e5c41f7add5',
    'photo-1612454880232-826d7d321cac',
    'photo-1612454152924-33bb4a8b17d4',
  ],
  natural: [
    'photo-1632765854612-9b02b6ec2b15',
    'photo-1577746838851-816a43ca8733',
    'photo-1632765866070-3fadf25d3d5b',
    'photo-1707162740878-087394a935c7',
    'photo-1519699047748-de8e457a634e',
    'photo-1713845784497-fe3d7ed176d8',
    'photo-1613876214872-a73df2a1b8bc',
    'photo-1544535379-b81233c1a64e',
    'photo-1583147610149-78ac5cb5a303',
    'photo-1699220274995-a37956b7e43e',
    'photo-1707741902060-f6caee412f26',
    'photo-1548207800-8c16d068bf17',
    'photo-1664293282001-0363011a3cc9',
    'photo-1628682814595-a3f0816b25ff',
    'photo-1631613638674-d7702c02af10',
    'photo-1631346543786-860da970da43',
    'photo-1664293272875-2cfa64e687c7',
    'photo-1535588706069-af8f2d837332',
    'photo-1624978229552-1257bd60df93',
    'photo-1589156191108-c762ff4b96ab',
    'photo-1527203561188-dae1bc1a417f',
    'photo-1709810529099-0ce6102692df',
    'photo-1508002366005-75a695ee2d17',
    'photo-1585890483046-9461ebc1dace',
    'photo-1598363576971-69666ab1130a',
    'photo-1529123202249-4f6224196c9b',
    'photo-1716827173458-8bde30d6c78f',
    'photo-1571375814199-4072612351aa',
    'photo-1524159730786-4e74a1b78d7d',
    'photo-1656473014073-ae696e9e4349',
    'photo-1594737997205-89877cb12185',
    'photo-1544714042-5c0a53d63ed5',
    'photo-1707162740897-cf2f057d2a41',
    'photo-1535997018565-142937b9e38d',
    'photo-1630595127457-ad996943f51c',
  ],
};

const PORTRAITS = [
  'photo-1539701938214-0d9736e1c16b',
  'photo-1656473031961-9d5d9ee19f40',
  'photo-1653333438693-5557bc6f0a73',
  'photo-1539702169544-c0bcff87fcd7',
  'photo-1653333438514-9ce5a7551cfb',
  'photo-1658497714148-eb009d3ea195',
  'photo-1658498613819-6f3ab24df253',
  'photo-1531123897727-8f129e1688ce',
  'photo-1523824921871-d6f1a15151f1',
  'photo-1658497729760-5ad18e22adbe',
  'photo-1593351799227-75df2026356b',
  'photo-1656473040206-53753fbbc767',
  'photo-1531727991582-cfd25ce79613',
  'photo-1616617749174-a2a1f2134674',
].map(id => photo(id, 200));

/** Which taxonomy styles each photo pool can be tagged with. */
const POOL_STYLES: Record<string, string[]> = {
  braids: ['knotless', 'box-braids', 'boho', 'feed-in'],
  cornrows: ['cornrows', 'feed-in'],
  locs: ['locs', 'faux-locs'],
  twists: ['twists'],
  natural: ['wash-and-go', 'silk-press', 'bantu-knots', 'wig-install'],
};

// ── People ─────────────────────────────────────────────────────────────────────
const FIRST = [
  'Abena',
  'Adwoa',
  'Akosua',
  'Yaa',
  'Afia',
  'Esi',
  'Ama',
  'Akua',
  'Nana',
  'Adjoa',
  'Chiamaka',
  'Ngozi',
  'Adaeze',
  'Folake',
  'Temi',
  'Bisi',
  'Funmi',
  'Ifeoma',
  'Kemi',
  'Tolu',
  'Amara',
  'Zara',
  'Imani',
  'Nia',
  'Kezia',
  'Shanice',
  'Tanisha',
  'Jade',
  'Leah',
  'Chloe',
  'Maya',
  'Sade',
  'Precious',
  'Blessing',
  'Grace',
  'Deborah',
  'Ruth',
  'Esther',
  'Naomi',
  'Hannah',
  'Aaliyah',
  'Keisha',
  'Simone',
  'Danielle',
  'Fatima',
  'Halima',
  'Amina',
  'Khadija',
  'Rukayat',
  'Yetunde',
];
const LAST = [
  'Mensah',
  'Asante',
  'Boateng',
  'Owusu',
  'Appiah',
  'Osei',
  'Addo',
  'Agyeman',
  'Adeyemi',
  'Okafor',
  'Nwosu',
  'Balogun',
  'Ogunleye',
  'Eze',
  'Okonkwo',
  'Bello',
  'Campbell',
  'Williams',
  'Brown',
  'Johnson',
  'Clarke',
  'Thomas',
  'Francis',
  'Grant',
  'Hall',
  'Kamara',
  'Sesay',
  'Diallo',
  'Mwangi',
  'Achieng',
];
const AREAS = [
  'Peckham',
  'Brixton',
  'Hackney',
  'Croydon',
  'Tottenham',
  'Lewisham',
  'Stratford',
  'Woolwich',
  'Dalston',
  'Walthamstow',
  'Ilford',
  'Camberwell',
  'Deptford',
  'Edmonton',
  'Thornton Heath',
];
const TEXTURES: HairTexture[] = ['coily', 'coily', 'kinky', 'kinky', 'curly', 'wavy'];
const LENGTHS: HairLength[] = ['ear', 'chin', 'shoulder', 'armpit', 'bra-strap', 'mid-back'];

const now = new Date().toISOString();

function addAccount(id: string, name: string, extra: Partial<User> = {}) {
  db.accounts.set(id, {
    id,
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@yasante.dev`,
    phoneVerified: true,
    roles: ['client'],
    avatarUri: chance(0.5) ? pick(PORTRAITS) : undefined,
    hairProfile: {
      texture: pick(TEXTURES),
      length: pick(LENGTHS),
      density: pick(['fine', 'medium', 'thick'] as const),
      porosity: pick(['low', 'medium', 'high'] as const),
      goals: sample(['growth', 'health', 'moisture', 'strength', 'style'] as const, int(1, 3)),
      area: pick(AREAS),
      completedAt: ago(int(20, 200)),
    },
    createdAt: ago(int(30, 300)),
    updatedAt: now,
    ...extra,
  });
}

// Sixty clients.
const CLIENTS: string[] = [];
for (let i = 0; i < 60; i++) {
  const id = `acc_c${i + 1}`;
  addAccount(id, `${FIRST[i % FIRST.length]} ${pick(LAST)}`);
  CLIENTS.push(id);
}

// Efua gets a full profile, so "hair like mine" and posting from her profile work.
Object.assign(db.accounts.get('acc_client')!, {
  avatarUri: PORTRAITS[0],
  hairProfile: {
    texture: 'coily',
    length: 'shoulder',
    density: 'thick',
    porosity: 'high',
    goals: ['growth', 'moisture'],
    lengthStretched: true,
    lengthMeasuredAt: ago(20),
    scalp: ['dry'],
    chemicals: [],
    area: 'Peckham',
    budget: '100_150',
    completedAt: ago(40),
  },
});
db.accounts.get('acc_ama')!.avatarUri = PORTRAITS[1];
db.accounts.get('acc_zainab')!.avatarUri = PORTRAITS[2];

// ── Stylists ───────────────────────────────────────────────────────────────────
const BUSINESS = [
  ['Braided by Bisi', 'Knotless and boho, done gently and neatly.'],
  ['Crown & Cornrow', 'Freestyle cornrows, feed-ins and stitch braids.'],
  ['Loc Nation London', 'Starter locs, retwists and loc styling.'],
  ['Twist & Shout Hair', 'Passion twists, Senegalese and spring twists.'],
  ['The Silk Studio', 'Silk presses and trims on natural hair. Heat-safe, always.'],
  ['Kemi Knots', 'Bantu knots, twist-outs and protective styles for kids too.'],
  ['House of Plaits', 'Box braids in every size, with a quiet chair and good music.'],
  ['Adwoa Braids', 'Mobile braider across south London. Hair included on request.'],
  ['Faux Loc Factory', 'Soft locs, butterfly locs and goddess locs.'],
  ['Naturally Nia', 'Wash-and-go, defined curls and scalp care.'],
  ['Edge & Grace', 'Wig installs, frontals and closures, glueless first.'],
  ['Sade Styles', 'Feed-in ponytails and cornrows for events.'],
  ['Braids by Halima', 'Fulani braids and tribal styles.'],
  ['Tolu Twists', 'Two-strand twists on your own hair, no extensions.'],
  ['Ruth’s Hair Room', 'Home salon in Croydon. Knotless specialists.'],
  ['The Plait Parlour', 'Kids’ braids, beads and patient hands.'],
  ['Jade Does Locs', 'Interlocking and retwists. Healthy locs, long-term.'],
  ['Crowned by Chiamaka', 'Boho knotless and curly ends.'],
] as const;

const WEEKS: Availability['week'][] = [
  [
    null,
    null,
    { start: '09:00', end: '18:00' },
    { start: '09:00', end: '18:00' },
    { start: '09:00', end: '18:00' },
    { start: '09:00', end: '18:00' },
    { start: '08:00', end: '16:00' },
  ],
  [
    null,
    { start: '10:00', end: '19:00' },
    { start: '10:00', end: '19:00' },
    null,
    { start: '10:00', end: '19:00' },
    { start: '10:00', end: '19:00' },
    { start: '09:00', end: '17:00' },
  ],
  [
    { start: '11:00', end: '17:00' },
    null,
    null,
    { start: '12:00', end: '20:00' },
    { start: '12:00', end: '20:00' },
    { start: '09:00', end: '20:00' },
    { start: '08:00', end: '18:00' },
  ],
];

/** A menu built from the kind of work a stylist does, priced around London rates. */
function menuFor(prefix: string, styles: string[]): MenuItem[] {
  const all: Record<string, Omit<MenuItem, 'id'>> = {
    knotless: {
      name: 'Knotless braids',
      price: int(11, 16) * 10,
      fromPrice: true,
      durationMinutes: 300,
      note: 'Hair not included',
      options: [
        { id: 'len_s', group: 'length', label: 'Shoulder', add: 0 },
        { id: 'len_m', group: 'length', label: 'Mid-back', add: 20, addMinutes: 60 },
        { id: 'len_w', group: 'length', label: 'Waist', add: 40, addMinutes: 120 },
        { id: 'sz_l', group: 'size', label: 'Large', add: 0 },
        { id: 'sz_m', group: 'size', label: 'Medium', add: 20, addMinutes: 60 },
        { id: 'sz_s', group: 'size', label: 'Small', add: 40, addMinutes: 120 },
      ],
    },
    'box-braids': {
      name: 'Box braids',
      price: int(9, 13) * 10,
      fromPrice: true,
      durationMinutes: 300,
      options: [
        { id: 'bl_s', group: 'length', label: 'Shoulder', add: 0 },
        { id: 'bl_w', group: 'length', label: 'Waist', add: 35, addMinutes: 90 },
      ],
    },
    boho: {
      name: 'Boho knotless',
      price: int(15, 20) * 10,
      fromPrice: true,
      durationMinutes: 360,
      hairIncluded: chance(0.5),
    },
    'feed-in': {
      name: 'Feed-in braids',
      price: int(5, 8) * 10,
      fromPrice: true,
      durationMinutes: 150,
      options: [
        { id: 'fi_4', group: 'size', label: '4–6 braids', add: 0 },
        { id: 'fi_8', group: 'size', label: '8–10 braids', add: 15, addMinutes: 45 },
      ],
    },
    cornrows: {
      name: 'Cornrows',
      price: int(3, 6) * 10 + 5,
      fromPrice: true,
      durationMinutes: 120,
      options: [
        { id: 'cr_b', group: 'size', label: 'Big', add: 0 },
        { id: 'cr_m', group: 'size', label: 'Medium', add: 15, addMinutes: 30 },
        { id: 'cr_s', group: 'size', label: 'Small', add: 30, addMinutes: 60 },
      ],
    },
    locs: { name: 'Loc retwist', price: int(6, 9) * 10, fromPrice: false, durationMinutes: 180 },
    'faux-locs': {
      name: 'Faux locs',
      price: int(14, 18) * 10,
      fromPrice: true,
      durationMinutes: 360,
    },
    twists: {
      name: 'Passion twists',
      price: int(10, 14) * 10,
      fromPrice: true,
      durationMinutes: 240,
    },
    'silk-press': {
      name: 'Silk press',
      price: int(5, 8) * 10 + 5,
      fromPrice: false,
      durationMinutes: 120,
    },
    'wash-and-go': {
      name: 'Wash and go',
      price: int(4, 6) * 10,
      fromPrice: false,
      durationMinutes: 90,
    },
    'bantu-knots': {
      name: 'Bantu knots',
      price: int(4, 6) * 10 + 5,
      fromPrice: false,
      durationMinutes: 90,
    },
    'wig-install': {
      name: 'Wig install',
      price: int(7, 10) * 10,
      fromPrice: true,
      durationMinutes: 120,
      note: 'Unit not included',
    },
  };
  const items: MenuItem[] = styles
    .filter(s => all[s])
    .map(s => ({
      ...all[s],
      id: `${prefix}_${s}`,
      options: all[s].options?.map(o => ({ ...o, id: `${prefix}_${o.id}` })),
    }));
  items.push({
    id: `${prefix}_takedown`,
    name: 'Take down and wash',
    price: 30,
    fromPrice: false,
    durationMinutes: 60,
  } as MenuItem);
  return items as MenuItem[];
}

const STYLISTS: { id: string; pools: string[]; styles: string[] }[] = [
  { id: 'acc_ama', pools: ['braids', 'cornrows'], styles: ['knotless', 'cornrows', 'boho'] },
  {
    id: 'acc_zainab',
    pools: ['natural', 'cornrows'],
    styles: ['silk-press', 'cornrows', 'wash-and-go'],
  },
];

const STYLE_SETS: { pools: string[]; styles: string[] }[] = [
  { pools: ['braids'], styles: ['knotless', 'boho', 'box-braids'] },
  { pools: ['cornrows'], styles: ['cornrows', 'feed-in'] },
  { pools: ['locs'], styles: ['locs', 'faux-locs'] },
  { pools: ['twists'], styles: ['twists'] },
  { pools: ['natural'], styles: ['silk-press', 'wash-and-go'] },
  { pools: ['natural', 'twists'], styles: ['bantu-knots', 'twists'] },
  { pools: ['braids'], styles: ['box-braids', 'knotless'] },
  { pools: ['braids', 'cornrows'], styles: ['knotless', 'cornrows'] },
  { pools: ['locs'], styles: ['faux-locs', 'locs'] },
  { pools: ['natural'], styles: ['wash-and-go', 'silk-press'] },
  { pools: ['natural'], styles: ['wig-install', 'silk-press'] },
  { pools: ['cornrows', 'braids'], styles: ['feed-in', 'cornrows'] },
  { pools: ['braids', 'cornrows'], styles: ['box-braids', 'cornrows'] },
  { pools: ['twists', 'natural'], styles: ['twists', 'bantu-knots'] },
  { pools: ['braids'], styles: ['knotless', 'box-braids'] },
  { pools: ['braids', 'cornrows'], styles: ['box-braids', 'cornrows'] },
  { pools: ['locs'], styles: ['locs'] },
  { pools: ['braids'], styles: ['boho', 'knotless'] },
];

BUSINESS.forEach(([displayName, bio], i) => {
  const id = `acc_s${i + 1}`;
  addAccount(id, `${FIRST[(i * 7 + 3) % FIRST.length]} ${pick(LAST)}`, {
    roles: ['client', 'stylist'],
    avatarUri: PORTRAITS[(i + 3) % PORTRAITS.length],
  });
  const handle = displayName.toLowerCase().replace(/[^a-z]+/g, '');
  const profile: StylistProfile = {
    id: `sty_s${i + 1}`,
    accountId: id,
    displayName,
    handle,
    bio,
    avatarUri: PORTRAITS[(i + 3) % PORTRAITS.length],
    serviceModels: [pick(['salon', 'home', 'mobile'] as const)],
    baseArea: AREAS[i % AREAS.length],
    travelRadiusMiles: chance(0.4) ? int(3, 8) : undefined,
    instagramHandle: handle,
    policies: {
      noticeHours: pick([24, 48]),
      depositType: pick(['fixed', 'percent', 'none'] as const),
      depositAmount: pick([15, 20, 25]),
      rescheduleFreeOnce: true,
    },
    availability: { week: WEEKS[i % WEEKS.length], blocked: [] },
    paymentMethods: [
      {
        id: `pay_s${i}`,
        label: 'Bank transfer',
        details: `${displayName} · 20-00-00 · 1234${1000 + i}`,
      },
    ],
    verificationTier: chance(0.7) ? 1 : 0,
    published: true,
    createdAt: ago(int(60, 400)),
  };
  db.stylists.set(id, profile);
  db.menus.set(id, menuFor(`s${i + 1}`, STYLE_SETS[i].styles));
  STYLISTS.push({ id, ...STYLE_SETS[i] });
});

// Ama and Zainab: hours, payment details, and Zainab's menu.
Object.assign(db.stylists.get('acc_ama')!, {
  avatarUri: PORTRAITS[1],
  availability: { week: WEEKS[0], blocked: [] },
  paymentMethods: [
    { id: 'pay_ama_1', label: 'Monzo', details: 'monzo.me/amaowusu' },
    { id: 'pay_ama_2', label: 'Bank transfer', details: 'A. Owusu · 12-34-56 · 12345678' },
  ],
});
db.stylists.get('acc_zainab')!.avatarUri = PORTRAITS[2];
if (!db.menus.get('acc_zainab')?.length)
  db.menus.set('acc_zainab', menuFor('z', ['silk-press', 'cornrows', 'wash-and-go']));

// Portfolios: a dozen of their own photos each, some tagged to a service.
for (const s of STYLISTS) {
  const menu = db.menus.get(s.id) ?? [];
  const photos = s.pools.flatMap(p => POOLS[p]);
  db.portfolios.set(
    s.id,
    sample(photos, 12).map((id, i) => ({
      id: `pho_${s.id}_${i}`,
      uri: photo(id),
      serviceId: chance(0.7) ? pick(menu).id : undefined,
      createdAt: ago(int(1, 120)),
    }))
  );
}

// ── Looks ──────────────────────────────────────────────────────────────────────
const CAPTIONS = [
  'Fresh install, still smelling like edge control.',
  'Two weeks in and still neat.',
  'Waist length, done in one sitting.',
  'Small knotless for the summer.',
  'Parts on point today.',
  'My first time trying boho and I’m obsessed.',
  'Goddess locs for the wedding.',
  'Protective style season.',
  'She took her time and it shows.',
  'No tension, no bumps, just vibes.',
  'Freestyle cornrows with a heart design.',
  'Wash day results. Definition for days.',
  'Silk press on 4c, no heat damage.',
  'Retwist day ✨',
  'Stitch braids into a high pony.',
  'Passion twists, bob length.',
  'Loc journey: year three.',
  'Bantu knots, then the knot-out tomorrow.',
  'Curly ends on medium knotless.',
  'Feed-ins for work week.',
  'Kids’ braids with beads — she sat so well!',
  'Butterfly locs, hair included.',
  'Finally tried a middle part.',
  'Six hours well spent.',
  'Low maintenance, high impact.',
  undefined,
  undefined,
  undefined,
];

type StoredLook = (typeof db.looks)[number];
const newLooks: StoredLook[] = [];

// Stylists post their work: 8–18 looks each, priced from their own menu.
for (const s of STYLISTS) {
  const menu = db.menus.get(s.id) ?? [];
  for (let i = 0; i < int(8, 18); i++) {
    const pool = pick(s.pools);
    const style =
      pick(POOL_STYLES[pool].filter(st => s.styles.includes(st))) ?? pick(POOL_STYLES[pool]);
    const service =
      menu.find(m => m.id.endsWith(`_${style}`)) ?? (chance(0.5) ? pick(menu) : undefined);
    newLooks.push({
      id: `look_${s.id}_${i}`,
      authorId: s.id,
      photoUri: photo(pick(POOLS[pool])),
      caption: pick(CAPTIONS),
      serviceId: service?.id,
      serviceName: service?.name,
      price: service?.price,
      fromPrice: service?.fromPrice,
      stylistId: s.id,
      styles: [style, ...(chance(0.25) ? [pick(POOL_STYLES[pool])] : [])].filter(
        (v, k, a) => a.indexOf(v) === k
      ),
      hairTexture: pick(TEXTURES),
      productIds: chance(0.3)
        ? sample(['prd_1', 'prd_7', 'prd_23', 'prd_4', 'prd_19'], int(1, 2))
        : undefined,
      createdAt: ago(int(0, 60), int(0, 23)),
    });
  }
}

// Clients post their hair, crediting who did it.
for (let i = 0; i < 90; i++) {
  const author = pick(CLIENTS);
  const s = pick(STYLISTS);
  const pool = pick(s.pools);
  const style = pick(POOL_STYLES[pool]);
  const credited = chance(0.75);
  newLooks.push({
    id: `look_c_${i}`,
    authorId: author,
    photoUri: photo(pick(POOLS[pool])),
    caption: pick(CAPTIONS),
    stylistId: credited ? s.id : undefined,
    styles: [style],
    hairTexture: db.accounts.get(author)?.hairProfile?.texture,
    createdAt: ago(int(0, 45), int(0, 23)),
  });
}

// Efua's own: two in the feed, one just for her.
newLooks.push(
  {
    id: 'look_efua_1',
    authorId: 'acc_client',
    photoUri: photo(POOLS.braids[3]),
    caption: 'Knotless from Ama, two weeks in. Still so neat.',
    stylistId: 'acc_ama',
    serviceId: 'men_knotless',
    serviceName: 'Knotless braids',
    price: 120,
    fromPrice: true,
    styles: ['knotless'],
    hairTexture: 'coily',
    productIds: ['prd_1', 'prd_7'],
    createdAt: ago(1, 3),
  },
  {
    id: 'look_efua_2',
    authorId: 'acc_client',
    photoUri: photo(POOLS.natural[4]),
    caption: 'Wash day. My twist-out finally behaved.',
    styles: ['wash-and-go'],
    hairTexture: 'coily',
    createdAt: ago(9),
  },
  {
    id: 'look_efua_3',
    authorId: 'acc_client',
    photoUri: photo(POOLS.natural[9]),
    caption: 'Length check before the big chop decision.',
    styles: ['wash-and-go'],
    hairTexture: 'coily',
    visibility: 'private',
    createdAt: ago(20),
  }
);

// The fixed looks the tests use get photos that match what they're tagged with, and
// sit a day back so the feed opens on fresh posts.
const fixture = (id: string, uri: string, daysBack: number) => {
  const look = db.looks.find(l => l.id === id);
  if (look) Object.assign(look, { photoUri: uri, createdAt: ago(daysBack) });
};
fixture('look_seed_1', photo(POOLS.braids[10]), 2);
fixture('look_seed_2', photo(POOLS.natural[20]), 3);
fixture('look_seed_3', photo(POOLS.cornrows[0]), 4);

db.looks.push(...newLooks);
db.looks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

// ── Likes, comments and replies ─────────────────────────────────────────────────
const EVERYONE = [...db.accounts.keys()].filter(id => id !== 'acc_new');

const COMMENTS = [
  'This is gorgeous 😍',
  'The parts are so clean!',
  'How long did this take?',
  'Obsessed with the length.',
  'Booking you next month for sure.',
  'Is this medium or small?',
  'Neat as always.',
  'Those curly ends though!',
  'Did you use your own hair?',
  'This is exactly what I want for my holiday.',
  'Price please?',
  'Stunning 🔥',
  'How long did it last you?',
  'Your edges look so healthy.',
  'The colour really suits you.',
  'Need this asap.',
  'Saving this for my next appointment.',
  'Wow, the neatness.',
  'Did it hurt at all?',
  'You’re so talented.',
  'What products do you use for the scalp?',
  'This is giving everything.',
  'I’ve been looking for someone who can do small knotless without pulling on my edges for ages, and this is the first time I’ve seen results this clean. How do you keep the tension so low at the front? My last stylist went really tight around the hairline and I’m still growing it back.',
  'Honestly the patience this must have taken is unreal. I sat for seven hours last time and the parts were nowhere near this straight. Do you do consultations first, or do you just go from photos? I have quite thick 4c hair so I always worry it will take forever.',
  'Can we talk about how the ends are sealed? Mine always unravel after a week. Is that hot water or something else? Would love to know before I book, because I’m travelling for three weeks and need it to hold up in the heat.',
];
const REPLIES = [
  'Thank you so much! 💕',
  'About five hours start to finish.',
  'Medium, mid-back length.',
  'Yes, all my own hair.',
  'DM me and I’ll send my price list.',
  'It lasted six weeks with care.',
  'Honestly no tension at all.',
  'Same question!',
  'Right?! I want this too.',
  'She’s the best, I’ve been going for years.',
  'Hot water dip on the ends, then a little mousse.',
  'Book through her page, she replies fast.',
  'I use rosemary oil twice a week.',
  'Thank you! Appreciate you 🙏',
];

const likes = (lookId: string, n: number) => db.likes.set(lookId, new Set(sample(EVERYONE, n)));

let commentSeq = 0;
for (const look of db.looks) {
  if (look.visibility === 'private') continue;
  // A few looks take off; most get a modest amount.
  const popular = chance(0.12);
  if (!db.likes.has(look.id)) likes(look.id, popular ? int(40, 70) : int(0, 18));
  const threads = popular ? int(8, 20) : chance(0.6) ? int(1, 6) : 0;
  const base = new Date(look.createdAt).getTime();
  for (let t = 0; t < threads; t++) {
    const root = {
      id: `com_s${++commentSeq}`,
      lookId: look.id,
      authorId: pick(EVERYONE),
      body: pick(COMMENTS),
      createdAt: new Date(Math.min(Date.now(), base + int(1, 72) * HOUR)).toISOString(),
    };
    db.comments.push(root);
    const replies = chance(0.45) ? int(1, popular ? 9 : 4) : 0;
    let last = root;
    for (let r = 0; r < replies; r++) {
      // The author often answers; sometimes it's a conversation between others.
      const author = chance(0.4) ? look.authorId : pick(EVERYONE);
      const answering = r > 0 && chance(0.4) ? last : root;
      const reply = {
        id: `com_s${++commentSeq}`,
        lookId: look.id,
        authorId: author,
        body: pick(REPLIES),
        parentId: root.id,
        replyToId: answering.id,
        createdAt: new Date(
          Math.min(Date.now(), new Date(last.createdAt).getTime() + int(1, 20) * HOUR)
        ).toISOString(),
      };
      db.comments.push(reply);
      last = reply;
    }
  }
}
// Oldest first, as the store keeps them.
db.comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

// Efua has liked a good share of the feed.
for (const look of sample(
  db.looks.filter(l => l.authorId !== 'acc_client'),
  45
)) {
  if (!db.likes.has(look.id)) db.likes.set(look.id, new Set());
  db.likes.get(look.id)!.add('acc_client');
}

// ── Efua's collections, shelf and care plans ────────────────────────────────────
const saveable = db.looks.filter(l => l.visibility !== 'private' && l.authorId !== 'acc_client');
const collection = (id: string, name: string, n: number, isPrivate = false) => ({
  id,
  name,
  isPrivate,
  createdAt: ago(int(10, 90)),
  items: sample(saveable, n).map((look, i) => ({
    id: `${id}_${i}`,
    kind: 'look',
    refId: look.id,
    imageUri: look.photoUri,
    title: look.caption ?? look.serviceName,
    addedAt: ago(int(0, 60)),
  })),
});
db.collections.set('acc_client', [
  collection('col_holiday', 'Holiday hair', 12),
  collection('col_knotless', 'Knotless inspo', 18),
  collection('col_wedding', 'Wedding guest', 7),
  collection('col_next', 'Next appointment', 4, true),
  collection('col_locs', 'Maybe locs one day', 9),
]);
for (const id of sample(CLIENTS, 20)) {
  db.collections.set(id, [collection(`col_${id}_1`, 'Saved', int(3, 12))]);
}

db.shelves.set(
  'acc_client',
  (
    [
      ...(db.shelves.get('acc_client') ?? []),
      {
        id: 'shf_seed_3',
        product: productById('prd_4')!,
        status: 'finished',
        rating: 3,
        timesBought: 1,
        startedAt: ago(120),
        finishedAt: ago(60),
      },
      {
        id: 'shf_seed_4',
        product: productById('prd_19')!,
        status: 'using',
        timesBought: 1,
        startedAt: ago(30),
      },
      {
        id: 'shf_seed_5',
        product: productById('prd_23')!,
        status: 'repurchased',
        rating: 5,
        timesBought: 4,
        startedAt: ago(200),
      },
      {
        id: 'shf_seed_6',
        product: productById('prd_13')!,
        status: 'using',
        rating: 4,
        timesBought: 1,
        startedAt: ago(8),
      },
      {
        id: 'shf_seed_7',
        product: productById('prd_24')!,
        status: 'finished',
        rating: 4,
        timesBought: 2,
        startedAt: ago(150),
        finishedAt: ago(40),
      },
    ] as ShelfItem[]
  ).filter(item => item.product)
);

const sessions = (every: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `ses_${every}_${i}`,
    completedAt: ago(i * every + 1),
  }));
db.carePlans.set('acc_client', [
  {
    id: 'plan_wash',
    name: 'Wash day',
    frequency: 'weekly',
    timeOfDay: 'morning',
    remindersOn: true,
    steps: [
      { id: 's1', text: 'Pre-poo with oil for 30 minutes' },
      { id: 's2', text: 'Cleanse the scalp only' },
      { id: 's3', text: 'Deep condition under a cap' },
      { id: 's4', text: 'Leave-in, then twist' },
    ],
    lastDoneAt: ago(6),
    createdAt: ago(90),
    sessions: sessions(7, 11),
  },
  {
    id: 'plan_scalp',
    name: 'Scalp oil',
    frequency: 'every-2-days',
    timeOfDay: 'night',
    remindersOn: true,
    steps: [
      { id: 's1', text: 'Rosemary oil on the parts' },
      { id: 's2', text: 'Massage for two minutes' },
    ],
    lastDoneAt: ago(1),
    createdAt: ago(40),
    sessions: sessions(2, 18),
  },
  {
    id: 'plan_edges',
    name: 'Edges and ends',
    frequency: 'specific-days',
    specificDays: [1, 4],
    timeOfDay: 'evening',
    remindersOn: false,
    steps: [
      { id: 's1', text: 'Seal ends with butter' },
      { id: 's2', text: 'Silk scarf on' },
    ],
    lastDoneAt: ago(3),
    createdAt: ago(25),
    sessions: sessions(3, 7),
  },
]);

// ── Bookings in every state ─────────────────────────────────────────────────────
let bookingSeq = 0;
function booking(
  clientId: string,
  stylistId: string,
  status: Booking['status'],
  when: string,
  extra: Partial<Booking> = {}
): Booking {
  const profile = db.stylists.get(stylistId)!;
  const menu = db.menus.get(stylistId) ?? [];
  const service = pick(menu);
  const b: Booking = {
    id: `bk_s${++bookingSeq}`,
    status,
    clientId,
    clientName: db.accounts.get(clientId)!.name,
    stylistId,
    stylistName: profile.displayName,
    stylistHandle: profile.handle,
    serviceId: service.id,
    serviceName: service.name,
    price: service.price,
    fromPrice: service.fromPrice,
    durationMinutes: service.durationMinutes,
    bringingOwnHair: chance(0.3),
    hairIncluded: !!service.hairIncluded,
    requestedTimes: [when],
    scheduledFor: status === 'requested' ? undefined : when,
    area: profile.baseArea,
    address: `${int(2, 180)} ${pick(['Rye Lane', 'Coldharbour Lane', 'Mare Street', 'High Road', 'Church Street'])}, ${profile.baseArea}`,
    policy: profile.policies,
    policyVersion: 'seed',
    moves: 0,
    createdAt: new Date(new Date(when).getTime() - int(2, 10) * DAY).toISOString(),
    updatedAt: now,
    ...extra,
  };
  if (status === 'completed')
    b.completedAt = b.completedAt ?? new Date(new Date(when).getTime() + 6 * HOUR).toISOString();
  db.bookings.push(b);
  return b;
}

const OUTCOME_REASONS: TimingReason[] = [
  'took_longer',
  'more_hair',
  'client_late',
  'hair_not_prepped',
  'previous_overran',
];
const timing = (): BookingTiming => {
  const outcome = chance(0.7) ? 'on_time' : chance(0.5) ? 'early' : 'over';
  return outcome === 'on_time'
    ? { outcome }
    : {
        outcome,
        bucket: pick(['under_30', '30_60', '1_2h'] as const),
        reason: pick(OUTCOME_REASONS),
      };
};

const REVIEW_TEXT = [
  'Neat parts, no tension, and done when she said it would be.',
  'So gentle with my edges. Will be back.',
  'Lovely home salon, great chat, beautiful braids.',
  'Took a bit longer than quoted but the result is perfect.',
  'Best cornrows I’ve had in London.',
  'She listened to exactly what I wanted.',
  'Clean, quick, professional.',
  'My silk press lasted two weeks. Unreal.',
  undefined,
];

// Every stylist has a history: completed appointments with timing, and reviews.
for (const s of STYLISTS) {
  const history = s.id === 'acc_ama' ? 16 : int(4, 14);
  for (let i = 0; i < history; i++) {
    const client = pick(CLIENTS);
    const b = booking(
      client,
      s.id,
      chance(0.08) ? 'no_show' : 'completed',
      at(-int(3, 200), pick([9, 10, 12, 14])),
      {
        timing: timing(),
        actualPrice: undefined,
      }
    );
    if (b.status === 'completed') {
      b.actualPrice = b.price + pick([0, 0, 10, 20]);
      if (chance(0.6)) {
        db.reviews.push({
          id: `rev_s${b.id}`,
          bookingId: b.id,
          stylistId: s.id,
          clientId: client,
          rating: pick([5, 5, 5, 4, 4, 3]),
          body: pick(REVIEW_TEXT),
          status: 'published',
          authorName: b.clientName.split(' ')[0],
          serviceName: b.serviceName,
          createdAt: new Date(new Date(b.completedAt!).getTime() + DAY).toISOString(),
        });
      }
    }
  }
  // Page views over the last fortnight.
  for (let v = 0; v < int(20, 140); v++)
    db.pageViews.push({ stylistId: s.id, at: ago(int(0, 13), int(0, 23)) });
}

// Efua: a past appointment with each of a few stylists (so she can post and review),
// one booked, one waiting on a deposit, one still a request.
booking('acc_client', 'acc_s1', 'completed', at(-18, 10));
booking('acc_client', 'acc_s5', 'completed', at(-35, 12));
booking('acc_client', 'acc_zainab', 'completed', at(-60, 10));
booking('acc_client', 'acc_ama', 'confirmed', at(5, 10), {
  deposit: { amount: 20, method: 'Monzo · monzo.me/amaowusu', status: 'received' },
});
booking('acc_client', 'acc_s7', 'awaiting_deposit', at(9, 12), {
  deposit: {
    amount: 25,
    method: 'Bank transfer · House of Plaits · 20-00-00 · 12341006',
    status: 'awaiting',
  },
  expiresAt: new Date(Date.now() + 20 * HOUR).toISOString(),
});
booking('acc_client', 'acc_s3', 'requested', at(12, 11), {
  expiresAt: new Date(Date.now() + 40 * HOUR).toISOString(),
});
db.slotInterests.push({
  id: 'slot_seed_1',
  clientId: 'acc_client',
  stylistId: 'acc_s2',
  from: at(2, 0),
  to: at(16, 0),
  openedOn: at(6, 0).slice(0, 10),
  createdAt: ago(3),
});

// Ama's inbox: requests waiting, and a full week ahead.
for (let i = 0; i < 6; i++) {
  booking(pick(CLIENTS), 'acc_ama', 'requested', at(int(3, 20), pick([9, 10, 11, 13])), {
    notes: chance(0.5)
      ? pick([
          'Shoulder length, would love mid-back.',
          'First time with knotless!',
          'Can you do curly ends?',
        ])
      : undefined,
    expiresAt: new Date(Date.now() + int(6, 46) * HOUR).toISOString(),
  });
}
for (const d of [0, 1, 2, 3]) {
  booking(pick(CLIENTS), 'acc_ama', 'confirmed', at(d + 1, pick([9, 13])), {
    attendanceConfirmedAt: chance(0.5) ? ago(0, 2) : undefined,
  });
}
booking(pick(CLIENTS), 'acc_ama', 'awaiting_deposit', at(8, 10), {
  deposit: { amount: 20, method: 'Monzo · monzo.me/amaowusu', status: 'awaiting' },
  expiresAt: new Date(Date.now() + 18 * HOUR).toISOString(),
});
for (let i = 0; i < 3; i++) {
  booking(pick(CLIENTS), 'acc_zainab', 'requested', at(int(3, 14), 11), {
    expiresAt: new Date(Date.now() + int(10, 40) * HOUR).toISOString(),
  });
}

// The requests badge counts what's waiting.
for (const s of STYLISTS) {
  db.pendingRequests.set(
    s.id,
    db.bookings.filter(b => b.stylistId === s.id && b.status === 'requested').length
  );
}
