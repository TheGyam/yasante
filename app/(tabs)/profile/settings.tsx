import { Alert, Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { FileText, LifeBuoy, LogOut, MessageCircleQuestion, Shield } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { PRIVACY_URL, TERMS_URL } from '@/shared/config/policies';
import { haptics } from '@/shared/lib/haptics';
import { makeStyles, space, useThemePreference } from '@/shared/theme';
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

  const signOut = () => {
    haptics.medium();
    Alert.alert('Sign out?', 'Your boards stay safe in your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
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
              onPress={() => router.push('/(tabs)/profile/privacy')}
            />
          )}
          <ListRow
            title="Questions"
            icon={MessageCircleQuestion}
            iconTone="neutral"
            onPress={() => router.push('/(tabs)/profile/faqs')}
          />
          <ListRow
            title="Report a problem"
            icon={LifeBuoy}
            iconTone="neutral"
            onPress={() => router.push('/(tabs)/profile/report')}
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
