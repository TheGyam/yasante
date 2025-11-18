import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  scale,
  verticalScale,
  moderateScale,
  isSmallPhone,
  isPhone,
  isLargePhone,
  isTablet,
} from '@/utils/responsive';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return useMemo(
    () => ({
      width,
      height,
      scale,
      verticalScale,
      moderateScale,
      isSmallPhone: isSmallPhone(),
      isPhone: isPhone(),
      isLargePhone: isLargePhone(),
      isTablet: isTablet(),
    }),
    [width, height]
  );
}

