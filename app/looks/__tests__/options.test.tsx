import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import LookOptionsScreen from '../options';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams }));
const mockBack = jest.fn();
jest.mock('@/shared/lib/navigation', () => ({
  useRouter: () => ({ back: mockBack, dismiss: jest.fn() }),
}));
jest.mock('@/shared/ui/Screen', () => ({ Screen: ({ children }: any) => children }));
jest.mock('@/shared/ui/dialog', () => ({ confirm: jest.fn(), notify: jest.fn() }));
jest.mock('@/shared/lib/haptics', () => ({ haptics: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/features/auth', () => ({ errorMessage: () => '' }));
const mockNotForMe = jest.fn().mockResolvedValue(undefined);
const mockIdle = { mutateAsync: jest.fn(), isPending: false };
jest.mock('@/features/looks', () => ({
  REPORT_REASONS: [],
  useBlockAuthor: () => mockIdle,
  useLook: () => ({ data: undefined }),
  useNotForMe: () => ({ mutateAsync: mockNotForMe, isPending: false }),
  useRemoveComment: () => mockIdle,
  useRemoveLook: () => mockIdle,
  useReport: () => mockIdle,
  useSetLookVisibility: () => mockIdle,
}));

beforeEach(() => {
  mockNotForMe.mockClear();
  mockBack.mockClear();
});

describe('not for me', () => {
  it('on a look, hides that look', async () => {
    mockParams = { kind: 'look', id: 'look-1', name: 'Ama', authorId: 'acc-ama', mine: '0' };
    render(<LookOptionsScreen />);
    expect(screen.getByText('You’ll see fewer looks like this')).toBeTruthy();
    fireEvent.press(screen.getByTestId('look-not-for-me'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(mockNotForMe).toHaveBeenCalledWith({ lookId: 'look-1' });
  });

  it('on a stylist’s page, hides her looks', async () => {
    mockParams = { kind: 'profile', id: 'page-1', name: 'Ama', authorId: 'acc-ama', mine: '0' };
    render(<LookOptionsScreen />);
    fireEvent.press(screen.getByTestId('look-not-for-me'));
    await waitFor(() => expect(mockNotForMe).toHaveBeenCalledWith({ stylistId: 'acc-ama' }));
  });

  it('isn’t offered on a comment', () => {
    mockParams = { kind: 'comment', id: 'c-1', name: 'Ama', authorId: 'acc-ama', mine: '0' };
    render(<LookOptionsScreen />);
    expect(screen.queryByTestId('look-not-for-me')).toBeNull();
  });
});
