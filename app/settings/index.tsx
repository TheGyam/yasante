import { Linking, View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import Constants from 'expo-constants';
import { FileText, LifeBuoy, LogOut, MessageCircleQuestion, Shield } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { PRIVACY_URL, TERMS_URL } from '@/shared/config/policies';
import { haptics } from '@/shared/lib/haptics';
import { makeStyles, space, useThemePreference } from '@/shared/theme';
import { confirm } from '@/shared/ui/dialog';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Text } from '@/shared/ui/Text';

const APPEARANCE = [
  { value: 'system', label: 'Automatic' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
  group: { gap: space.sm },
  // Lines up with the Section titles below.
  label: { marginLeft: space.lg },
}));

export default function SettingsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const preference = useThemePreference(s => s.preference);
  const setPreference = useThemePreference(s => s.setPreference);

  const signOut = async () => {
    haptics.medium();
    const ok = await confirm({
      title: 'Sign out?',
      message: 'Your boards stay safe in your account.',
      confirmLabel: 'Sign out',
      destructive: true,
    });
    if (!ok) return;
    // Back to the profile root first, so you land on its signed-out state.
    router.dismissAll();
    logout();
  };

  return (
    <Screen title="Settings" back testID="settings-screen">
      <View style={styles.body}>
        <View style={styles.group}>
          <Text variant="overline" tone="tertiary" style={styles.label}>
            Appearance
          </Text>
          <SegmentedControl options={APPEARANCE} value={preference} onChange={setPreference} />
        </View>

        <Section title="Help and privacy">
          {isAuthenticated && (
            <ListRow
              title="Privacy and data"
              icon={Shield}
              onPress={() => router.push('/settings/privacy')}
            />
          )}
          <ListRow
            title="Questions"
            icon={MessageCircleQuestion}
            iconTone="neutral"
            onPress={() => router.push('/settings/faqs')}
          />
          <ListRow
            title="Report a problem"
            icon={LifeBuoy}
            iconTone="neutral"
            onPress={() => router.push('/settings/report')}
          />
        </Section>

        <Section footer={`Yasante ${Constants.expoConfig?.version ?? ''}`.trim()}>
          <ListRow
            title="Terms of use"
            icon={FileText}
            iconTone="neutral"
            onPress={() => Linking.openURL(TERMS_URL)}
          />
          <ListRow
            title="Privacy policy"
            icon={FileText}
            iconTone="neutral"
            onPress={() => Linking.openURL(PRIVACY_URL)}
          />
        </Section>

        {isAuthenticated && (
          <Section>
            <ListRow title="Sign out" icon={LogOut} destructive onPress={signOut} />
          </Section>
        )}
      </View>
    </Screen>
  );
}
