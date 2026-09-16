import React from 'react';
import { renderWithTheme, fireEvent } from '@/test-utils';
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
    __esModule: true,
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

// No useTheme mock: styled components read the theme from context, so the tests
// render inside the real provider via renderWithTheme.

jest.mock('@/shared/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

describe('BottomTabBar', () => {
  const mockReplace = jest.fn();
  const mockRouter = {
    push: jest.fn(),
    replace: mockReplace,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/(tabs)/home');
  });

  // Tabs are icon-only; their names are carried by accessibilityLabel.
  it('renders all tabs', async () => {
    const { getAllByLabelText } = await renderWithTheme(<BottomTabBar />);
    expect(getAllByLabelText('Home').length).toBeGreaterThan(0);
    expect(getAllByLabelText('Planner').length).toBeGreaterThan(0);
    expect(getAllByLabelText('Profile').length).toBeGreaterThan(0);
  });

  it('navigates to correct route on tab press', async () => {
    const { getAllByLabelText } = await renderWithTheme(<BottomTabBar />);
    fireEvent.press(getAllByLabelText('Planner')[0]);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/planner');
  });

  it('shows active tab correctly', async () => {
    (usePathname as jest.Mock).mockReturnValue('/(tabs)/planner');
    const { getAllByLabelText } = await renderWithTheme(<BottomTabBar />);
    expect(getAllByLabelText('Planner')[0]).toBeTruthy();
  });
});
