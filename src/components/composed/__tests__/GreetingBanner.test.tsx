import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { GreetingBanner } from '../GreetingBanner';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    default: {
      View,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (fn: () => any) => fn(),
    withSpring: (value: number) => value,
    withTiming: (value: number) => value,
  };
});

// Mock hooks
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#8DA399',
        text: { high: '#333333' },
      },
      spacing: { 1: 4, 2: 8, 4: 16 },
    },
  }),
}));

jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

jest.mock('@/utils/greetings', () => ({
  getNextGreeting: jest.fn(() => Promise.resolve('Hey, glow-getter ✨')),
  getTimeOfDayPrefix: jest.fn(() => 'Good morning, '),
}));

describe('GreetingBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders greeting text', async () => {
    const { getByText } = render(<GreetingBanner />);
    await waitFor(() => {
      expect(getByText(/Good morning,|Hey, glow-getter/)).toBeTruthy();
    });
  });

  it('includes time prefix when enabled', async () => {
    const { getByText } = render(<GreetingBanner includeTimePrefix={true} />);
    await waitFor(() => {
      expect(getByText(/Good morning,/)).toBeTruthy();
    });
  });

  it('excludes time prefix when disabled', async () => {
    const { queryByText } = render(<GreetingBanner includeTimePrefix={false} />);
    await waitFor(() => {
      expect(queryByText(/Good morning,/)).toBeNull();
    });
  });
});

