import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base width for design (iPhone 14 Pro)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Scale factor based on screen width
const scale = SCREEN_WIDTH / BASE_WIDTH;
const verticalScale = SCREEN_HEIGHT / BASE_HEIGHT;

// Moderate scale for better control
const moderateScale = (size: number, factor: number = 0.5) => {
  return size + (scale - 1) * size * factor;
};

export const responsive = {
  // Scale based on width
  scale: (size: number) => {
    return PixelRatio.roundToNearestPixel(size * scale);
  },
  
  // Scale based on height
  verticalScale: (size: number) => {
    return PixelRatio.roundToNearestPixel(size * verticalScale);
  },
  
  // Moderate scale (less aggressive)
  moderateScale: (size: number, factor?: number) => {
    return PixelRatio.roundToNearestPixel(moderateScale(size, factor));
  },
  
  // Font scaling
  fontScale: (size: number) => {
    return PixelRatio.roundToNearestPixel(size * scale);
  },
  
  // Get screen dimensions
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  
  // Check if device is small
  isSmallDevice: SCREEN_WIDTH < 375,
  
  // Check if device is tablet
  isTablet: SCREEN_WIDTH >= 768,
};






