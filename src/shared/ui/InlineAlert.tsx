import { View } from 'react-native';
import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Text } from './Text';

export interface InlineAlertProps {
  message: string;
  tone?: 'danger' | 'success' | 'info';
}

const useStyles = makeStyles(t => ({
  base: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm + 2,
    padding: space.md,
    borderRadius: radius.md,
  },
  danger: { backgroundColor: t.colors.dangerSoft },
  success: { backgroundColor: t.colors.successSoft },
  info: { backgroundColor: t.colors.accentSoft },
  text: { flex: 1 },
}));

const ICONS = { danger: CircleAlert, success: CircleCheck, info: Info } as const;

/** A message tied to the content around it — a form error, a saved confirmation. */
export function InlineAlert({ message, tone = 'danger' }: InlineAlertProps) {
  const styles = useStyles();
  const theme = useTheme();
  const Icon = ICONS[tone];
  const color = tone === 'info' ? theme.colors.accent : theme.colors[tone];

  return (
    <View
      style={[styles.base, styles[tone]]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Icon size={18} color={color} strokeWidth={2.2} />
      <Text variant="subhead" style={[styles.text, { color }]}>
        {message}
      </Text>
    </View>
  );
}
