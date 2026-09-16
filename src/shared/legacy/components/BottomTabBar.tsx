import React, { useEffect } from 'react';
import { TouchableOpacity, View, Platform, Keyboard } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
// Conditionally import Reanimated 4
const Animated = (() => {
  try {
    return require('react-native-reanimated').default;
  } catch {
    return require('react-native').Animated;
  }
})();

const useSharedValue = (() => {
  try {
    return require('react-native-reanimated').useSharedValue;
  } catch {
    return (value: number) => ({ value });
  }
})();

const useAnimatedStyle = (() => {
  try {
    return require('react-native-reanimated').useAnimatedStyle;
  } catch {
    return (fn: () => any) => fn();
  }
})();

const withSpring = (() => {
  try {
    return require('react-native-reanimated').withSpring;
  } catch {
    return (value: number) => value;
  }
})();

const withTiming = (() => {
  try {
    return require('react-native-reanimated').withTiming;
  } catch {
    return (value: number, _config?: any) => value;
  }
})();

import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { useReducedMotion } from '@/shared/legacy/hooks/useReducedMotion';
import { TabIcon, type TabIconName } from '@/shared/icons/TabIcon';
import { ANIMATION_PRESETS, getAnimationConfig, getSpringConfig } from '@/shared/utils/animations';
import type { Theme } from '@/shared/legacy/theme/ThemeProvider';

// Floating container - positioned absolutely at bottom
const FloatingContainer = styled(Animated.View)`
  position: absolute;
  bottom: 16px;
  left: 24px;
  right: 24px;
  min-height: 56px;
  border-radius: 28px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  padding-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  shadow-color: #8da399;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.16;
  shadow-radius: 18px;
  elevation: 8;
  z-index: 1000;
`;

// Styled container for the button - background goes here
// Note: No border-radius here to prevent Android clipping of overflow children
const TabButtonContainer = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  overflow: visible;
  position: relative;
`;

// Active background - separate component for clarity
// Has border-radius to create rounded background effect - now animated
const ActiveBackground = styled(Animated.View)`
  position: absolute;
  top: 4px;
  left: 4px;
  right: 4px;
  bottom: 4px;
  border-radius: 20px;
  background-color: rgba(141, 163, 153, 0.8);
`;

// Active indicator underline below the icon - now animated
const ActiveIndicator = styled(Animated.View)`
  width: 24px;
  height: 4px;
  border-radius: 2px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.primary};
`;

// Touchable wrapper
const TabButtonTouchable = styled(TouchableOpacity)`
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding-vertical: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  background-color: transparent;
`;

const IconContainer = styled(Animated.View)`
  position: relative;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding-bottom: 6px;
`;

// Indicator wrapper - positioned at bottom of icon container to avoid Android clipping
const IndicatorWrapper = styled.View`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  align-items: center;
`;

interface Tab {
  name: TabIconName;
  route: string;
  label: string;
}

const tabs: Tab[] = [
  { name: 'home', route: '/(tabs)/home', label: 'Home' },
  { name: 'planner', route: '/(tabs)/planner', label: 'Planner' },
  { name: 'profile', route: '/(tabs)/profile', label: 'Profile' },
];

// Helper to normalize path by removing route groups like (tabs)
const normalizePath = (path: string): string => {
  // Remove route groups like (tabs) and normalize slashes
  return path.replace(/\/\([^)]+\)/g, '').replace(/^\/+|\/+$/g, '');
};

// Helper to check if pathname belongs to a tab route
const isTabRoute = (pathname: string, tabRoute: string): boolean => {
  if (!pathname) return false;

  // Normalize both paths
  const normalizedPathname = normalizePath(pathname);
  const normalizedTabRoute = normalizePath(tabRoute);

  // Check if pathname starts with the tab route
  // This handles cases like /education matching /education/[id]
  return (
    normalizedPathname === normalizedTabRoute ||
    normalizedPathname.startsWith(normalizedTabRoute + '/')
  );
};

export function BottomTabBar() {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  // Find active index - check if pathname starts with tab route to handle nested routes
  const activeIndex = React.useMemo(() => {
    if (!pathname) return 0;
    const idx = tabs.findIndex(tab => isTabRoute(pathname, tab.route));
    return idx === -1 ? 0 : idx;
  }, [pathname]);

  // Animated values - must be called at top level (Rules of Hooks)
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  // Icon scale animations for each tab - must be called at top level
  const iconScale0 = useSharedValue(1.0);
  const iconScale1 = useSharedValue(1.0);
  const iconScale2 = useSharedValue(1.0);
  // Memoize array to prevent unnecessary re-renders (shared values are stable)
  const iconScales = React.useMemo(
    () => [iconScale0, iconScale1, iconScale2],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Indicator animation - single shared value for active indicator
  const indicatorScale = useSharedValue(1);
  const indicatorOpacity = useSharedValue(1);

  // Background animation - single shared value for active background pill
  const backgroundScale = useSharedValue(1);
  const backgroundOpacity = useSharedValue(1);

  // Keyboard visibility handling
  useEffect(() => {
    const exitConfig = getAnimationConfig(ANIMATION_PRESETS.fadeOut, reduceMotion);
    const enterConfig = getAnimationConfig(ANIMATION_PRESETS.fadeIn, reduceMotion);

    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      if (!reduceMotion) {
        opacity.value = withTiming(0, exitConfig);
        scale.value = withTiming(0.9, exitConfig);
      } else {
        opacity.value = 0;
        scale.value = 0.9;
      }
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      if (!reduceMotion) {
        opacity.value = withTiming(1, enterConfig);
        scale.value = withTiming(1, enterConfig);
      } else {
        opacity.value = 1;
        scale.value = 1;
      }
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [reduceMotion]);

  const handleTabPress = React.useCallback(
    (tab: Tab) => {
      router.replace(tab.route as any);
    },
    [router]
  );

  // Animated styles
  const containerStyle = useAnimatedStyle
    ? useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
        marginBottom: insets.bottom,
      }))
    : {
        marginBottom: insets.bottom,
      };

  // Icon scale animation effect
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    const springConfig = getSpringConfig(ANIMATION_PRESETS.springIn, reduceMotion);

    tabs.forEach((_, index) => {
      const isActive = index === activeIndex;
      if (isActive && !reduceMotion) {
        iconScales[index].value = withSpring(1.12, springConfig);
        const timer = setTimeout(() => {
          iconScales[index].value = withSpring(1.0, springConfig);
        }, 150);
        timers.push(timer);
      } else {
        iconScales[index].value = withSpring(1.0, springConfig);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
    // iconScales is stable (memoized with empty deps), so we don't need it in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, reduceMotion]);

  // Indicator and background animation effect - soft grow animation when appearing
  useEffect(() => {
    if (!reduceMotion) {
      const iconConfig = getAnimationConfig(ANIMATION_PRESETS.icon, reduceMotion);
      const scaleConfig = getAnimationConfig(ANIMATION_PRESETS.scaleIn, reduceMotion);

      // Soft grow-in animation for active indicator
      indicatorScale.value = 0.75;
      indicatorOpacity.value = 0.6;
      indicatorScale.value = withTiming(1, iconConfig);
      indicatorOpacity.value = withTiming(1, iconConfig);

      // Soft grow-in animation for active background pill
      backgroundScale.value = 0.85;
      backgroundOpacity.value = 0.6;
      backgroundScale.value = withTiming(1, scaleConfig);
      backgroundOpacity.value = withTiming(1, iconConfig);
    } else {
      indicatorScale.value = 1;
      indicatorOpacity.value = 1;
      backgroundScale.value = 1;
      backgroundOpacity.value = 1;
    }
  }, [activeIndex, reduceMotion]);

  const getIconScaleStyle = (index: number) => {
    if (!useAnimatedStyle) return {};
    return useAnimatedStyle(() => ({
      transform: [{ scale: iconScales[index].value }],
    }));
  };

  // Animated style for indicator - soft grow with scaleX
  const indicatorAnimatedStyle = useAnimatedStyle
    ? useAnimatedStyle(() => ({
        transform: [{ scaleX: indicatorScale.value }],
        opacity: indicatorOpacity.value,
      }))
    : {};

  // Animated style for background pill - soft grow with scale
  const backgroundAnimatedStyle = useAnimatedStyle
    ? useAnimatedStyle(() => ({
        transform: [{ scale: backgroundScale.value }],
        opacity: backgroundOpacity.value,
      }))
    : {};

  // Hide tab bar on modal/fullscreen screens (DIY story view)
  // Check if we're on a DIY story screen (modal) - must be after all hooks
  const isModalScreen = pathname?.includes('diy/');

  // Always return the same structure to avoid hooks issues
  // Hide by moving off-screen and removing dimensions
  return (
    <FloatingContainer
      style={[
        containerStyle,
        isModalScreen && {
          opacity: 0,
          pointerEvents: 'none',
          height: 0,
          width: 0,
          bottom: -1000,
          left: -1000,
          right: -1000,
          overflow: 'hidden',
        },
      ]}
    >
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        const animatedIconStyle = getIconScaleStyle(index);

        return (
          <TabButtonContainer key={tab.name}>
            {isActive && <ActiveBackground style={backgroundAnimatedStyle} />}
            <TabButtonTouchable
              onPress={() => handleTabPress(tab)}
              testID={`tab-${tab.name}`}
              accessible={true}
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              activeOpacity={0.8}
            >
              <IconContainer style={animatedIconStyle}>
                <TabIcon
                  name={tab.name}
                  active={isActive}
                  size={24}
                  accessibilityLabel={tab.label}
                />
                {isActive && (
                  <IndicatorWrapper>
                    <ActiveIndicator style={indicatorAnimatedStyle} />
                  </IndicatorWrapper>
                )}
              </IconContainer>
            </TabButtonTouchable>
          </TabButtonContainer>
        );
      })}
    </FloatingContainer>
  );
}
