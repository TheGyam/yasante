import React from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConsentStore } from '@/shared/config/consentStore';
import { FeedOrderSwitch } from '../components/FeedOrderSwitch';
import { LookFilterBar, useFeedQuery } from '../components/LookFilterBar';
import { useLookFilters } from '../filters';

const mockPush = jest.fn();
jest.mock('@/shared/lib/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/shared/ui/dialog', () => ({ confirm: jest.fn() }));
jest.mock('@/features/auth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
jest.mock('@/features/profile', () => ({
  useUser: () => ({ data: { hairProfile: { texture: 'coily' } } }),
  useUserStore: (selector: any) => selector({ hairProfile: undefined }),
}));
jest.mock('@/shared/utils/searchHistory', () => ({ getRecentSearches: async () => [] }));
jest.mock('../hooks', () => ({
  useLookAreas: () => ({ data: [] }),
  useStyleTaxonomy: () => ({ data: [] }),
}));

beforeEach(() => {
  mockPush.mockReset();
  useLookFilters.getState().clear();
  useLookFilters.getState().setLatest(false);
  useConsentStore.setState({ consents: {} });
});

describe('hair like mine', () => {
  it('asks to use her hair details instead of filtering without them', () => {
    render(<LookFilterBar />);
    fireEvent.press(screen.getByText('Hair like mine'));
    expect(mockPush).toHaveBeenCalledWith('/settings/privacy-choices?purpose=personalisation');
    expect(useLookFilters.getState().hairLikeMine).toBe(false);
  });

  it('matches on her hair only while she allows it', async () => {
    useConsentStore.getState().setConsent('personalisation', true);
    useLookFilters.getState().setHairLikeMine(true);
    const client = new QueryClient();
    const { result } = renderHook(() => useFeedQuery(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    expect(result.current.query.hair).toBe('coily');
    // A store change reaches the hook only through an async act in this renderer.
    await act(async () => useConsentStore.getState().setConsent('personalisation', false));
    expect(result.current.query.hair).toBeUndefined();
  });
});

describe('latest', () => {
  it('asks for newest first, and stays on when the filters are cleared', async () => {
    render(<LookFilterBar />);
    fireEvent.press(screen.getByText('Latest'));
    expect(useLookFilters.getState().latest).toBe(true);
    const client = new QueryClient();
    const { result } = renderHook(() => useFeedQuery(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    expect(result.current.query.order).toBe('latest');
    // It's how she sees the feed, not a filter.
    await act(async () => useLookFilters.getState().clear());
    expect(useLookFilters.getState().latest).toBe(true);
  });
});

describe('the home feed', () => {
  it('switches between For you and Latest', () => {
    render(<FeedOrderSwitch />);
    fireEvent.press(screen.getByText('Latest'));
    expect(useLookFilters.getState().latest).toBe(true);
    fireEvent.press(screen.getByText('For you'));
    expect(useLookFilters.getState().latest).toBe(false);
  });

  it('ignores filters set on the Looks screen, but follows Latest', async () => {
    useConsentStore.getState().setConsent('personalisation', true);
    useLookFilters.getState().setHairLikeMine(true);
    useLookFilters.getState().setStyle('twists');
    const client = new QueryClient();
    const { result } = renderHook(() => useFeedQuery({ withFilters: false }), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    expect(result.current.query.style).toBeUndefined();
    expect(result.current.query.hair).toBeUndefined();
    expect(result.current.filtered).toBe(false);
    await act(async () => useLookFilters.getState().setLatest(true));
    expect(result.current.query.order).toBe('latest');
  });
});
