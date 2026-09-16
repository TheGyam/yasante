import { View } from 'react-native';
import { Check, Circle } from 'lucide-react-native';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { PASSWORD_RULES, getPasswordStrength } from '@/shared/utils/validation';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Text } from '@/shared/ui/Text';

const LEVEL = {
  weak: { progress: 0.25, tone: 'danger', label: 'Weak' },
  fair: { progress: 0.5, tone: 'gold', label: 'Fair' },
  good: { progress: 0.75, tone: 'accent', label: 'Good' },
  strong: { progress: 1, tone: 'success', label: 'Strong' },
} as const;

const useStyles = makeStyles(() => ({
  wrap: { gap: space.sm + 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  rules: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: space.xs + 2 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
}));

/** Strength meter and rule checklist, shown once the user starts typing. */
export function PasswordStrength({ password }: { password: string }) {
  const styles = useStyles();
  const theme = useTheme();
  if (!password) return null;

  const level = LEVEL[getPasswordStrength(password)];
  const toneColor = level.tone === 'accent' ? theme.colors.accent : theme.colors[level.tone];

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text variant="footnote" tone="secondary">
          Password strength
        </Text>
        <Text variant="caption" style={{ color: toneColor }}>
          {level.label}
        </Text>
      </View>
      <ProgressBar progress={level.progress} tone={level.tone} height={4} />
      <View style={styles.rules}>
        {PASSWORD_RULES.map(rule => {
          const met = rule.test(password);
          const color = met ? theme.colors.success : theme.colors.text.tertiary;
          return (
            <View key={rule.label} style={styles.rule}>
              {met ? (
                <Check size={13} color={color} strokeWidth={3} />
              ) : (
                <Circle size={11} color={color} strokeWidth={2} />
              )}
              <Text variant="caption" style={{ color }}>
                {rule.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
