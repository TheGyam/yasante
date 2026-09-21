import { useState } from 'react';
import { View } from 'react-native';
import {
  BarChart3,
  Download,
  FlaskConical,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { api } from '@/api';
import { useAuth } from '@/features/auth';
import { useUserStore } from '@/features/profile';
import { useConsentStore, type ConsentPurpose } from '@/shared/config/consentStore';
import { makeStyles, space } from '@/shared/theme';
import { confirm, notify } from '@/shared/ui/dialog';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Toggle } from '@/shared/ui/Toggle';

const CHOICES: { purpose: ConsentPurpose; title: string; subtitle: string; icon: LucideIcon }[] = [
  {
    purpose: 'analytics',
    title: 'Usage analytics',
    subtitle: 'Anonymous data that shows us what to fix',
    icon: BarChart3,
  },
  {
    purpose: 'personalisation',
    title: 'Personalisation',
    subtitle: 'Match what you see to your hair profile',
    icon: Sparkles,
  },
  {
    purpose: 'research',
    title: 'Hair research',
    subtitle: 'Let anonymised data inform research. Off until you turn it on',
    icon: FlaskConical,
  },
];

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
}));

export default function PrivacyScreen() {
  const styles = useStyles();
  const consents = useConsentStore(s => s.consents);
  const setConsent = useConsentStore(s => s.setConsent);
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);

  const run = async (task: (userId: string) => Promise<unknown>, failure: string) => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      await task(user.id);
    } catch {
      notify({ title: failure, message: 'Check your connection and try again.' });
    } finally {
      setBusy(false);
    }
  };

  const exportData = () =>
    run(async userId => {
      await api.user.requestDataExport(userId);
      notify({
        title: 'Request sent',
        message: 'We’ll email you a download link when your data is ready.',
      });
    }, 'Couldn’t send the request');

  const deleteAccount = async () => {
    const ok = await confirm({
      title: 'Delete your account?',
      message:
        'This removes your profile, hair profile, looks, comments, collections and shelf. Stylists keep a record of appointments you had, without your name. It can’t be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep my account',
      destructive: true,
    });
    if (!ok) return;
    run(async userId => {
      await api.user.deleteAccount(userId);
      // Nothing of hers stays on the phone either.
      useUserStore.getState().setHairProfile({});
      useUserStore.getState().setHairProfileOwner(null);
      await logout();
    }, 'Couldn’t delete your account');
  };

  return (
    <Screen title="Privacy and data" back testID="privacy-settings-screen">
      <View style={styles.body}>
        <Section title="What you share" footer="Change these whenever you like.">
          {CHOICES.map(choice => (
            <ListRow
              key={choice.purpose}
              title={choice.title}
              subtitle={choice.subtitle}
              icon={choice.icon}
              iconTone="neutral"
              trailing={
                <Toggle
                  value={consents[choice.purpose]?.granted ?? false}
                  onValueChange={value => setConsent(choice.purpose, value)}
                  accessibilityLabel={choice.title}
                />
              }
            />
          ))}
        </Section>

        <Section title="Your data">
          <ListRow title="Download my data" icon={Download} onPress={exportData} />
          <ListRow title="Delete account" icon={Trash2} destructive onPress={deleteAccount} />
        </Section>
      </View>
    </Screen>
  );
}
