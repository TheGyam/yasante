import React from 'react';
import { Linking } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, renderWithTheme, waitFor } from '@/test-utils';
import { stylistApi } from '../../api';
import type { StylistPage } from '../../types';
import { ClaimNote, FeaturedActions } from '../FeaturedActions';

const mockAuth = { isAuthenticated: false };
jest.mock('@/features/auth', () => ({ useAuth: () => mockAuth }));
const mockPush = jest.fn();
jest.mock('@/shared/lib/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

const page = (profile: Partial<StylistPage['profile']> = {}, extra: Partial<StylistPage> = {}) =>
  ({
    profile: {
      id: 'p1',
      accountId: 'a1',
      displayName: 'Efe',
      handle: 'efe',
      serviceModels: [],
      baseArea: 'Croydon',
      policies: { noticeHours: 24, depositType: 'none', rescheduleFreeOnce: true },
      verificationTier: 0,
      published: true,
      createdAt: '2026-01-01T00:00:00Z',
      featured: true,
      claimable: true,
      ...profile,
    },
    menu: [],
    photos: [],
    confirmedStyles: 0,
    reviews: [],
    ...extra,
  }) as StylistPage;

function setup(data: StylistPage) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['stylist', 'page', data.profile.handle], data);
  const Live = () => {
    const [current, setCurrent] = React.useState(data);
    React.useEffect(
      () =>
        client.getQueryCache().subscribe(() => {
          const next = client.getQueryData<StylistPage>(['stylist', 'page', data.profile.handle]);
          if (next) setCurrent(next);
        }),
      []
    );
    return <FeaturedActions page={current} />;
  };
  return renderWithTheme(
    <QueryClientProvider client={client}>
      <Live />
      <ClaimNote page={data} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockAuth.isAuthenticated = false;
  mockPush.mockClear();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

it('books a TikTok-only stylist on TikTok, and says where to claim', () => {
  const { getByText } = setup(page({ tiktokHandle: 'efe.braids' }));
  fireEvent.press(getByText('Book on TikTok'));
  expect(Linking.openURL).toHaveBeenCalledWith('https://www.tiktok.com/@efe.braids');
  fireEvent.press(getByText('Is this you? Make this page yours.'));
  expect(getByText(/@yasante_beauty on TikTok from @efe\.braids/)).toBeTruthy();
});

it('with both, books on Instagram and offers TikTok beside it', () => {
  const { getByText } = setup(page({ instagramHandle: 'efe.ig', tiktokHandle: 'efe.tok' }));
  fireEvent.press(getByText('Book on Instagram'));
  expect(Linking.openURL).toHaveBeenCalledWith('https://www.instagram.com/efe.ig/');
  fireEvent.press(getByText('Also on TikTok'));
  expect(Linking.openURL).toHaveBeenLastCalledWith('https://www.tiktok.com/@efe.tok');
});

it('signed out, asks for an account to join the waitlist', () => {
  const { getByText } = setup(page({ instagramHandle: 'efe.ig' }));
  fireEvent.press(getByText('Sign in to join the waitlist'));
  expect(mockPush).toHaveBeenCalledWith('/auth/join');
});

it('joins at once, and goes back if it fails', async () => {
  mockAuth.isAuthenticated = true;
  const set = jest
    .spyOn(stylistApi, 'setWaitlist')
    .mockResolvedValueOnce({ joined: true })
    .mockRejectedValueOnce(new Error('nope'));
  const { getByText, findByText } = setup(
    page({ instagramHandle: 'efe.ig' }, { waitlistJoined: false })
  );
  fireEvent.press(getByText('Join the waitlist'));
  expect(await findByText('On the waitlist')).toBeTruthy();
  expect(set).toHaveBeenCalledWith('efe', true);
  fireEvent.press(getByText('On the waitlist'));
  await waitFor(() => expect(getByText('On the waitlist')).toBeTruthy());
  expect(set).toHaveBeenLastCalledWith('efe', false);
});
