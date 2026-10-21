import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { currentSession, endSession, startSession } from '@/features/auth/session';
import { mockApi, renderSite } from '../render';

beforeEach(() => endSession());

describe('a forgotten password, on the web', () => {
  it('is a link away from sign-in, and says the same thing whether or not there’s an account', async () => {
    const calls = mockApi({
      'POST /api/auth/forgot-password/': { message: 'If that email is registered…' },
    });
    const typist = userEvent.setup();
    renderSite('/auth/login');
    await typist.click(screen.getByRole('link', { name: 'Forgot your password?' }));
    await typist.type(screen.getByLabelText('Email'), 'ama@example.com');
    await typist.click(screen.getByRole('button', { name: 'Email me a link' }));
    expect(
      await screen.findByText(/If there’s a Yasante account for ama@example.com/)
    ).toBeInTheDocument();
    expect(calls.find(c => c.url === '/api/auth/forgot-password/')?.body).toEqual({
      email: 'ama@example.com',
    });
  });

  it('sets a new password from the emailed link, with the app’s rules, and signs out', async () => {
    startSession({
      user: {
        id: 'u1',
        name: 'Ama',
        email: 'a@b.c',
        emailVerified: true,
        roles: ['stylist'],
        createdAt: '',
        updatedAt: '',
      },
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: 0,
    });
    const calls = mockApi({
      'POST /api/auth/reset-password/': { message: 'Your password has been reset.' },
    });
    const typist = userEvent.setup();
    renderSite('/auth/reset-password?uid=u1&token=abc-123');

    await typist.type(screen.getByLabelText('New password'), 'short');
    await typist.type(screen.getByLabelText('Confirm new password'), 'short');
    await typist.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByText('Use at least 8 characters')).toBeInTheDocument();

    await typist.clear(screen.getByLabelText('New password'));
    await typist.type(screen.getByLabelText('New password'), 'Braids#2027');
    await typist.clear(screen.getByLabelText('Confirm new password'));
    await typist.type(screen.getByLabelText('Confirm new password'), 'Braids#2027');
    await typist.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('heading', { name: 'You’re all set' })).toBeInTheDocument();
    expect(calls.find(c => c.url === '/api/auth/reset-password/')?.body).toEqual({
      uid: 'u1',
      token: 'abc-123',
      password: 'Braids#2027',
    });
    // Every session ended on the server; this tab's goes too.
    expect(currentSession()).toBeUndefined();
  });

  it('says plainly when a link has run out, and offers a new one', async () => {
    mockApi({
      'POST /api/auth/reset-password/': {
        status: 400,
        body: { message: 'This reset link has expired. Request a new one.' },
      },
    });
    const typist = userEvent.setup();
    renderSite('/auth/reset-password?uid=u1&token=old');
    await typist.type(screen.getByLabelText('New password'), 'Braids#2027');
    await typist.type(screen.getByLabelText('Confirm new password'), 'Braids#2027');
    await typist.click(screen.getByRole('button', { name: 'Change password' }));
    expect(
      await screen.findByText('This reset link has expired. Request a new one.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Email me a new link' })).toHaveAttribute(
      'href',
      '/auth/forgot-password'
    );
  });

  it('knows a link that’s been cut short', () => {
    mockApi({});
    renderSite('/auth/reset-password');
    expect(screen.getByRole('heading', { name: 'This link isn’t complete' })).toBeInTheDocument();
  });
});
