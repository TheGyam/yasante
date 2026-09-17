import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Text } from '@/shared/ui/Text';

export interface ChoiceCardProps {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
  /** The picture: a strand, a glass of water, a ponytail. */
  children?: ReactNode;
  multiple?: boolean;
  style?: StyleProp<ViewStyle>;
}

const useStyles = makeStyles(t => ({
  card: {
    // Fills its cell, so a row of cards lines up even when one label wraps.
    flexGrow: 1,
    alignItems: 'center',
    gap: space.xs,
    paddingTop: space.md,
    paddingBottom: space.md,
    paddingHorizontal: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  idle: {
    backgroundColor: t.colors.glass.fill,
    borderColor: t.colors.glass.border,
    borderTopColor: t.colors.glass.highlight,
  },
  selected: { backgroundColor: t.colors.accentSoft, borderColor: t.colors.accent },
  art: { alignSelf: 'stretch', alignItems: 'center', marginBottom: space.xs },
  check: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accent,
  },
}));

/** A picture-first answer. The picture carries the meaning; the words confirm it. */
export function ChoiceCard({
  label,
  hint,
  selected,
  onPress,
  children,
  multiple,
  style,
}: ChoiceCardProps) {
  const styles = useStyles();
  const theme = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.96}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      containerStyle={style}
      style={[styles.card, selected ? styles.selected : styles.idle]}
    >
      {children && <View style={styles.art}>{children}</View>}
      <Text variant="callout" align="center" numberOfLines={2}>
        {label}
      </Text>
      {hint && (
        <Text variant="caption" tone="secondary" align="center" numberOfLines={2}>
          {hint}
        </Text>
      )}
      {selected && (
        <View style={styles.check}>
          <Check size={12} color={theme.colors.text.onAccent} strokeWidth={3.2} />
        </View>
      )}
    </PressableScale>
  );
}
