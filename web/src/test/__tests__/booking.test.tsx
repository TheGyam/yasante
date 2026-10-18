import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { endSession, startSession } from '@/features/auth/session';
import { mockApi, renderSite } from '../render';

const client = {
  id: 'c1',
  name: 'Efua Mensah',
  email: 'efua@example.com',
  emailVerified: true,
  roles: ['client' as const],
  createdAt: '2026-09-25T00:00:00Z',
  updatedAt: '2026-09-25T00:00:00Z',
};

const page = {
  profile: {
    id: 'p1',
    accountId: 'a1',
    displayName: 'Braids by Ama',
    handle: 'ama',
    baseArea: 'Peckham',
    serviceModels: ['home'],
    policies: { noticeHours: 48, depositType: 'none' },
    verificationTier: 1,
    published: true,
    createdAt: '2026-01-01T00:00:00Z',
    checks: [],
  },
  menu: [
    {
      id: 'm1',
      name: 'Knotless braids',
      price: 120,
      fromPrice: true,
      durationMinutes: 300,
      options: [
        { id: 'l1', group: 'length', label: 'Shoulder', add: 0 },
        { id: 'l2', group: 'length', label: 'Waist', add: 40, addMinutes: 120 },
      ],
      styles: [],
    },
  ],
  photos: [],
  confirmedStyles: 0,
  reviews: [],
};

const slots = {
  minutes: 420,
  timeZone: 'Europe/London',
  days: [{ date: '2026-11-03', times: ['2026-11-03T10:00:00Z', '2026-11-03T14:00:00Z'] }],
  soonest: '2026-11-03T10:00:00Z',
  lastDate: '2027-01-02',
};

const booking = {
  id: 'b1',
  status: 'requested',
  clientName: 'Efua Mensah',
  stylistName: 'Braids by Ama',
  stylistHandle: 'ama',
  serviceId: 'm1',
  serviceName: 'Knotless braids',
  styles: [],
  optionLabels: ['Waist'],
  price: 160,
  fromPrice: false,
  bringingOwnHair: false,
  requestedTimes: ['2026-11-03T14:00:00Z'],
  moves: 0,
  area: 'Peckham',
  atClient: false,
  timeZone: 'Europe/London',
  policy: { noticeHours: 48, depositType: 'none' },
  policyVersion: '2026-09',
  createdAt: '2026-10-10T00:00:00Z',
  updatedAt: '2026-10-10T00:00:00Z',
};

beforeEach(() => {
  endSession();
  sessionStorage.clear();
});

/** Service, length, a time and the terms: everything the request needs. */
async function fillIn() {
  await userEvent.click(await screen.findByRole('radio', { name: /Knotless braids/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Waist · +£40' }));
  // Her soonest opens its day; another time that day is one tap more.
  await userEvent.click(await screen.findByRole('button', { name: /Soonest/ }));
  await userEvent.click(await screen.findByRole('button', { name: '14:00' }));
  await userEvent.click(screen.getByRole('checkbox'));
}

describe('booking on the website', () => {
  it('sends her request with her choices, priced by the stylist’s own menu', async () => {
    startSession({ user: client, accessToken: 'a', refreshToken: 'r', expiresAt: 0 });
    const calls = mockApi({
      '/api/stylists/by-handle/ama/': page,
      '/api/stylists/by-handle/ama/slots/': slots,
      'GET /api/bookings/': [],
      'POST /api/bookings/': { status: 201, body: booking },
    });
    renderSite('/book/ama');
    await fillIn();
    expect(screen.getByText('£160')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));

    expect(
      await screen.findByRole('heading', { name: 'Sent to Braids by Ama' })
    ).toBeInTheDocument();
    const sent = calls.find(c => c.method === 'POST' && c.url.endsWith('/api/bookings/'));
    expect(sent?.body).toMatchObject({
      stylistId: 'a1',
      serviceId: 'm1',
      options: { length: 'l2' },
      requestedTimes: ['2026-11-03T14:00:00Z'],
      bringingOwnHair: false,
    });
    expect(screen.getByRole('link', { name: 'See your booking' })).toHaveAttribute(
      'href',
      '/bookings/b1'
    );
  });

  it('asks a visitor for an account only to send, and keeps what she picked', async () => {
    mockApi({
      '/api/stylists/by-handle/ama/': page,
      '/api/stylists/by-handle/ama/slots/': slots,
    });
    const { router } = renderSite('/book/ama');
    await fillIn();
    await userEvent.click(screen.getByRole('button', { name: 'Create an account to send' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/auth/signup'));
    expect(router.state.location.search).toBe('?role=client&next=%2Fbook%2Fama');
    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    // Her choices wait for her.
    expect(JSON.parse(sessionStorage.getItem('yasante.booking-draft.ama')!)).toMatchObject({
      serviceId: 'm1',
      chosen: { length: 'l2' },
      time: '2026-11-03T14:00:00Z',
    });
  });

  it('lets her answer a suggested time from the booking itself', async () => {
    startSession({ user: client, accessToken: 'a', refreshToken: 'r', expiresAt: 0 });
    const suggested = { ...booking, proposal: { scheduledFor: '2026-11-04T09:00:00Z' } };
    const calls = mockApi({
      '/api/bookings/b1/': suggested,
      'POST /api/bookings/b1/proposal/': {
        ...booking,
        status: 'confirmed',
        scheduledFor: '2026-11-04T09:00:00Z',
      },
    });
    renderSite('/bookings/b1');
    await userEvent.click(await screen.findByRole('button', { name: 'That works' }));
    await waitFor(() =>
      expect(calls.find(c => c.url.endsWith('/proposal/'))?.body).toEqual({ accept: true })
    );
    expect(await screen.findByText(/Confirmed/)).toBeInTheDocument();
  });

  it('sends a signed-out visitor to sign in, then back to her bookings', async () => {
    mockApi({});
    const { router } = renderSite('/bookings');
    await waitFor(() => expect(router.state.location.pathname).toBe('/auth/login'));
    expect(router.state.location.search).toBe('?next=%2Fbookings');
  });

  it('lets her sign out, from the header or her bookings', async () => {
    startSession({ user: client, accessToken: 'a', refreshToken: 'r', expiresAt: 0 });
    const calls = mockApi({ 'GET /api/bookings/': [], 'POST /api/auth/logout/': { status: 204 } });
    const { router } = renderSite('/bookings');
    expect(await screen.findByText(/Signed in as efua@example.com/)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Sign out' })[0]);
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(calls.some(c => c.url.endsWith('/api/auth/logout/'))).toBe(true);
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });
});
