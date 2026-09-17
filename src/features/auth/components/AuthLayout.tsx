import { Children, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { EASE_OUT, makeStyles, space } from '@/shared/theme';
import { BrandMark } from '@/shared/ui/BrandMark';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

export interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  children: ReactNode;
  /** Secondary links under the form. */
  footer?: ReactNode;
  testID?: string;
}

// Seen once or twice in someone's life with the app, so it can afford a considered
// entrance: the heading, then each field in turn. Built once, outside render.
const MAX_STAGGER = 10;
const ENTER = Array.from({ length: MAX_STAGGER }, (_, i) =>
  FadeInDown.duration(420)
    .delay(60 + i * 55)
    .easing(EASE_OUT)
);
const enter = (i: number) => ENTER[Math.min(i, MAX_STAGGER - 1)];

const useStyles = makeStyles(() => ({
  hero: { gap: space.xxl, marginTop: space.lg, marginBottom: space.xxxl },
  heading: { gap: space.sm },
  form: { gap: space.lg },
  footer: { marginTop: space.xxl, alignItems: 'center', gap: space.xs },
}));

/** The shared frame for sign in, sign up and password recovery, presented as a modal. */
export function AuthLayout({ title, subtitle, back, children, footer, testID }: AuthLayoutProps) {
  const styles = useStyles();
  const fields = Children.toArray(children);

  return (
    // A close button at the modal's root; back once a recovery screen is pushed.
    <Screen keyboard modal back={back} testID={testID}>
      <View style={styles.hero}>
        <Animated.View entering={enter(0)}>
          <BrandMark />
        </Animated.View>
        <Animated.View entering={enter(1)} style={styles.heading}>
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
          {subtitle && (
            <Text variant="body" tone="secondary">
              {subtitle}
            </Text>
          )}
        </Animated.View>
      </View>
      <View style={styles.form}>
        {fields.map((field, i) => (
          <Animated.View key={(field as { key?: string }).key ?? i} entering={enter(i + 2)}>
            {field}
          </Animated.View>
        ))}
      </View>
      {footer && (
        <Animated.View entering={enter(fields.length + 2)} style={styles.footer}>
          {footer}
        </Animated.View>
      )}
    </Screen>
  );
}

/** "Don't have an account? Sign up" — plain text with one pressable phrase. */
export function AuthSwitch({
  prompt,
  action,
  onPress,
  testID,
}: {
  prompt: string;
  action: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Text variant="subhead" tone="secondary" align="center">
      {prompt}{' '}
      <Text variant="subhead" tone="accent" onPress={onPress} testID={testID} suppressHighlighting>
        {action}
      </Text>
    </Text>
  );
}
