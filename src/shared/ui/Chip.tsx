import { Lock, type LucideIcon } from 'lucide-react-native';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  accessibilityLabel?: string;
  /** Chosen for her and can't be undone here — shown selected, with a lock. */
  locked?: boolean;
}

const useStyles = makeStyles(t => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    // A minimum, not a size: larger text grows the chip instead of clipping.
    minHeight: 36,
    paddingVertical: 6,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  idle: { backgroundColor: t.colors.glass.fill, borderColor: t.colors.glass.border },
  selected: { backgroundColor: t.colors.accentSoft, borderColor: t.colors.accent },
}));

/** A filter or choice. Selection ticks with a haptic. */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  accessibilityLabel,
  locked = false,
}: ChipProps) {
  const Icon = locked ? Lock : icon;
  const styles = useStyles();
  const theme = useTheme();
  const color = selected ? theme.colors.accent : theme.colors.text.secondary;

  return (
    <PressableScale
      // Not `disabled`: that fades it, and a locked choice is chosen, not unavailable.
      onPress={locked ? undefined : onPress}
      haptic={locked ? undefined : 'selection'}
      scaleTo={locked ? 1 : undefined}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: locked }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.chip, selected ? styles.selected : styles.idle]}
    >
      {Icon && <Icon size={15} color={color} strokeWidth={2.2} />}
      <Text variant="callout" style={{ color }} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}
