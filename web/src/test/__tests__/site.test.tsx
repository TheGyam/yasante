import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeQueryClient } from '@/shared/lib/queryClient';
import { seedFromPage } from '@/shared/lib/pageData';
import { mockApi, renderSite } from '../render';

const page = {
  profile: {
    id: 'p1',
    accountId: 'a1',
    displayName: 'Braids by Ama',
    handle: 'ama',
    bio: 'Knotless, done neat.',
    baseArea: 'Peckham',
    serviceModels: ['home'],
    policies: { noticeHours: 48, depositType: 'fixed', depositAmount: 20 },
    verificationTier: 1,
    published: true,
    createdAt: '2026-01-01T00:00:00Z',
    checks: ['phone', 'work'],
  },
  menu: [
    {
      id: 'm1',
      name: 'Knotless braids',
      price: 120,
      fromPrice: true,
      durationMinutes: 300,
      options: [],
      styles: [],
    },
  ],
  photos: [],
  confirmedStyles: 3,
  reviews: [],
};

describe('the site', () => {
  it('opens her page on the data the server sent with it, without asking again', () => {
    const calls = mockApi({});
    document.body.insertAdjacentHTML(
      'beforeend',
      `<script id="page-data" type="application/json">${JSON.stringify([{ key: ['stylist', 'ama'], data: page }])}</script>`
    );
    const client = makeQueryClient();
    seedFromPage(client);
    renderSite('/ama', client);

    expect(screen.getByRole('heading', { name: 'Braids by Ama' })).toBeInTheDocument();
    expect(screen.getByText('from £120')).toBeInTheDocument();
    expect(screen.getByText('£20 deposit')).toBeInTheDocument();
    expect(screen.getByText('Phone and work checked')).toBeInTheDocument();
    expect(calls.filter(c => c.url.includes('/stylists/'))).toEqual([]);
    expect(document.getElementById('page-data')).toBeNull();
  });

  it('loads her page when it came without data, and says plainly when there isn’t one', async () => {
    mockApi({ '/api/stylists/by-handle/ama/': page });
    renderSite('/ama');
    expect(await screen.findByRole('heading', { name: 'Braids by Ama' })).toBeInTheDocument();

    renderSite('/nobody');
    expect(await screen.findByRole('heading', { name: 'No page here' })).toBeInTheDocument();
    expect(screen.getByText(/Nobody on Yasante goes by @nobody/)).toBeInTheDocument();
  });

  it('shows the site’s not-found page for an address it doesn’t have', () => {
    mockApi({});
    renderSite('/looks/some/where');
    expect(
      screen.getByRole('heading', { name: 'There’s nothing at this address' })
    ).toBeInTheDocument();
  });

  it('adds someone to the waitlist, keeping where they came from', async () => {
    const calls = mockApi({ '/api/waitlist/': { status: 201 }, '/api/looks/': { data: [] } });
    renderSite('/?from=ama');
    await userEvent.type(screen.getByLabelText('Email'), 'efua@example.com');
    await userEvent.selectOptions(screen.getByLabelText('I’m'), 'stylist');
    await userEvent.click(screen.getAllByRole('button', { name: 'Join the waitlist' }).at(-1)!);

    expect(await screen.findByText('You’re on the list.')).toBeInTheDocument();
    expect(calls.find(c => c.url === '/api/waitlist/')?.body).toEqual({
      email: 'efua@example.com',
      role: 'stylist',
      area: '',
      source: 'ama',
      website: '',
    });
  });

  it('says what went wrong with the waitlist in the server’s words', async () => {
    mockApi({
      '/api/waitlist/': { status: 400, body: { message: 'Email doesn’t look right.' } },
      '/api/looks/': { data: [] },
    });
    renderSite('/');
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.c');
    await userEvent.click(screen.getAllByRole('button', { name: 'Join the waitlist' }).at(-1)!);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Email doesn’t look right.')
    );
  });
});
