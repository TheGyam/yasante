import { useState } from 'react';
import { View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import Svg, { Path } from 'react-native-svg';
import type { LucideIcon } from 'lucide-react-native';
import { POLICY_VERSION, PRIVACY_ROUTE, TERMS_ROUTE } from '@/shared/config/policies';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { errorMessage } from '../verification';
import { appleReady, Cancelled, googleReady, useSocialSignIn, type Provider } from '../social';

const useStyles = makeStyles(t => ({
  body: { gap: space.md },
  apple: { height: 56, alignSelf: 'stretch' },
  or: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  rule: { flex: 1, height: 1, backgroundColor: t.colors.glass.border },
}));

/** Google's "G", in its own colours, as their guidelines ask. */
const GoogleG = (({ size = 18 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
    <Path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2z" />
    <Path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
  </Svg>
)) as unknown as LucideIcon;

/**
 * "Continue with Apple" (iPhone) and "Continue with Google", above the email form.
 * They sign in or sign up in one go; a new account takes `role`. `onDone` hears
 * whether an account was just made.
 */
export function SocialSignIn({
  role,
  onDone,
  onError,
}: {
  role?: 'client' | 'stylist';
  onDone?: (created: boolean) => void;
  onError: (message: string) => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const social = useSocialSignIn();
  const [busy, setBusy] = useState<Provider>();

  if (!appleReady && !googleReady) return null;

  const go = async (provider: Provider) => {
    setBusy(provider);
    onError('');
    try {
      const session = await social.mutateAsync({ provider, role, policyVersion: POLICY_VERSION });
      haptics.success();
      onDone?.(session.created);
    } catch (error) {
      if (error instanceof Cancelled) return;
      haptics.error();
      const who = provider === 'apple' ? 'Apple' : 'Google';
      onError(errorMessage(error, `We couldn’t sign you in with ${who}. Please try again.`));
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <View style={styles.body}>
      {appleReady && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            theme.scheme === 'dark'
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={28}
          style={styles.apple}
          onPress={() => !busy && go('apple')}
        />
      )}
      {googleReady && (
        <Button
          label="Continue with Google"
          icon={GoogleG}
          variant="secondary"
          loading={busy === 'google'}
          onPress={() => go('google')}
          fullWidth
          testID="google-sign-in"
        />
      )}
      <Text variant="footnote" tone="tertiary" align="center">
        By continuing you confirm you’re 18 or over and agree to the{' '}
        <Text variant="footnote" tone="accent" onPress={() => router.push(TERMS_ROUTE)}>
          Terms
        </Text>{' '}
        and{' '}
        <Text variant="footnote" tone="accent" onPress={() => router.push(PRIVACY_ROUTE)}>
          Privacy Policy
        </Text>
        .
      </Text>
      <View style={styles.or} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.rule} />
        <Text variant="footnote" tone="tertiary">
          or with email
        </Text>
        <View style={styles.rule} />
      </View>
    </View>
  );
}
