import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { useConsentStore } from '@/shared/config/consentStore';
import { useAskForAnalytics } from '@/shared/config/consentSync';
import { ConsentQuestion } from '@/shared/ui/ConsentQuestion';
import { HairProfileHub } from '../quiz/HairProfileHub';
import { HairQuiz } from '../quiz/HairQuiz';
import { useUserStore } from '../store';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('@/shared/lib/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
}));
jest.mock('@/shared/ui/Screen', () => ({ Screen: ({ children }: any) => children }));
jest.mock('@/shared/ui/dialog', () => ({ notify: jest.fn() }));
jest.mock('@/shared/lib/api/client', () => ({ apiClient: { post: jest.fn(), get: jest.fn() } }));
let mockSignedIn = false;
jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: mockSignedIn ? { id: 'u1' } : null, isAuthenticated: mockSignedIn }),
}));
jest.mock('../hairLog', () => ({
  sinceLast: () => undefined,
  useHairLog: () => ({ data: [] }),
  useLogHair: () => ({ mutate: jest.fn() }),
  useUnlogHair: () => ({ mutate: jest.fn() }),
}));
jest.mock('../hooks', () => ({
  useUser: () => ({ data: undefined }),
  useUpdateHairProfile: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const answered = (purpose: 'personalisation' | 'research' | 'analytics') =>
  useConsentStore.getState().consents[purpose]?.granted;

beforeEach(() => {
  mockSignedIn = false;
  mockPush.mockReset();
  mockBack.mockReset();
  useConsentStore.setState({ consents: {}, loaded: false });
  useUserStore.getState().setOnboardingCompleted(false);
});

describe('a consent question', () => {
  it('gives Allow and Not now the same look and size', () => {
    render(<ConsentQuestion purpose="research" />);
    const look = (name: string) => [
      StyleSheet.flatten(screen.getByRole('button', { name }).props.style),
      StyleSheet.flatten(screen.getByText(name).props.style),
    ];
    expect(look('Allow')).toEqual(look('Not now'));
  });

  it('records the answer with the policy version', () => {
    const onAnswered = jest.fn();
    render(<ConsentQuestion purpose="research" onAnswered={onAnswered} />);
    fireEvent.press(screen.getByText('Not now'));
    expect(useConsentStore.getState().consents.research).toMatchObject({
      granted: false,
      policyVersion: expect.any(String),
      syncedAt: null,
    });
    expect(onAnswered).toHaveBeenCalledWith(false);
  });
});

describe('the hair profile', () => {
  it('asks to use hair details before the first question, and only once', () => {
    const { unmount } = render(<HairQuiz mode="onboarding" />);
    expect(screen.getByText('Use your hair details')).toBeTruthy();
    expect(screen.queryByText('Which strand looks like yours?')).toBeNull();
    fireEvent.press(screen.getByText('Allow'));
    expect(answered('personalisation')).toBe(true);
    expect(screen.getByText('Which strand looks like yours?')).toBeTruthy();
    unmount();

    render(<HairQuiz mode="onboarding" />);
    expect(screen.queryByText('Use your hair details')).toBeNull();
  });

  it('lets her into the app when she says not now', () => {
    render(<HairQuiz mode="onboarding" />);
    fireEvent.press(screen.getByText('Not now'));
    expect(answered('personalisation')).toBe(false);
    expect(useUserStore.getState().onboardingCompleted).toBe(true);
  });

  it('closes a section opened from a link when she says not now', () => {
    render(<HairQuiz mode="section" section="scalp" />);
    fireEvent.press(screen.getByText('Not now'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('waits for the account’s answers before asking someone signed in', async () => {
    mockSignedIn = true;
    render(<HairQuiz mode="section" section="scalp" />);
    expect(screen.queryByText('Use your hair details')).toBeNull();
    // A store change reaches the screen only through an async act in this renderer.
    await act(async () => useConsentStore.getState().setLoaded(true));
    expect(screen.getByText('Use your hair details')).toBeTruthy();
  });

  it('asks again when she opens a part of it after saying no', () => {
    useConsentStore.getState().setConsent('personalisation', false);
    render(<HairQuiz mode="section" section="texture" />);
    expect(screen.getByText('Use your hair details')).toBeTruthy();
  });

  it('stays hers to see when she says no, with a way to turn it back on', () => {
    useUserStore.getState().setHairProfile({ texture: 'curly' });
    useConsentStore.getState().setConsent('personalisation', false);
    useConsentStore.getState().setConsent('research', false);
    render(<HairProfileHub />);
    expect(screen.getByText('Your hair details aren’t being used')).toBeTruthy();
    expect(screen.getByTestId('section-texture')).toBeTruthy();
    fireEvent.press(screen.getByTestId('hair-details-on'));
    expect(answered('personalisation')).toBe(true);
  });
});

describe('the research question', () => {
  it('is asked once of someone whose hair profile is finished', () => {
    useUserStore
      .getState()
      .setHairProfile({ texture: 'curly', completedAt: '2026-10-01T10:00:00Z' });
    useConsentStore.getState().setConsent('personalisation', true);
    const { unmount } = render(<HairProfileHub />);
    expect(screen.getByText('Help research on hair')).toBeTruthy();
    fireEvent.press(screen.getByText('Not now'));
    expect(answered('research')).toBe(false);
    expect(screen.getByTestId('section-texture')).toBeTruthy();
    unmount();

    render(<HairProfileHub />);
    expect(screen.queryByText('Help research on hair')).toBeNull();
  });
});

describe('the analytics question', () => {
  // It opens a moment after the sign-up screens close.
  const wait = () => act(() => new Promise(resolve => setTimeout(resolve, 700)));

  it('opens once, after sign-up, while it has no answer', async () => {
    // Terms and privacy already agreed to, as at sign-up.
    useConsentStore.getState().setConsent('terms', true);
    useConsentStore.getState().setConsent('privacy', true);
    const { rerender } = renderHook(({ canAsk }) => useAskForAnalytics(canAsk), {
      initialProps: { canAsk: false },
    });
    await act(async () => useConsentStore.getState().setLoaded(true));
    await wait();
    expect(mockPush).not.toHaveBeenCalled();

    rerender({ canAsk: true });
    await wait();
    expect(mockPush).toHaveBeenCalledWith('/settings/privacy-choices');

    rerender({ canAsk: false });
    rerender({ canAsk: true });
    await wait();
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('waits while there’s a policy change to tell her about', async () => {
    await act(async () => useConsentStore.getState().setLoaded(true));
    renderHook(() => useAskForAnalytics(true));
    await wait();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('isn’t asked of someone who already answered, on any device', async () => {
    useConsentStore.getState().setConsent('analytics', false);
    await act(async () => useConsentStore.getState().setLoaded(true));
    renderHook(() => useAskForAnalytics(true));
    await wait();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
