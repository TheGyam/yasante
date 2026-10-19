import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useFeature } from '@/shared/config/features';
import ComposeLookScreen from '../new';

jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}) }));
jest.mock('@/shared/lib/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/shared/ui/Screen', () => ({ Screen: ({ children }: any) => children }));
jest.mock('@/shared/ui/dialog', () => ({ notify: jest.fn() }));
jest.mock('@/shared/lib/haptics', () => ({ haptics: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/shared/config/features', () => ({ useFeature: jest.fn() }));

const mockPickManyFromLibrary = jest.fn();
jest.mock('@/shared/hooks/useImagePicker', () => ({
  useImagePicker: () => ({ pickManyFromLibrary: mockPickManyFromLibrary, error: null }),
}));

jest.mock('@/features/auth', () => ({
  errorMessage: () => '',
  useAuth: () => ({ user: { id: 'u1' } }),
}));
jest.mock('@/features/booking', () => ({ dayLabel: () => '', useBookings: () => ({ data: [] }) }));
jest.mock('@/features/looks', () => ({
  PhotoUploadError: class extends Error {},
  styleForService: () => undefined,
  usePostLook: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useStyleTaxonomy: () => ({ data: [] }),
}));
jest.mock('@/features/shelf', () => ({ useShelf: () => ({ data: [] }) }));
jest.mock('@/features/profile', () => ({
  TEXTURE_LABELS: { straight: 'Straight hair' },
  useNeedsUsername: () => false,
  useUser: () => ({ data: undefined }),
  useUserStore: (selector: any) => selector({ hairProfile: undefined }),
}));
jest.mock('@/features/stylist', () => ({
  formatPrice: () => '',
  useActiveMode: () => 'client',
  useMenu: () => ({ data: [] }),
  useMyCurrency: () => 'GBP',
  usePortfolio: () => ({ data: [] }),
}));

const mockedUseFeature = useFeature as jest.Mock;

beforeEach(() => {
  mockedUseFeature.mockReset();
  mockPickManyFromLibrary.mockReset();
});

describe('composing a look, with multi_photo_looks switched', () => {
  it('off: one photo, and picking more only replaces it', async () => {
    mockedUseFeature.mockReturnValue(false);
    mockPickManyFromLibrary.mockResolvedValue(['a.jpg']);
    const { unmount } = render(<ComposeLookScreen />);

    expect(screen.getByText('Choose a photo')).toBeTruthy();
    fireEvent.press(screen.getByTestId('look-pick'));
    await waitFor(() => expect(screen.getByText('Choose a different photo')).toBeTruthy());
    expect(screen.queryByText(/\/5$/)).toBeNull();
    unmount();
  });

  it('on: up to 5 photos, shown as a strip with a running count', async () => {
    mockedUseFeature.mockReturnValue(true);
    mockPickManyFromLibrary.mockResolvedValue(['a.jpg', 'b.jpg', 'c.jpg']);
    const { unmount } = render(<ComposeLookScreen />);

    expect(screen.getByText('Choose photos')).toBeTruthy();
    fireEvent.press(screen.getByTestId('look-pick'));
    await waitFor(() => expect(screen.getByText('3/5')).toBeTruthy());
    expect(screen.getByText('Add more photos')).toBeTruthy();
    unmount();
  });
});
