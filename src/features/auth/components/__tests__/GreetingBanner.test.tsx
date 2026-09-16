import React from 'react';
import { renderWithTheme, waitFor } from '@/test-utils';
import { GreetingBanner } from '../GreetingBanner';
// AsyncStorage is mocked globally in jest.setup.js — a local mock that returns
// undefined instead of a promise leaves ThemeProvider stuck before first render.

// Reanimated is set up globally in jest.setup.js via its own setUpTests(). A
// hand-written mock here only breaks when the component uses something it lacks.

// No useTheme mock: styled components read the theme from context, so the tests
// render inside the real provider via renderWithTheme.

jest.mock('@/shared/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

// The banner greets the signed-in user, so it needs an auth context.
jest.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Ama' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

jest.mock('@/shared/utils/greetings', () => ({
  getNextGreeting: jest.fn(() => Promise.resolve('Hey, glow-getter ✨')),
  getTimeOfDayPrefix: jest.fn(() => 'Good morning, '),
}));

describe('GreetingBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders greeting text', async () => {
    const { getByText } = await renderWithTheme(<GreetingBanner topInset={0} />);
    await waitFor(() => {
      expect(getByText(/Good morning,|Hey, glow-getter/)).toBeTruthy();
    });
  });

  it('greets a signed-in user by first name', async () => {
    const { getByText } = await renderWithTheme(<GreetingBanner topInset={0} firstName="Ama" />);
    await waitFor(() => {
      expect(getByText('Hey Ama')).toBeTruthy();
    });
  });

  it('falls back to a generic greeting without a name', async () => {
    const { getByText } = await renderWithTheme(<GreetingBanner topInset={0} />);
    await waitFor(() => {
      expect(getByText('Hey there')).toBeTruthy();
    });
  });
});
