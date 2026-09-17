import { View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CalendarHeart, Sparkles, TrendingUp, type LucideIcon } from 'lucide-react-native';
import { EASE_OUT, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { BrandMark } from '@/shared/ui/BrandMark';
import { Button } from '@/shared/ui/Button';
import { Glass } from '@/shared/ui/Glass';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

const PROMISES: readonly { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Sparkles, title: 'Made for your texture', body: 'Care and styles matched to your hair.' },
  {
    icon: CalendarHeart,
    title: 'Plan every style',
    body: 'Appointments, costs and wash days in one place.',
  },
  { icon: TrendingUp, title: 'See your growth', body: 'Track length and health, month by month.' },
];

// First-run only, so it can afford a considered entrance. Built once, outside render.
const enter = (i: number) =>
  FadeInDown.duration(420)
    .delay(120 + i * 70)
    .easing(EASE_OUT);
const ENTER = [enter(0), enter(1), enter(2), enter(3), enter(4)];

const useStyles = makeStyles(() => ({
  fill: { flex: 1, justifyContent: 'space-between' },
  top: { gap: space.huge, marginTop: space.xxl },
  heading: { gap: space.md },
  promises: { gap: space.sm },
  promise: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseText: { flex: 1, gap: 2 },
  actions: { gap: space.sm, marginTop: space.xxl },
}));

export default function WelcomeScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();

  return (
    <Screen scroll={false} testID="welcome-screen">
      <View style={styles.fill}>
        <View style={styles.top}>
          <Animated.View entering={ENTER[0]}>
            <BrandMark />
          </Animated.View>
          <Animated.View entering={ENTER[1]} style={styles.heading}>
            <Text variant="display">Your hair,{'\n'}planned beautifully.</Text>
            <Text variant="body" tone="secondary">
              Everything you do for your hair, and everyone who helps — in one place.
            </Text>
          </Animated.View>
          <View style={styles.promises}>
            {PROMISES.map((p, i) => (
              <Animated.View key={p.title} entering={ENTER[i + 2]}>
                <Glass radius={radius.lg} style={[styles.promise, { padding: space.md }]}>
                  <View style={[styles.icon, { backgroundColor: theme.colors.accentSoft }]}>
                    <p.icon size={19} color={theme.colors.accent} strokeWidth={2.2} />
                  </View>
                  <View style={styles.promiseText}>
                    <Text variant="callout">{p.title}</Text>
                    <Text variant="footnote" tone="secondary">
                      {p.body}
                    </Text>
                  </View>
                </Glass>
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label="Get started"
            haptic="light"
            onPress={() => router.push('/onboarding/quiz')}
            fullWidth
            testID="get-started"
          />
          <Button
            label="I already have an account"
            variant="ghost"
            onPress={() => router.push('/auth/login')}
            fullWidth
          />
          {/* Stylists never see the hair quiz: straight to their own sign-up. */}
          <Text
            variant="subhead"
            tone="secondary"
            align="center"
            suppressHighlighting
            onPress={() => router.push({ pathname: '/auth/signup', params: { role: 'stylist' } })}
            testID="stylist-entry"
          >
            Are you a stylist?{' '}
            <Text variant="subhead" tone="accent">
              Set up your page
            </Text>
          </Text>
        </View>
      </View>
    </Screen>
  );
}
