import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { PressableScale } from './PressableScale';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The label. May contain its own pressable links. */
  children?: ReactNode;
  accessibilityLabel?: string;
}

const useStyles = makeStyles(t => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  box: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { borderColor: t.colors.text.tertiary, backgroundColor: t.colors.glass.fill },
  on: { borderColor: t.colors.accent, backgroundColor: t.colors.accent },
  label: { flex: 1 },
}));

export function Checkbox({ checked, onChange, children, accessibilityLabel }: CheckboxProps) {
  const styles = useStyles();
  const theme = useTheme();

  return (
    <PressableScale
      scaleTo={0.99}
      haptic="selection"
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onChange(!checked)}
      style={styles.row}
    >
      <View style={[styles.box, checked ? styles.on : styles.off]}>
        {checked && <Check size={14} color={theme.colors.text.onAccent} strokeWidth={3} />}
      </View>
      {children && <View style={styles.label}>{children}</View>}
    </PressableScale>
  );
}
