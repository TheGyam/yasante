import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark, CalendarHeart, Sparkles, UserRound, type LucideIcon } from 'lucide-react-native';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Sheet } from '@/shared/ui/Sheet';
import { Text } from '@/shared/ui/Text';

export type AuthPromptFeature = 'moodboard' | 'favorites' | 'profile' | 'general';

export interface AuthPromptModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: AuthPromptFeature;
}

const COPY: Record<AuthPromptFeature, { icon: LucideIcon; title: string; body: string }> = {
  moodboard: {
    icon: CalendarHeart,
    title: 'Plan your next look',
    body: 'Create a free account to build mood boards and keep your appointments in one place.',
  },
  favorites: {
    icon: Bookmark,
    title: 'Save what inspires you',
    body: 'Create a free account to keep styles and articles, and find them again anytime.',
  },
  profile: {
    icon: UserRound,
    title: 'Make it yours',
    body: 'Create a free account to track your progress and tailor what you see.',
  },
  general: {
    icon: Sparkles,
    title: 'Join Yasante',
    body: 'Create a free account to plan, save and track everything about your hair.',
  },
};

const useStyles = makeStyles(t => ({
  well: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
  },
  text: { gap: space.sm, marginTop: space.lg, marginBottom: space.xxl },
  actions: { gap: space.sm },
}));

/** Shown when a guest tries something that needs an account. */
export function AuthPromptModal({ visible, onClose, feature = 'general' }: AuthPromptModalProps) {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const copy = COPY[feature];

  const go = (path: '/auth/signup' | '/auth/login') => {
    onClose();
    router.push(path);
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.well}>
        <copy.icon size={26} color={theme.colors.accent} strokeWidth={2.2} />
      </View>
      <View style={styles.text}>
        <Text variant="title2">{copy.title}</Text>
        <Text variant="body" tone="secondary">
          {copy.body}
        </Text>
      </View>
      <View style={styles.actions}>
        <Button label="Create an account" onPress={() => go('/auth/signup')} fullWidth />
        <Button
          label="I have an account"
          variant="secondary"
          onPress={() => go('/auth/login')}
          fullWidth
        />
      </View>
    </Sheet>
  );
}
