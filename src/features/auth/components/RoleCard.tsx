import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { EASE_OUT, makeStyles, radius, space, spring, useTheme } from '@/shared/theme';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Text } from '@/shared/ui/Text';

export interface RoleCardProps {
  icon: LucideIcon;
  title: string;
  body: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

const useStyles = makeStyles(t => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.xl,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    backgroundColor: t.colors.glass.fill,
  },
  well: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
  },
  text: { flex: 1, gap: space.xs },
}));

/** A big answer to "how will you use Yasante?". Picking one lights it and nudges onward. */
export function RoleCard({ icon: Icon, title, body, selected, onPress, testID }: RoleCardProps) {
  const styles = useStyles();
  const theme = useTheme();
  const reduced = useReducedMotion();
  const lit = useSharedValue(selected ? 1 : 0);
  const bump = useSharedValue(1);
  const nudge = useSharedValue(0);

  useEffect(() => {
    lit.set(withTiming(selected ? 1 : 0, { duration: 200, easing: EASE_OUT }));
    if (!selected || reduced) return;
    // The icon hops and the arrow leans forward — "this one, onward".
    bump.set(
      withSequence(
        withTiming(1.14, { duration: 120, easing: EASE_OUT }),
        withSpring(1, spring.snap)
      )
    );
    nudge.set(
      withSequence(withTiming(6, { duration: 140, easing: EASE_OUT }), withSpring(0, spring.settle))
    );
  }, [selected, reduced, lit, bump, nudge]);

  const border = theme.colors.glass.border;
  const cardStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(lit.get(), [0, 1], [border, theme.colors.accent]),
  }));
  const wellStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.get() }] }));
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.get() }] }));

  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.97}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${body}`}
      testID={testID}
    >
      <Animated.View style={[styles.card, cardStyle]}>
        <Animated.View style={[styles.well, wellStyle]}>
          <Icon size={26} color={theme.colors.accent} strokeWidth={2} />
        </Animated.View>
        <View style={styles.text}>
          <Text variant="title3">{title}</Text>
          <Text variant="subhead" tone="secondary">
            {body}
          </Text>
        </View>
        <Animated.View style={arrowStyle}>
          <ChevronRight size={20} color={theme.colors.text.tertiary} strokeWidth={2} />
        </Animated.View>
      </Animated.View>
    </PressableScale>
  );
}
