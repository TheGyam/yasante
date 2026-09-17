import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { makeStyles, radius, space, timing, useTheme, type Theme } from '@/shared/theme';
import { haptics, type HapticKind } from '@/shared/lib/haptics';
import { Text } from './Text';

export type ListRowTone = 'accent' | 'neutral' | 'success' | 'gold' | 'danger';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: LucideIcon;
  iconTone?: ListRowTone;
  onPress?: (event: GestureResponderEvent) => void;
  haptic?: HapticKind;
  /** Replaces the chevron, e.g. a Toggle. */
  trailing?: ReactNode;
  destructive?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

const useStyles = makeStyles(t => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.md,
  },
  highlight: { backgroundColor: t.colors.glass.fillStrong },
  iconWell: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
}));

function toneColors(theme: Theme, tone: ListRowTone) {
  switch (tone) {
    case 'accent':
      return { fg: theme.colors.accent, bg: theme.colors.accentSoft };
    case 'success':
      return { fg: theme.colors.success, bg: theme.colors.successSoft };
    case 'gold':
      return { fg: theme.colors.gold, bg: theme.colors.warningSoft };
    case 'danger':
      return { fg: theme.colors.danger, bg: theme.colors.dangerSoft };
    default:
      return { fg: theme.colors.text.secondary, bg: theme.colors.glass.fillStrong };
  }
}

/**
 * A settings-style row for grouped lists. Pressing highlights the row rather than
 * scaling it — rows sit edge to edge inside a Section, where scaling reads as a glitch.
 */
export function ListRow({
  title,
  subtitle,
  value,
  icon: Icon,
  iconTone = 'accent',
  onPress,
  haptic,
  trailing,
  destructive = false,
  accessibilityLabel,
  testID,
}: ListRowProps) {
  const styles = useStyles();
  const theme = useTheme();
  const pressed = useSharedValue(0);
  const highlightStyle = useAnimatedStyle(() => ({ opacity: pressed.get() }));
  const tone = toneColors(theme, destructive ? 'danger' : iconTone);

  const content = (
    <>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.highlight, highlightStyle]}
      />
      {Icon && (
        <View style={[styles.iconWell, { backgroundColor: tone.bg }]}>
          <Icon size={17} color={tone.fg} strokeWidth={2.2} />
        </View>
      )}
      <View style={styles.text}>
        <Text variant="callout" tone={destructive ? 'danger' : 'primary'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="footnote" tone="secondary" numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.trailing}>
        {value && (
          <Text variant="subhead" tone="tertiary" numberOfLines={1}>
            {value}
          </Text>
        )}
        {trailing ??
          (onPress && !destructive && (
            <ChevronRight size={18} color={theme.colors.text.tertiary} strokeWidth={2} />
          ))}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      style={styles.row}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPressIn={() => pressed.set(withTiming(1, timing.pressIn))}
      onPressOut={() => pressed.set(withTiming(0, timing.pressOut))}
      onPress={event => {
        if (haptic) haptics[haptic]();
        onPress(event);
      }}
    >
      {content}
    </Pressable>
  );
}
