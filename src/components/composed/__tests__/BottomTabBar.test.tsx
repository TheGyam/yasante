import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BottomTabBar } from '../BottomTabBar';
import { useRouter, usePathname } from 'expo-router';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    default: {
      View,
      createAnimatedComponent: (component: any) => component,
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
        text: { low: '#777777', medium: '#555555', high: '#333333' },
        surface: '#FAF9F6',
      },
      spacing: { 1: 4, 2: 8, 3: 12 },
    },
  }),
}));

jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

describe('BottomTabBar', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/(tabs)/home');
  });

  it('renders all tabs', () => {
    const { getByText } = render(<BottomTabBar />);
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Planner')).toBeTruthy();
    expect(getByText('Learn')).toBeTruthy();
    expect(getByText('Profile')).toBeTruthy();
  });

  it('navigates to correct route on tab press', () => {
    const { getByText } = render(<BottomTabBar />);
    const plannerTab = getByText('Planner');
    fireEvent.press(plannerTab);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/planner');
  });

  it('shows active tab correctly', () => {
    (usePathname as jest.Mock).mockReturnValue('/(tabs)/planner');
    const { getByText } = render(<BottomTabBar />);
    const plannerTab = getByText('Planner');
    expect(plannerTab).toBeTruthy();
  });
});

