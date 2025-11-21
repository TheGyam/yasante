import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const sizes = {
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    '3xl': 24,
    full: 9999,
  },
  icon: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
    '2xl': 48,
  },
  button: {
    sm: {
      height: 36,
      paddingHorizontal: 16,
    },
    md: {
      height: 44,
      paddingHorizontal: 20,
    },
    lg: {
      height: 52,
      paddingHorizontal: 24,
    },
  },
  input: {
    sm: {
      height: 40,
      paddingHorizontal: 12,
    },
    md: {
      height: 48,
      paddingHorizontal: 16,
    },
    lg: {
      height: 56,
      paddingHorizontal: 20,
    },
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  tabBar: {
    height: 70,
    iconSize: 24,
  },
};

export type Sizes = typeof sizes;











