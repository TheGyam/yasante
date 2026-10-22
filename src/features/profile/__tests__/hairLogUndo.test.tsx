import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useConsentStore } from '@/shared/config/consentStore';
import { confirm } from '@/shared/ui/dialog';
import { HairProfileHub } from '../quiz/HairProfileHub';

const mockUnlog = jest.fn();
const mockLog = jest.fn();
jest.mock('@/shared/lib/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/shared/ui/Screen', () => ({ Screen: ({ children }: any) => children }));
jest.mock('@/shared/ui/dialog', () => ({ notify: jest.fn(), confirm: jest.fn() }));
jest.mock('@/shared/lib/api/client', () => ({ apiClient: { post: jest.fn(), get: jest.fn() } }));
jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, isAuthenticated: true }),
}));
jest.mock('../hairLog', () => ({
  sinceLast: (entries: { kind: string }[], kind: string) =>
    entries.some(e => e.kind === kind) ? 'Today' : undefined,
  useHairLog: () => ({ data: [{ id: 'trim-1', kind: 'trim', at: new Date().toISOString() }] }),
  useLogHair: () => ({ mutate: mockLog }),
  useUnlogHair: () => ({ mutate: mockUnlog }),
}));
jest.mock('../hooks', () => ({
  useUser: () => ({ data: undefined }),
  useUpdateHairProfile: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

beforeEach(() => {
  mockUnlog.mockReset();
  mockLog.mockReset();
  (confirm as jest.Mock).mockReset();
  useConsentStore.setState({
    consents: {
      personalisation: { granted: true, policyVersion: 'v', updatedAt: '', syncedAt: '' },
      research: { granted: false, policyVersion: 'v', updatedAt: '', syncedAt: '' },
    },
    loaded: true,
  });
});

describe('a trim or wash day noted by mistake', () => {
  it('can be taken back after saying so, and not logged twice', async () => {
    (confirm as jest.Mock).mockResolvedValue(true);
    render(<HairProfileHub />);
    expect(screen.getByText('Noted today. Tap to take it back')).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('log-trim')));
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Take back today’s trim?' })
    );
    expect(mockUnlog).toHaveBeenCalledWith('trim-1', expect.anything());
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('stays when she keeps it', async () => {
    (confirm as jest.Mock).mockResolvedValue(false);
    render(<HairProfileHub />);
    await act(async () => fireEvent.press(screen.getByTestId('log-trim')));
    expect(mockUnlog).not.toHaveBeenCalled();
  });
});
