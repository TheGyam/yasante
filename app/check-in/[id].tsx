import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInRight, ZoomIn } from 'react-native-reanimated';
import {
  Check,
  CircleHelp,
  Flame,
  Heart,
  Scissors,
  Smile,
  ThumbsDown,
  ThumbsUp,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import { useBooking, useCheckIn, type CheckInAnswers, type CheckInWeek } from '@/features/booking';
import { ChoiceCard } from '@/features/profile';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { EASE_OUT, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { notify } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

type Key = keyof CheckInAnswers;

const QUESTIONS: {
  key: Key;
  title: (style: string, answers: Partial<CheckInAnswers>) => string;
  options: { value: string; label: string; icon: LucideIcon }[];
}[] = [
  {
    key: 'stillIn',
    title: style => `Are your ${style} still in?`,
    options: [
      { value: 'yes', label: 'Still in', icon: Check },
      { value: 'no', label: 'Taken out', icon: Scissors },
    ],
  },
  {
    key: 'holding',
    title: (style, answers) =>
      answers.stillIn === 'no'
        ? `How did your ${style} hold up?`
        : `How are your ${style} holding up?`,
    options: [
      { value: 'fresh', label: 'Still fresh', icon: Smile },
      { value: 'okay', label: 'A bit fuzzy', icon: Wind },
      { value: 'tired', label: 'Ready to come out', icon: CircleHelp },
    ],
  },
  {
    key: 'scalp',
    title: () => 'How does your scalp feel?',
    options: [
      { value: 'comfortable', label: 'Comfortable', icon: Smile },
      { value: 'itchy', label: 'Itchy', icon: Wind },
      { value: 'sore', label: 'Sore or tight', icon: Flame },
    ],
  },
  {
    key: 'again',
    title: () => 'Would you get it again?',
    options: [
      { value: 'yes', label: 'Yes', icon: ThumbsUp },
      { value: 'maybe', label: 'Maybe', icon: Heart },
      { value: 'no', label: 'No', icon: ThumbsDown },
    ],
  },
];

// Each answer moves on by itself: four questions, four taps.
const NEXT = FadeInRight.duration(260).easing(EASE_OUT);

const useStyles = makeStyles(t => ({
  body: { flex: 1 },
  progress: { marginTop: space.sm, marginBottom: space.xxl },
  heading: { gap: space.sm, marginBottom: space.xl },
  options: { flexDirection: 'row', gap: space.sm },
  option: { flex: 1 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  tick: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.successSoft,
  },
}));

/**
 * Week 2 and week 4 after a style: three taps on how it's holding up. It's the
 * start of the outcome data — which styles last, on which hair, with which care.
 */
export default function CheckInScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading } = useBooking(id);
  const checkIn = useCheckIn();

  const [answers, setAnswers] = useState<Partial<CheckInAnswers>>({});
  const [step, setStep] = useState(0);
  // Held once she answers: the booking re-reads without it, and the thank-you still needs it.
  const [sent, setSent] = useState<CheckInWeek>();
  const due = sent ?? booking?.checkInDue;
  const finished = !!sent && checkIn.isSuccess;

  const answer = async (key: Key, value: string) => {
    if (sent) return;
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }
    if (!due) return;
    setSent(due);
    try {
      await checkIn.mutateAsync({ id, week: due, answers: next as CheckInAnswers });
      haptics.success();
    } catch (error) {
      haptics.error();
      setSent(undefined);
      await notify({
        title: 'Couldn’t save that',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  if (isLoading) {
    return (
      <Screen modal scroll={false} testID="check-in-screen">
        <Skeleton height={200} />
      </Screen>
    );
  }

  if (!booking || (!due && !finished)) {
    return (
      <Screen modal scroll={false} testID="check-in-screen">
        <EmptyState
          icon={Check}
          title="Nothing to check in on"
          message="We'll ask at week 2 and week 4 after a style."
          actionLabel="Close"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  if (finished) {
    return (
      <Screen modal scroll={false} testID="check-in-screen">
        <View style={styles.done}>
          <Animated.View entering={ZoomIn.duration(320).easing(EASE_OUT)} style={styles.tick}>
            <Check size={34} color={theme.colors.success} strokeWidth={2.6} />
          </Animated.View>
          <Animated.View entering={FadeIn.delay(120).duration(240)}>
            <Text variant="title2" align="center" accessibilityRole="header">
              Thanks — that’s week {due}
            </Text>
            <Text variant="body" tone="secondary" align="center" style={{ marginTop: space.xs }}>
              {due === 2
                ? 'We’ll ask again at week 4. Over time this shows which styles last on hair like yours.'
                : 'That’s the last one for this style.'}
            </Text>
          </Animated.View>
        </View>
        <Button label="Done" onPress={() => router.back()} fullWidth testID="check-in-done" />
      </Screen>
    );
  }

  const question = QUESTIONS[Math.min(step, QUESTIONS.length - 1)];
  const style = booking.serviceName.toLowerCase();

  return (
    <Screen
      modal
      scroll={false}
      back={step > 0}
      onBack={step > 0 ? () => setStep(step - 1) : undefined}
      testID="check-in-screen"
    >
      <View style={styles.body}>
        <View style={styles.progress}>
          <ProgressBar
            progress={Math.min(step + 1, QUESTIONS.length) / QUESTIONS.length}
            height={4}
          />
        </View>
        <Animated.View key={question.key} entering={NEXT}>
          <View style={styles.heading}>
            <Text variant="overline" tone="tertiary">
              Week {due} · {booking.stylistName}
            </Text>
            <Text variant="title1" accessibilityRole="header">
              {question.title(style, answers)}
            </Text>
          </View>
          <View style={styles.options}>
            {question.options.map(option => {
              const Icon = option.icon;
              const selected = answers[question.key] === option.value;
              return (
                <ChoiceCard
                  key={option.value}
                  label={option.label}
                  selected={selected}
                  onPress={() => answer(question.key, option.value)}
                  style={styles.option}
                >
                  <Icon
                    size={28}
                    color={selected ? theme.colors.accent : theme.colors.text.secondary}
                    strokeWidth={1.8}
                  />
                </ChoiceCard>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Screen>
  );
}
