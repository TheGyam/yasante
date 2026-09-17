import { useEffect, useRef } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { LucideIcon } from 'lucide-react-native';
import {
  EASE_OUT,
  GUTTER,
  fonts,
  makeStyles,
  radius,
  spring,
  timing,
  useTheme,
} from '@/shared/theme';
import { haptics } from '@/shared/lib/haptics';
import { Glass } from './Glass';
import { TAB_BAR_HEIGHT, tabBarBottom } from './layout';
import { Text } from './Text';

export interface TabItem {
  /** Route name inside the tabs group. */
  name: string;
  label: string;
  icon: LucideIcon;
}

const MAX_WIDTH = 440;
const PAD = 6;

const useStyles = makeStyles(t => ({
  wrap: { position: 'absolute', alignSelf: 'center' },
  bar: { height: TAB_BAR_HEIGHT, flexDirection: 'row', padding: PAD },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: radius.xl - PAD,
    backgroundColor: t.colors.accentSoft,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.1 },
}));

interface TabButtonProps {
  item: TabItem;
  routeKey: string;
  focused: boolean;
  onTabPress: (name: string, key: string, focused: boolean) => void;
}

function TabButton({ item, routeKey, focused, onTabPress }: TabButtonProps) {
  const styles = useStyles();
  const theme = useTheme();
  const Icon = item.icon;
  const color = focused ? theme.colors.accent : theme.colors.text.secondary;

  const pop = useSharedValue(1);
  const mounted = useRef(false);
  useEffect(() => {
    // A small lift when a tab becomes active — not on launch, where nobody asked for it.
    if (mounted.current && focused) {
      pop.set(
        withSequence(
          withTiming(1.12, { duration: 110, easing: EASE_OUT }),
          withSpring(1, spring.settle)
        )
      );
    }
    mounted.current = true;
  }, [focused, pop]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  return (
    <Pressable
      style={styles.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={item.label}
      hitSlop={4}
      onPress={() => onTabPress(item.name, routeKey, focused)}
    >
      <Animated.View style={iconStyle}>
        <Icon size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
      </Animated.View>
      <Text style={[styles.label, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {item.label}
      </Text>
    </Pressable>
  );
}

/**
 * Floating glass tab bar. The active pill glides between tabs on a spring; the bar
 * slides away when a tab pushes deeper into its stack or the keyboard opens. Only
 * the two buttons whose `focused` flips re-render on a tab change — the motion itself
 * never touches React.
 */
export function TabBar({
  state,
  navigation,
  items,
  enterAfter,
}: BottomTabBarProps & {
  items: readonly TabItem[];
  /** Rise into place this many ms after mounting, instead of simply being there. */
  enterAfter?: number;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const barWidth = Math.min(screenWidth - GUTTER * 2, MAX_WIDTH);
  const itemWidth = (barWidth - PAD * 2) / items.length;
  const bottom = tabBarBottom(insets.bottom);

  const focusedRoute = state.routes[state.index];
  const activeIndex = items.findIndex(i => i.name === focusedRoute.name);
  // Root screens of listed tabs show the bar. Anything pushed deeper — or a tab route
  // that isn't in the bar, like the education library — gets the full screen.
  const hidden = activeIndex < 0 || (focusedRoute.state?.index ?? 0) > 0;

  const x = useSharedValue(Math.max(0, activeIndex) * itemWidth);
  useEffect(() => {
    if (activeIndex >= 0) x.set(withSpring(activeIndex * itemWidth, spring.snap));
  }, [activeIndex, itemWidth, x]);

  const hide = useSharedValue(hidden || enterAfter !== undefined ? 1 : 0);
  const entered = useRef(enterAfter === undefined);
  useEffect(() => {
    if (!entered.current && !hidden) {
      entered.current = true;
      hide.set(withDelay(enterAfter ?? 0, withSpring(0, spring.snap)));
      return;
    }
    hide.set(withTiming(hidden ? 1 : 0, timing.enter));
  }, [hidden, hide, enterAfter]);

  const { progress: keyboard } = useReanimatedKeyboardAnimation();
  const away = useDerivedValue(() => Math.max(hide.get(), keyboard.get()));
  const offscreen = TAB_BAR_HEIGHT + bottom + 16;

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: away.get() * offscreen }],
    opacity: 1 - away.get() * 0.4,
  }));
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
    opacity: activeIndex >= 0 ? 1 : 0,
  }));

  const onTabPress = (name: string, key: string, focused: boolean) => {
    const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    // Re-pressing the active tab is left to the navigator: it pops to root and scrolls to top.
    if (!focused && !event.defaultPrevented) {
      haptics.selection();
      navigation.navigate(name);
    }
  };

  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'box-none'}
      style={[styles.wrap, { bottom, width: barWidth }, wrapStyle]}
    >
      <Glass variant="chrome" radius={radius.xl} style={styles.bar} accessibilityRole="tablist">
        <Animated.View style={[styles.indicator, { width: itemWidth }, indicatorStyle]} />
        {items.map(item => {
          const route = state.routes.find(r => r.name === item.name);
          if (!route) return <View key={item.name} style={styles.item} />;
          return (
            <TabButton
              key={route.key}
              item={item}
              routeKey={route.key}
              focused={route.key === focusedRoute.key}
              onTabPress={onTabPress}
            />
          );
        })}
      </Glass>
    </Animated.View>
  );
}
