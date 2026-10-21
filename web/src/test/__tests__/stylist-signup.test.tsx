import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { endSession } from '@/features/auth';
import { mockApi, renderSite } from '../render';

const user = {
  id: 'u1',
  name: 'Braids by Ama',
  email: 'ama@example.com',
  emailVerified: false,
  roles: ['stylist'],
  createdAt: '2026-09-25T00:00:00Z',
  updatedAt: '2026-09-25T00:00:00Z',
};
const auth = { user, accessToken: 'access-1', refreshToken: 'refresh-1', expiresAt: 0 };

const profile = {
  id: 'p1',
  accountId: 'u1',
  displayName: 'Braids by Ama',
  handle: 'braidsbyama',
  baseArea: 'Peckham',
  serviceModels: ['home'],
  policies: { noticeHours: 48, depositType: 'fixed', depositAmount: 20 },
  verificationTier: 0,
  published: true,
  createdAt: '2026-09-25T00:00:00Z',
};

beforeEach(() => {
  endSession();
  localStorage.clear();
});

describe('a stylist setting up on the web', () => {
  it('makes an account, confirms the email and puts a page live', async () => {
    const calls = mockApi({
      'POST /api/auth/signup/': { status: 201, body: auth },
      'POST /api/consents/': { status: 201 },
      'POST /api/auth/email/start/': { resendInSeconds: 30, expiresInSeconds: 600 },
      'POST /api/auth/email/verify/': { ...user, emailVerified: true },
      'GET /api/stylists/me/': { status: 404, body: { message: 'No stylist page yet' } },
      '/api/stylists/handle-available/': { handle: 'braidsbyama', available: true },
      'POST /api/stylists/': { status: 201, body: { ...profile, published: false } },
      'POST /api/stylists/me/publish/': profile,
    });
    const typist = userEvent.setup();
    const { router } = renderSite('/auth/signup');

    // The account: the app's checks, in the app's words.
    await typist.click(screen.getByRole('button', { name: 'Create stylist account' }));
    expect(screen.getByText('Add the name clients know you by')).toBeInTheDocument();
    expect(screen.getByText('Confirm you’re 18 or over to continue')).toBeInTheDocument();

    await typist.type(screen.getByLabelText('Your name or business name'), 'Braids by Ama');
    await typist.type(screen.getByLabelText('Email'), 'ama@example.com');
    await typist.type(screen.getByLabelText('Password'), 'weak');
    await typist.type(screen.getByLabelText('Confirm password'), 'weak');
    await typist.click(screen.getByRole('checkbox'));
    await typist.click(screen.getByRole('button', { name: 'Create stylist account' }));
    expect(screen.getByText('Use at least 8 characters')).toBeInTheDocument();
    expect(calls.some(c => c.url === '/api/auth/signup/')).toBe(false);

    await typist.clear(screen.getByLabelText('Password'));
    await typist.type(screen.getByLabelText('Password'), 'Braids#2026');
    await typist.clear(screen.getByLabelText('Confirm password'));
    await typist.type(screen.getByLabelText('Confirm password'), 'Braids#2026');
    await typist.click(screen.getByRole('button', { name: 'Create stylist account' }));

    // The code, sent on arrival and confirmed as soon as it's all in.
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(calls.find(c => c.url === '/api/auth/signup/')?.body).toMatchObject({
      name: 'Braids by Ama',
      email: 'ama@example.com',
      role: 'stylist',
      ageConfirmed: true,
      policyVersion: '2026-10-21',
    });
    await waitFor(() => expect(calls.some(c => c.url === '/api/auth/email/start/')).toBe(true));
    // What she agreed to is on the record, stylist terms included.
    const consents = calls.find(c => c.url === '/api/consents/');
    expect(consents?.auth).toBe('Bearer access-1');
    expect(
      (consents?.body as { consents: { purpose: string; policyVersion: string }[] }).consents.map(
        c => [c.purpose, c.policyVersion]
      )
    ).toEqual([
      ['terms', '2026-10-21'],
      ['privacy', '2026-10-21'],
      ['stylist_terms', '2026-09'],
    ]);
    await typist.type(screen.getByLabelText('The code from the email'), '123456');

    // The page, starting from her name.
    expect(await screen.findByRole('heading', { name: 'Your name and page' })).toBeInTheDocument();
    expect(calls.find(c => c.url === '/api/auth/email/verify/')?.auth).toBe('Bearer access-1');
    expect(screen.getByLabelText('Name clients know you by')).toHaveValue('Braids by Ama');
    expect(screen.getByLabelText('Your page address')).toHaveValue('braidsbyama');
    expect(await screen.findByText('braidsbyama is free')).toBeInTheDocument();
    await typist.click(screen.getByRole('button', { name: 'Continue' }));

    // Where she works: nothing chosen yet, so she can't go on.
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await typist.click(screen.getByLabelText(/From home/));
    await typist.type(screen.getByLabelText('Your area'), 'Peckham');
    await typist.click(screen.getByRole('button', { name: 'Continue' }));

    // Her rules, then the proof step (optional), then live.
    await typist.click(screen.getByRole('button', { name: 'None' }));
    await typist.click(screen.getByRole('button', { name: 'Continue' }));
    await typist.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(/goes live at yasante.com\/braidsbyama/)).toBeInTheDocument();
    await typist.click(screen.getByRole('button', { name: 'Put my page live' }));

    expect(await screen.findByRole('heading', { name: 'Your page is live' })).toBeInTheDocument();
    expect(calls.find(c => c.method === 'POST' && c.url === '/api/stylists/')?.body).toMatchObject({
      displayName: 'Braids by Ama',
      handle: 'braidsbyama',
      serviceModels: ['home'],
      baseArea: 'Peckham',
      policies: { noticeHours: 48, depositType: 'none' },
    });
    expect(calls.some(c => c.url === '/api/stylists/me/publish/')).toBe(true);
    expect(router.state.location.pathname).toBe('/stylist-setup');
  });

  it('sends someone who isn’t signed in to sign up first', () => {
    mockApi({});
    const { router } = renderSite('/stylist-setup');
    expect(router.state.location.pathname).toBe('/auth/signup');
  });

  it('says plainly when the email already has an account', async () => {
    mockApi({
      'POST /api/auth/signup/': {
        status: 400,
        body: { message: 'An account with this email already exists.' },
      },
    });
    const typist = userEvent.setup();
    renderSite('/auth/signup');
    await typist.type(screen.getByLabelText('Your name or business name'), 'Ama');
    await typist.type(screen.getByLabelText('Email'), 'ama@example.com');
    await typist.type(screen.getByLabelText('Password'), 'Braids#2026');
    await typist.type(screen.getByLabelText('Confirm password'), 'Braids#2026');
    await typist.click(screen.getByRole('checkbox'));
    await typist.click(screen.getByRole('button', { name: 'Create stylist account' }));
    expect(
      await screen.findByText('An account with this email already exists.')
    ).toBeInTheDocument();
  });

  it('refreshes an expired session once, and carries on', async () => {
    let token = '';
    const calls = mockApi({
      'POST /api/auth/login/': { ...auth, user: { ...user, emailVerified: true } },
      'POST /api/auth/refresh-token/': {
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
        expiresAt: 0,
      },
      'GET /api/stylists/me/': (call: { auth?: string }) => {
        token = call.auth ?? '';
        return call.auth === 'Bearer access-2'
          ? profile
          : { status: 401, body: { message: 'Expired' } };
      },
      '/api/stylists/handle-available/': { handle: 'braidsbyama', available: true },
    });
    const typist = userEvent.setup();
    const { router } = renderSite('/auth/login');
    await typist.type(screen.getByLabelText('Email'), 'ama@example.com');
    await typist.type(screen.getByLabelText('Password'), 'Braids#2026');
    await typist.click(screen.getByRole('button', { name: 'Sign in' }));

    // Into her studio, with the expired token refreshed once on the way.
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/today');
    expect(token).toBe('Bearer access-2');
    expect(calls.filter(c => c.url === '/api/auth/refresh-token/')).toHaveLength(1);
  });
});
