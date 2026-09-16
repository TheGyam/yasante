import { makeStyles, radius, space } from '@/shared/theme';
import { View } from 'react-native';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const useStyles = makeStyles(t => ({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  neutral: { backgroundColor: t.colors.glass.fillStrong },
  accent: { backgroundColor: t.colors.accentSoft },
  success: { backgroundColor: t.colors.successSoft },
  warning: { backgroundColor: t.colors.warningSoft },
  danger: { backgroundColor: t.colors.dangerSoft },
}));

const TEXT_TONE = {
  neutral: 'secondary',
  accent: 'accent',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
} as const;

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const styles = useStyles();
  return (
    <View style={[styles.base, styles[tone]]}>
      <Text variant="caption" tone={TEXT_TONE[tone]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
