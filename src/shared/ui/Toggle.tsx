import { Switch } from 'react-native';
import { useTheme } from '@/shared/theme';
import { haptics } from '@/shared/lib/haptics';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/** The platform switch — nothing hand-built beats it — in brand colours, with a tick. */
export function Toggle({ value, onValueChange, disabled, accessibilityLabel }: ToggleProps) {
  const theme = useTheme();
  return (
    <Switch
      value={value}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      onValueChange={next => {
        haptics.selection();
        onValueChange(next);
      }}
      // Off has to read as a switch too: a white track on a white card disappears.
      trackColor={{ false: theme.colors.text.tertiary, true: theme.colors.accent }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={theme.colors.text.tertiary}
    />
  );
}
