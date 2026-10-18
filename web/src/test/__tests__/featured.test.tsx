import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { endSession, startSession } from '@/features/auth/session';
import { mockApi, renderSite } from '../render';

const user = {
  id: 'u1',
  name: 'Ama Braids',
  email: 'ama@example.com',
  emailVerified: true,
  roles: ['stylist' as const],
  createdAt: '2026-09-25T00:00:00Z',
  updatedAt: '2026-09-25T00:00:00Z',
};

const featuredStylist = {
  profile: {
    id: 'p1',
    accountId: 'a1',
    displayName: 'Ama Braids',
    handle: 'amabraids',
    instagramHandle: 'amabraids_ig',
    bio: 'Neat knotless braids',
    baseArea: 'Peckham',
    serviceModels: ['home'],
    featured: true,
    claimable: true,
    published: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  menu: [],
  photos: [],
  reviews: [],
};

beforeEach(() => {
  endSession();
  window.history.pushState({}, '', '/');
});

describe('featured stylists', () => {
  it('shows Featured label, Book on Instagram, Join the waitlist, and no prices, booking or reviews', async () => {
    mockApi({
      '/api/stylists/by-handle/amabraids/': featuredStylist,
      '/api/stylists/by-handle/amabraids/portfolio/': [],
    });

    renderSite('/amabraids');

    expect(await screen.findByRole('heading', { name: 'Ama Braids' })).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('Not taking bookings on Yasante yet')).toBeInTheDocument();

    const instaLink = screen.getByRole('link', { name: 'Book on Instagram' });
    expect(instaLink).toHaveAttribute('href', 'https://www.instagram.com/amabraids_ig/');

    expect(screen.getByRole('button', { name: 'Join the waitlist' })).toBeInTheDocument();
    expect(screen.queryByText(/Book an appointment/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Reviews/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Policies/i)).not.toBeInTheDocument();
  });

  it('toggles waitlist optimistically and rolls back on error', async () => {
    startSession({ user, accessToken: 'tok', refreshToken: 'ref', expiresAt: 0 });
    let waitlistJoined = false;

    mockApi({
      '/api/stylists/by-handle/amabraids/': () => ({
        ...featuredStylist,
        waitlistJoined,
      }),
      '/api/stylists/by-handle/amabraids/portfolio/': [],
      'PUT /api/stylists/by-handle/amabraids/waitlist/': () => {
        waitlistJoined = true;
        return { joined: true, count: 1 };
      },
      'DELETE /api/stylists/by-handle/amabraids/waitlist/': () => {
        waitlistJoined = false;
        return { joined: false, count: 0 };
      },
    });

    renderSite('/amabraids');
    const userEv = userEvent.setup();

    const joinBtn = await screen.findByRole('button', { name: 'Join the waitlist' });
    await userEv.click(joinBtn);

    expect(await screen.findByRole('button', { name: 'On the waitlist' })).toBeInTheDocument();

    await userEv.click(screen.getByRole('button', { name: 'On the waitlist' }));
    expect(await screen.findByRole('button', { name: 'Join the waitlist' })).toBeInTheDocument();
  });

  it('redirects signed out visitor to sign-in on waitlist tap and joins on return', async () => {
    // 1. Signed out: clicking Join the waitlist redirects to login with ?next=/amabraids?waitlist=1
    mockApi({
      '/api/stylists/by-handle/amabraids/': featuredStylist,
      '/api/stylists/by-handle/amabraids/portfolio/': [],
    });

    const { router } = renderSite('/amabraids');
    const userEv = userEvent.setup();

    const joinBtn = await screen.findByRole('button', { name: 'Join the waitlist' });
    await userEv.click(joinBtn);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/auth/login');
      expect(router.state.location.search).toContain('next=%2Famabraids%3Fwaitlist%3D1');
    });

    // 2. Returning signed in with ?waitlist=1 automatically joins
    startSession({ user, accessToken: 'tok', refreshToken: 'ref', expiresAt: 0 });
    let putCalled = false;
    mockApi({
      '/api/stylists/by-handle/amabraids/': featuredStylist,
      '/api/stylists/by-handle/amabraids/portfolio/': [],
      'PUT /api/stylists/by-handle/amabraids/waitlist/': () => {
        putCalled = true;
        return { joined: true, count: 1 };
      },
    });

    renderSite('/amabraids?waitlist=1');
    await waitFor(() => expect(putCalled).toBe(true));
  });

  it('"Is this you? Make this page yours." appears only when claimable and reveals note in place', async () => {
    // Not claimable
    mockApi({
      '/api/stylists/by-handle/amabraids/': {
        ...featuredStylist,
        profile: { ...featuredStylist.profile, claimable: false },
      },
      '/api/stylists/by-handle/amabraids/portfolio/': [],
    });

    const site1 = renderSite('/amabraids');
    await screen.findByRole('heading', { name: 'Ama Braids' });
    expect(screen.queryByText(/Is this you\? Make this page yours\./)).not.toBeInTheDocument();
    site1.unmount();

    // Claimable
    mockApi({
      '/api/stylists/by-handle/amabraids/': featuredStylist,
      '/api/stylists/by-handle/amabraids/portfolio/': [],
    });

    renderSite('/amabraids');
    const userEv = userEvent.setup();

    const trigger = await screen.findByRole('button', { name: /Is this you\? Make this page yours\./ });
    expect(trigger).toBeInTheDocument();

    await userEv.click(trigger);
    const note = screen.getByText(/and we'll send you a link to make this page yours\./);
    expect(note).toBeInTheDocument();
    expect(note.closest('span')).toHaveTextContent(
      "Message @yasante on Instagram from @amabraids_ig and we'll send you a link to make this page yours."
    );
  });

  it('a look by a featured stylist shows Featured and no booking link', async () => {
    const look = {
      id: 'l1',
      stylistFeatured: true,
      photoUri: 'https://example.com/look.jpg',
      photos: [{ uri: 'https://example.com/look.jpg', aspect: 1 }],
      authorId: 'a1',
      authorName: 'Ama Braids',
      stylist: { id: 'a1', name: 'Ama Braids', handle: 'amabraids' },
      styles: ['knotless'],
      products: [],
      visibility: 'public',
      price: 120,
      fromPrice: true,
      serviceName: 'Knotless braids',
      likeCount: 0,
      liked: false,
      commentCount: 0,
      saveCount: 0,
      saved: false,
      createdAt: '2026-01-01T00:00:00Z',
      mine: false,
    };

    mockApi({
      '/api/looks/l1/': look,
      '/api/looks/l1/comments/': { data: [] },
      '/api/looks/': { data: [look] },
    });

    renderSite('/looks/l1');
    expect(await screen.findByText('Featured')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Book this look/i })).not.toBeInTheDocument();
  });

  it('the claim screen shows the waiting count only when > 0 with proper singular and plural', async () => {
    // 0 waiting
    mockApi({
      '/api/featured/claim/code-zero/': {
        code: 'code-zero',
        displayName: 'Ama Braids',
        handle: 'amabraids',
        live: true,
        waiting: 0,
        photos: [],
      },
    });

    const s0 = renderSite('/claim/code-zero');
    expect(await screen.findByRole('heading', { name: 'This is your page, Ama Braids' })).toBeInTheDocument();
    expect(screen.queryByText(/waiting to book you/)).not.toBeInTheDocument();
    s0.unmount();

    // 1 waiting (singular)
    mockApi({
      '/api/featured/claim/code-one/': {
        code: 'code-one',
        displayName: 'Ama Braids',
        handle: 'amabraids',
        live: true,
        waiting: 1,
        photos: [],
      },
    });

    const s1 = renderSite('/claim/code-one');
    expect(await screen.findByText('1 person is waiting to book you')).toBeInTheDocument();
    s1.unmount();

    // 14 waiting (plural)
    mockApi({
      '/api/featured/claim/code-many/': {
        code: 'code-many',
        displayName: 'Ama Braids',
        handle: 'amabraids',
        live: true,
        waiting: 14,
        photos: [],
      },
    });

    renderSite('/claim/code-many');
    expect(await screen.findByText('14 people are waiting to book you')).toBeInTheDocument();
  });

  it('claim screen signed out buttons keep ?next=/claim/:code and signed in claims and lands on /finish', async () => {
    // Signed out
    mockApi({
      '/api/featured/claim/mycode/': {
        code: 'mycode',
        displayName: 'Ama Braids',
        handle: 'amabraids',
        live: true,
        waiting: 5,
        photos: [],
      },
    });

    const { unmount } = renderSite('/claim/mycode');
    const signupBtn = await screen.findByRole('link', { name: 'Sign up' });
    const signinBtn = screen.getByRole('link', { name: 'Sign in' });

    expect(signupBtn).toHaveAttribute('href', '/auth/signup?next=%2Fclaim%2Fmycode');
    expect(signinBtn).toHaveAttribute('href', '/auth/login?next=%2Fclaim%2Fmycode');
    unmount();

    // Signed in
    startSession({ user, accessToken: 'tok', refreshToken: 'ref', expiresAt: 0 });
    let claimed = false;

    mockApi({
      '/api/featured/claim/mycode/': {
        code: 'mycode',
        displayName: 'Ama Braids',
        handle: 'amabraids',
        live: true,
        waiting: 5,
        photos: [],
      },
      'POST /api/featured/claim/mycode/': () => {
        claimed = true;
        return user;
      },
      'GET /api/stylists/me/finish/': {
        done: false,
        styles: [],
        hoursSet: false,
        tagsChecked: false,
      },
      'GET /api/stylists/me/': { id: 'p1', handle: 'amabraids' },
    });

    const site2 = renderSite('/claim/mycode');
    const userEv = userEvent.setup();

    const claimBtn = await screen.findByRole('button', { name: 'Make it yours' });
    await userEv.click(claimBtn);

    await waitFor(() => {
      expect(claimed).toBe(true);
      expect(site2.router.state.location.pathname).toBe('/finish');
    });
  });

  it('used or expired link shows only the plan’s words on 410', async () => {
    mockApi({
      '/api/featured/claim/expired-code/': {
        status: 410,
        body: { message: 'Link expired' },
      },
    });

    renderSite('/claim/expired-code');

    expect(
      await screen.findByText(/This link has already been used or has run out\. Message/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make it yours' })).not.toBeInTheDocument();
  });

  it('pricing a style ticks it off, checklist counts progress, and done shows final message', async () => {
    startSession({ user, accessToken: 'tok', refreshToken: 'ref', expiresAt: 0 });

    let finishState = {
      done: false,
      styles: [{ slug: 'knotless', name: 'Knotless braids', photoCount: 4, priced: false }],
      hoursSet: false,
      tagsChecked: false,
    };

    mockApi({
      'GET /api/stylists/me/finish/': () => finishState,
      'POST /api/stylists/me/finish/price/': () => {
        finishState = {
          ...finishState,
          styles: [{ slug: 'knotless', name: 'Knotless braids', photoCount: 4, priced: true }],
        };
        return finishState;
      },
      'GET /api/stylists/me/': {
        id: 'p1',
        accountId: 'u1',
        displayName: 'Ama Braids',
        handle: 'amabraids',
        published: true,
        serviceModels: ['home'],
        policies: { noticeHours: 48, depositType: 'fixed', depositAmount: 20 },
        availability: { week: [null, null, null, null, null, null, null], blocked: [] },
      },
    });

    renderSite('/finish');
    const userEv = userEvent.setup();

    expect(await screen.findByText('0 of 3 done')).toBeInTheDocument();
    expect(screen.getByText('4 of your photos are Knotless braids. What do you charge?')).toBeInTheDocument();

    const priceInput = screen.getByLabelText('Price (£)');
    await userEv.type(priceInput, '120');

    const saveBtn = screen.getByRole('button', { name: 'Save price' });
    await userEv.click(saveBtn);

    expect(await screen.findByText('1 of 3 done')).toBeInTheDocument();
    expect(screen.getByText(/Knotless braids · 4 photos/)).toBeInTheDocument();

    // When all done
    finishState = {
      done: true,
      styles: [{ slug: 'knotless', name: 'Knotless braids', photoCount: 4, priced: true }],
      hoursSet: true,
      tagsChecked: true,
    };

    renderSite('/finish');
    expect(
      await screen.findByText("You're taking bookings. Everyone on your waitlist has been told.")
    ).toBeInTheDocument();
  });

  it('Today shows Finish your page card until done', async () => {
    startSession({ user, accessToken: 'tok', refreshToken: 'ref', expiresAt: 0 });

    let finishState = {
      done: false,
      styles: [{ slug: 'knotless', name: 'Knotless braids', photoCount: 4, priced: false }],
      hoursSet: true,
      tagsChecked: false,
    };

    const fullProfile = {
      id: 'p1',
      accountId: 'u1',
      displayName: 'Ama Braids',
      handle: 'amabraids',
      published: true,
      baseArea: 'Peckham',
      serviceModels: ['home'],
      policies: { noticeHours: 48, depositType: 'fixed', depositAmount: 20 },
      availability: { week: [null, null, null, null, null, null, null], blocked: [] },
      paymentMethods: [{ id: 'm1', label: 'Monzo', details: 'monzo.me/ama' }],
      verificationTier: 0,
      createdAt: '2026-09-25T00:00:00Z',
    };

    mockApi({
      'GET /api/stylists/me/': fullProfile,
      'GET /api/stylists/me/summary/': { pendingRequests: 0, appointmentsToday: 0 },
      'GET /api/stylists/me/menu/': [],
      'GET /api/stylists/me/portfolio/': [],
      'GET /api/looks/mine/': [],
      'GET /api/bookings/': [],
      'GET /api/stylists/me/finish/': () => finishState,
    });

    const s1 = renderSite('/today');
    expect(await screen.findByText('Finish your page · 1 of 3 done')).toBeInTheDocument();
    s1.unmount();

    // Now done
    finishState = {
      done: true,
      styles: [{ slug: 'knotless', name: 'Knotless braids', photoCount: 4, priced: true }],
      hoursSet: true,
      tagsChecked: true,
    };

    renderSite('/today');
    await screen.findByRole('heading', { name: 'Today' });
    expect(screen.queryByText(/Finish your page ·/)).not.toBeInTheDocument();
  });

  it('Check your tags banner on /portfolio and look tags editing', async () => {
    startSession({ user, accessToken: 'tok', refreshToken: 'ref', expiresAt: 0 });

    let tagsChecked = false;
    let lookUpdated = false;

    const myLook = {
      id: 'look-1',
      photoUri: 'https://example.com/look.jpg',
      photos: [{ uri: 'https://example.com/look.jpg', aspect: 1 }],
      authorId: 'u1',
      authorName: 'Ama Braids',
      styles: ['knotless'],
      hairTexture: 'curly' as const,
      visibility: 'public' as const,
      likeCount: 0,
      liked: false,
      commentCount: 0,
      saveCount: 0,
      saved: false,
      createdAt: '2026-01-01T00:00:00Z',
      mine: true,
    };

    mockApi({
      'GET /api/stylists/me/': {
        id: 'p1',
        accountId: 'u1',
        displayName: 'Ama Braids',
        handle: 'amabraids',
        published: true,
      },
      'GET /api/stylists/me/summary/': { pendingRequests: 0, appointmentsToday: 0 },
      'GET /api/stylists/me/finish/': () => ({
        done: false,
        styles: [],
        hoursSet: true,
        tagsChecked,
      }),
      'POST /api/stylists/me/finish/tags-checked/': () => {
        tagsChecked = true;
        return { done: false, styles: [], hoursSet: true, tagsChecked: true };
      },
      'GET /api/stylists/me/portfolio/': [],
      'GET /api/stylists/by-handle/amabraids/portfolio/': [],
      'GET /api/looks/mine/': [myLook],
      'GET /api/styles/': [
        { id: 'knotless', name: 'Knotless braids' },
        { id: 'twists', name: 'Twists' },
      ],
      'PATCH /api/looks/look-1/': (call: { body?: unknown }) => {
        lookUpdated = true;
        return { ...myLook, ...(call.body as object) };
      },
    });

    renderSite('/portfolio');
    const userEv = userEvent.setup();

    expect(await screen.findByText('Check your tags')).toBeInTheDocument();
    expect(screen.getByText('We tagged your photos for you. Fix any we got wrong.')).toBeInTheDocument();

    const rightBtn = screen.getByRole('button', { name: 'These look right' });
    await userEv.click(rightBtn);

    await waitFor(() => {
      expect(tagsChecked).toBe(true);
      expect(screen.queryByText('Check your tags')).not.toBeInTheDocument();
    });

    const editBtn = screen.getByRole('button', { name: /Edit tags/i });
    await userEv.click(editBtn);

    expect(screen.getByText('Style (pick up to 3)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Twists' })).toBeInTheDocument();

    await userEv.click(screen.getByRole('button', { name: 'Twists' }));
    await userEv.click(screen.getByRole('button', { name: 'Save tags' }));

    await waitFor(() => expect(lookUpdated).toBe(true));
  });
});
