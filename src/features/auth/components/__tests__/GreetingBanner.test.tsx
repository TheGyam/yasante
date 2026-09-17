import React from 'react';
import { renderWithTheme, waitFor } from '@/test-utils';
import { GreetingBanner } from '../GreetingBanner';

jest.mock('../../AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', name: 'Ama' }, isAuthenticated: true, isLoading: false }),
}));

jest.mock('@/shared/utils/greetings', () => ({
  getNextGreeting: jest.fn(() => Promise.resolve('Hey, glow-getter ✨')),
  getTimeOfDayPrefix: jest.fn(() => 'Good morning, '),
}));

describe('GreetingBanner', () => {
  it('shows the time of day and the rotating line', async () => {
    const { getByText } = renderWithTheme(<GreetingBanner />);
    expect(getByText('Good morning')).toBeTruthy();
    await waitFor(() => expect(getByText('Hey, glow-getter ✨')).toBeTruthy());
  });

  it('greets a signed-in user by first name', async () => {
    const { getByText } = renderWithTheme(<GreetingBanner firstName="Ama" />);
    await waitFor(() => expect(getByText('Hey Ama')).toBeTruthy());
  });

  it('falls back to a generic greeting without a name', async () => {
    const { getByText } = renderWithTheme(<GreetingBanner />);
    await waitFor(() => expect(getByText('Hey there')).toBeTruthy());
  });
});
