import type { ReactNode } from 'react';
import { View } from 'react-native';
import { makeStyles, space } from '@/shared/theme';
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

const useStyles = makeStyles(() => ({
  hero: { gap: space.xxl, marginTop: space.lg, marginBottom: space.xxxl },
  heading: { gap: space.sm },
  form: { gap: space.lg },
  footer: { marginTop: space.xxl, alignItems: 'center', gap: space.xs },
}));

/** The shared frame for sign in, sign up and password recovery. */
export function AuthLayout({ title, subtitle, back, children, footer, testID }: AuthLayoutProps) {
  const styles = useStyles();
  return (
    <Screen keyboard back={back} testID={testID}>
      <View style={styles.hero}>
        <BrandMark />
        <View style={styles.heading}>
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
          {subtitle && (
            <Text variant="body" tone="secondary">
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.form}>{children}</View>
      {footer && <View style={styles.footer}>{footer}</View>}
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
