import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { endSession, startSession } from '@/features/auth/session';
import { mockApi, renderSite } from '../render';

const user = {
  id: 'u1',
  name: 'Braids by Ama',
  email: 'ama@example.com',
  emailVerified: true,
  roles: ['stylist' as const],
  createdAt: '2026-09-25T00:00:00Z',
  updatedAt: '2026-09-25T00:00:00Z',
};

const profile = {
  id: 'p1',
  accountId: 'u1',
  displayName: 'Braids by Ama',
  handle: 'braidsbyama',
  baseArea: 'Peckham',
  serviceModels: ['home'],
  policies: { noticeHours: 48, depositType: 'fixed', depositAmount: 20 },
  availability: { week: [null, null, null, null, null, null, null], blocked: [] },
  paymentMethods: [{ id: 'm1', label: 'Monzo', details: 'monzo.me/ama' }],
  verificationTier: 0,
  published: true,
  createdAt: '2026-09-25T00:00:00Z',
};

const knotless = {
  id: 's1',
  name: 'Knotless braids',
  price: 120,
  fromPrice: true,
  durationMinutes: 300,
  options: [],
  styles: [],
};

/** A signed-in stylist with a live page, as if she'd just signed in. */
function signedIn(api: Record<string, unknown>) {
  startSession({ user, accessToken: 'a', refreshToken: 'r', expiresAt: 0 });
  return mockApi({
    'GET /api/stylists/me/': profile,
    '/api/stylists/me/summary/': { pendingRequests: 1, appointmentsToday: 0 },
    '/api/stylists/me/menu/': [knotless],
    '/api/stylists/me/portfolio/': [],
    '/api/looks/mine/': [],
    '/api/bookings/': [],
    '/api/styles/': [
      { id: 'knotless', name: 'Knotless braids' },
      { id: 'twists', name: 'Twists' },
    ],
    ...api,
  });
}

beforeEach(() => {
  endSession();
  localStorage.clear();
});

describe('her studio', () => {
  it('lists what’s left before clients arrive, from what’s really on her page', async () => {
    signedIn({});
    renderSite('/today');
    const list = await screen.findByRole('heading', {
      name: /Get ready for clients · 3 of 5 done/,
    });
    const steps = within(list.closest('section')!);
    // Live, services added and a way to be paid: done. Hours and looks: not yet.
    expect(steps.getByText('Set your working hours')).toBeInTheDocument();
    expect(steps.getByText('Post your work')).toBeInTheDocument();
    expect(steps.queryByText('Add your services and prices')).toBeNull();
    // A waiting request shows on the tab.
    expect(screen.getByLabelText('1 waiting')).toBeInTheDocument();
  });

  it('sends a stylist without a page to set one up', async () => {
    startSession({ user, accessToken: 'a', refreshToken: 'r', expiresAt: 0 });
    mockApi({ 'GET /api/stylists/me/': { status: 404, body: { message: 'No stylist page yet' } } });
    const { router } = renderSite('/menu');
    await waitFor(() => expect(router.state.location.pathname).toBe('/stylist-setup'));
  });

  it('posts a batch of work to the feed and her page, linked', async () => {
    let uploads = 0;
    let looks = 0;
    const calls = signedIn({
      'POST /api/uploads/': () => ({
        status: 201,
        body: {
          id: `m${++uploads}`,
          uri: `https://x/${uploads}.jpg`,
          thumbUri: `https://x/${uploads}t.jpg`,
          photoAspect: 0.8,
        },
      }),
      'POST /api/looks/': (call: { body?: unknown }) => ({
        status: 201,
        body: { ...(call.body as object), id: `l${++looks}`, photoUri: `https://x/${looks}.jpg` },
      }),
      'POST /api/stylists/me/portfolio/': { status: 201, body: [] },
    });
    const typist = userEvent.setup();
    const { router } = renderSite('/looks/new');
    const input = (await screen.findByText('Choose photos of your work'))
      .closest('label')!
      .querySelector('input')!;
    await typist.upload(input, [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
    ]);
    expect(screen.getByRole('button', { name: 'Post 2 photos' })).toBeDisabled();

    // One choice for the whole batch.
    await typist.selectOptions(screen.getAllByRole('combobox', { name: 'Style' })[0], 'knotless');
    await typist.selectOptions(screen.getAllByRole('combobox', { name: 'Service' })[0], 's1');
    await typist.click(screen.getByRole('button', { name: 'Post 2 photos' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/portfolio'));
    const posted = calls.filter(c => c.url === '/api/looks/' && c.method === 'POST');
    expect(posted.map(c => c.body)).toEqual([
      expect.objectContaining({
        photoUri: 'https://x/1.jpg',
        styles: ['knotless'],
        serviceId: 's1',
        visibility: 'public',
      }),
      expect.objectContaining({
        photoUri: 'https://x/2.jpg',
        styles: ['knotless'],
        serviceId: 's1',
      }),
    ]);
    const onPage = calls.filter(
      c => c.url === '/api/stylists/me/portfolio/' && c.method === 'POST'
    );
    expect(onPage.map(c => (c.body as { photos: { lookId: string }[] }).photos[0].lookId)).toEqual([
      'l1',
      'l2',
    ]);
  });

  it('adds a service priced by length and size', async () => {
    const calls = signedIn({ 'POST /api/stylists/me/menu/': { status: 201, body: knotless } });
    const typist = userEvent.setup();
    const { router } = renderSite('/menu/new');
    await typist.click(await screen.findByRole('button', { name: 'Box braids' }));
    await typist.type(screen.getByLabelText('Price (£)'), '110');
    await typist.click(screen.getByRole('button', { name: 'Add to my menu' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/menu'));
    const body = calls.find(c => c.method === 'POST' && c.url === '/api/stylists/me/menu/')
      ?.body as {
      name: string;
      price: number;
      durationMinutes: number;
      options: { group: string; label: string; add: number }[];
    };
    expect(body).toMatchObject({ name: 'Box braids', price: 110, durationMinutes: 300 });
    expect(body.options.map(o => `${o.group}:${o.label}:${o.add}`)).toEqual([
      'length:Shoulder:0',
      'length:Mid-back:20',
      'length:Waist:40',
      'size:Large:0',
      'size:Medium:20',
      'size:Small:40',
    ]);
  });

  it('accepts a request at the time asked, with her deposit and how to pay it', async () => {
    const at = '2026-10-04T10:00:00Z';
    const request = {
      id: 'b1',
      status: 'requested',
      clientName: 'Efua Mensah',
      clientRecord: { attended: 3, noShows: 0, lateCancellations: 0 },
      serviceId: 's1',
      serviceName: 'Knotless braids',
      price: 120,
      fromPrice: false,
      requestedTimes: [at],
      policy: { noticeHours: 48, depositType: 'fixed', depositAmount: 20 },
      policyVersion: '1',
      styles: [],
      stylistName: 'Braids by Ama',
      area: 'Peckham',
      bringingOwnHair: false,
      moves: 0,
      createdAt: at,
      updatedAt: at,
    };
    const calls = signedIn({
      'GET /api/bookings/b1/': request,
      'POST /api/bookings/b1/accept/': { ...request, status: 'awaiting_deposit', scheduledFor: at },
    });
    const typist = userEvent.setup();
    const { router } = renderSite('/requests/b1');
    expect(await screen.findByText('3 styles, never missed one')).toBeInTheDocument();
    expect(screen.getByLabelText('Deposit to confirm (£)')).toHaveValue('20');
    await typist.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/requests'));
    expect(calls.find(c => c.url === '/api/bookings/b1/accept/')?.body).toEqual({
      scheduledFor: at,
      deposit: { amount: 20, method: 'Monzo · monzo.me/ama' },
    });
  });

  it('takes her own notice and how far ahead', async () => {
    const calls = signedIn({
      'PATCH /api/stylists/me/': (call: { body?: unknown }) => ({
        ...profile,
        ...(call.body as object),
      }),
    });
    const typist = userEvent.setup();
    renderSite('/availability');
    await typist.click(await screen.findByRole('button', { name: 'Your own' }));
    await typist.type(screen.getByLabelText('Hours'), '36');
    await typist.click(screen.getByRole('button', { name: '6 months' }));
    await typist.click(screen.getByRole('button', { name: 'Save hours' }));
    await waitFor(() =>
      expect(calls.find(c => c.method === 'PATCH')?.body).toMatchObject({
        availability: { leadHours: 36, aheadDays: 182 },
      })
    );
  });

  it('closes a day she has enough clients for, from Today', async () => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    tomorrow.setHours(11, 0, 0, 0);
    const day = tomorrow.toLocaleDateString('en-CA');
    const calls = signedIn({
      '/api/bookings/': [
        {
          id: 'b2',
          status: 'confirmed',
          clientName: 'Efua Mensah',
          serviceName: 'Knotless braids',
          scheduledFor: tomorrow.toISOString(),
        },
      ],
      'POST /api/stylists/me/closed-days/': {
        ...profile,
        availability: { ...profile.availability, closed: [day] },
      },
    });
    const typist = userEvent.setup();
    renderSite('/today');
    await typist.click(await screen.findByRole('switch', { name: /Taking new requests/ }));
    await waitFor(() =>
      expect(calls.find(c => c.url === '/api/stylists/me/closed-days/')?.body).toEqual({
        date: day,
        closed: true,
      })
    );
    expect(await screen.findByText('Closed: you have enough clients this day')).toBeInTheDocument();
  });

  it('blocks out part of a day on her own clock, with a note only she sees', async () => {
    const calls = signedIn({
      'GET /api/stylists/me/': { ...profile, timeZone: 'Europe/London' },
      'GET /api/stylists/me/blocks/': [],
      'POST /api/stylists/me/blocks/': {
        status: 201,
        body: { id: 't1', start: '2026-12-05T11:00:00Z', end: '2026-12-05T13:00:00Z' },
      },
    });
    const typist = userEvent.setup();
    renderSite('/availability');
    const day = await screen.findByLabelText('Day');
    await typist.type(day, '2026-12-05');
    const from = screen.getAllByLabelText('From').at(-1)!;
    await typist.clear(from);
    await typist.type(from, '11:00');
    const until = screen.getAllByLabelText('Until').at(-1)!;
    await typist.clear(until);
    await typist.type(until, '13:00');
    await typist.type(screen.getByLabelText('Note for you (optional)'), 'Private client');
    await typist.click(screen.getByRole('button', { name: 'Every Saturday' }));
    await typist.click(screen.getByRole('button', { name: 'Block it out' }));
    // December in London is UTC.
    await waitFor(() =>
      expect(
        calls.find(c => c.url === '/api/stylists/me/blocks/' && c.method === 'POST')?.body
      ).toEqual({
        start: '2026-12-05T11:00:00.000Z',
        end: '2026-12-05T13:00:00.000Z',
        note: 'Private client',
        repeats: [6],
      })
    );
  });

  it('skips one day of a repeating block, and puts it back', async () => {
    const lunch = {
      id: 't2',
      start: '2026-10-12T12:00:00Z',
      end: '2026-10-12T13:00:00Z',
      note: 'Lunch',
      repeats: [0, 1, 2, 3, 4, 5, 6],
      skips: [],
    };
    const calls = signedIn({
      'GET /api/stylists/me/blocks/': [lunch],
      'POST /api/stylists/me/blocks/t2/skip/': (call: { body?: unknown }) => ({
        ...lunch,
        skips: [(call.body as { date: string }).date],
      }),
    });
    const typist = userEvent.setup();
    renderSite('/availability');
    const days = await screen.findByRole('group', { name: 'Days it lands on' });
    const first = within(days).getAllByRole('button')[0];
    await typist.click(first);
    await waitFor(() =>
      expect(calls.find(c => c.url === '/api/stylists/me/blocks/t2/skip/')?.body).toMatchObject({
        skip: true,
      })
    );
  });
});
