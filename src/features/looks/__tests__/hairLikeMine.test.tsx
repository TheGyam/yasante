import React from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { useConsentStore } from '@/shared/config/consentStore';
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
jest.mock('../hooks', () => ({
  useLookAreas: () => ({ data: [] }),
  useStyleTaxonomy: () => ({ data: [] }),
}));

beforeEach(() => {
  mockPush.mockReset();
  useLookFilters.getState().clear();
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
    const { result } = renderHook(() => useFeedQuery());
    expect(result.current.query.hair).toBe('coily');
    // A store change reaches the hook only through an async act in this renderer.
    await act(async () => useConsentStore.getState().setConsent('personalisation', false));
    expect(result.current.query.hair).toBeUndefined();
  });
});
