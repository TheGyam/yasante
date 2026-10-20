import { useState } from 'react';
import { View } from 'react-native';
import {
  BarChart3,
  Download,
  FlaskConical,
  Trash2,
  type LucideIcon,
  SlidersHorizontal,
} from 'lucide-react-native';
import { api } from '@/api';
import { useAuth } from '@/features/auth';
import { useUserStore } from '@/features/profile';
import { useConsentStore, type ConsentPurpose } from '@/shared/config/consentStore';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { confirm, notify } from '@/shared/ui/dialog';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Toggle } from '@/shared/ui/Toggle';

// The same words as where each is first asked.
const CHOICES: { purpose: ConsentPurpose; title: string; subtitle: string; icon: LucideIcon }[] = [
  {
    purpose: 'analytics',
    title: 'Help make Yasante better',
    subtitle:
      'Share how you use Yasante, never what you post, so we can fix what’s slow or confusing.',
    icon: BarChart3,
  },
  {
    purpose: 'personalisation',
    title: 'Use your hair details',
    subtitle:
      'We’ll use your hair and scalp details to match looks, stylists and products to your hair. Only you and stylists you book can see them.',
    icon: SlidersHorizontal,
  },
  {
    purpose: 'research',
    title: 'Help research on textured hair',
    subtitle:
      'Let your hair data, without your name or photos, join anonymous research on textured hair, including reports for hair brands and studies with universities. You can stop any time in Settings.',
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
  const router = useRouter();
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
        message: 'We’ll email you a copy of everything we hold about you, as a file.',
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
      // Off this screen first, as signing out does, so nothing here asks for her data again.
      router.dismissAll();
      await logout();
      notify({ title: 'Your account is deleted', message: 'Thanks for being part of Yasante.' });
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
              wrap
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
