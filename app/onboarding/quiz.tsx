import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import {
  useUpdateHairProfile,
  useUserStore,
  type HairDensity,
  type HairGoal,
  type HairPorosity,
  type HairTexture,
} from '@/features/profile';
import { EASE_OUT, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { haptics } from '@/shared/lib/haptics';
import { Button } from '@/shared/ui/Button';
import { PressableScale } from '@/shared/ui/PressableScale';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

interface Option {
  value: string;
  label: string;
  hint?: string;
}

interface Step {
  key: 'texture' | 'density' | 'porosity' | 'goals';
  question: string;
  help: string;
  multiple?: boolean;
  options: Option[];
}

const STEPS: readonly Step[] = [
  {
    key: 'texture',
    question: 'What’s your hair texture?',
    help: 'Go by how it dries without products or heat.',
    options: [
      { value: 'straight', label: 'Straight', hint: 'Falls flat from root to tip' },
      { value: 'wavy', label: 'Wavy', hint: 'Loose S-shaped bends' },
      { value: 'curly', label: 'Curly', hint: 'Defined, springy loops' },
      { value: 'coily', label: 'Coily', hint: 'Tight coils, pencil-width or smaller' },
      { value: 'kinky', label: 'Kinky', hint: 'Tight zig-zags with a lot of shrinkage' },
    ],
  },
  {
    key: 'density',
    question: 'How dense is it?',
    help: 'Part your hair at the crown and look at how much scalp shows.',
    options: [
      { value: 'fine', label: 'Low', hint: 'Scalp easy to see' },
      { value: 'medium', label: 'Medium', hint: 'Some scalp shows' },
      { value: 'thick', label: 'High', hint: 'Hard to see your scalp' },
    ],
  },
  {
    key: 'porosity',
    question: 'How does it take moisture?',
    help: 'Not sure? Think about how quickly it gets wet and dries.',
    options: [
      { value: 'low', label: 'Slowly', hint: 'Water beads up; products sit on top' },
      { value: 'medium', label: 'Easily', hint: 'Absorbs and holds moisture well' },
      { value: 'high', label: 'Quickly, then dries out', hint: 'Soaks up fast, loses it fast' },
    ],
  },
  {
    key: 'goals',
    question: 'What are you working towards?',
    help: 'Choose as many as you like.',
    multiple: true,
    options: [
      { value: 'growth', label: 'Growth' },
      { value: 'health', label: 'Healthier hair' },
      { value: 'moisture', label: 'Moisture' },
      { value: 'strength', label: 'Less breakage' },
      { value: 'color', label: 'Colour care' },
      { value: 'style', label: 'New styles' },
    ],
  },
];

const STEP_ENTER = FadeIn.duration(250).easing(EASE_OUT);

type Answers = Partial<Record<Step['key'], string | string[]>>;

const useStyles = makeStyles(t => ({
  progress: { gap: space.sm, marginTop: space.sm, marginBottom: space.xxxl },
  heading: { gap: space.sm, marginBottom: space.xxl },
  options: { gap: space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 60,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  idle: {
    backgroundColor: t.colors.glass.fill,
    borderColor: t.colors.glass.border,
    borderTopColor: t.colors.glass.highlight,
  },
  selected: { backgroundColor: t.colors.accentSoft, borderColor: t.colors.accent },
  optionText: { flex: 1, gap: 2 },
  mark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xxxl },
  action: { flex: 1 },
}));

export default function QuizScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const isAuthenticated = useAuth().isAuthenticated;
  const setOnboardingCompleted = useUserStore(s => s.setOnboardingCompleted);
  const setHairProfile = useUserStore(s => s.setHairProfile);
  const updateHairProfile = useUpdateHairProfile();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const step = STEPS[index];
  const answer = answers[step.key];
  const isLast = index === STEPS.length - 1;
  const canContinue = Array.isArray(answer) ? answer.length > 0 : !!answer;

  const toggle = (value: string) => {
    setAnswers(prev => {
      if (!step.multiple) return { ...prev, [step.key]: value };
      const current = (prev[step.key] as string[] | undefined) ?? [];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [step.key]: next };
    });
  };

  const finish = async () => {
    const profile = {
      texture: answers.texture as HairTexture,
      density: answers.density as HairDensity,
      porosity: answers.porosity as HairPorosity,
      goals: answers.goals as HairGoal[],
      completedAt: new Date().toISOString(),
    };

    // The quiz runs before signup, so there's usually no account to save against yet.
    // Keep the answers on the device either way — they drive personalisation.
    setHairProfile(profile);
    setOnboardingCompleted(true);

    // ponytail: pushes to the server only if already signed in. Syncing a
    // locally-answered profile after signup lands with the progressive profile in M0.
    if (isAuthenticated) {
      try {
        await updateHairProfile.mutateAsync(profile);
      } catch {
        Alert.alert(
          'Saved on this device',
          'We couldn’t reach the server, so your answers are saved here for now.'
        );
      }
    }

    haptics.success();
    router.replace('/(tabs)/home');
  };

  const goBack = () => (index === 0 ? router.back() : setIndex(i => i - 1));

  return (
    <Screen back onBack={goBack} testID="quiz-screen">
      <View style={styles.progress}>
        <Text variant="overline" tone="tertiary">
          Step {index + 1} of {STEPS.length}
        </Text>
        <ProgressBar progress={(index + 1) / STEPS.length} height={4} />
      </View>

      <Animated.View key={step.key} entering={STEP_ENTER}>
        <View style={styles.heading}>
          <Text variant="title1" accessibilityRole="header">
            {step.question}
          </Text>
          <Text variant="subhead" tone="secondary">
            {step.help}
          </Text>
        </View>

        <View style={styles.options} accessibilityRole={step.multiple ? undefined : 'radiogroup'}>
          {step.options.map(option => {
            const selected = Array.isArray(answer)
              ? answer.includes(option.value)
              : answer === option.value;
            return (
              <PressableScale
                key={option.value}
                scaleTo={0.98}
                haptic="selection"
                accessibilityRole={step.multiple ? 'checkbox' : 'radio'}
                accessibilityState={{ checked: selected }}
                accessibilityLabel={option.hint ? `${option.label}. ${option.hint}` : option.label}
                onPress={() => toggle(option.value)}
                style={[styles.option, selected ? styles.selected : styles.idle]}
              >
                <View style={styles.optionText}>
                  <Text variant="callout">{option.label}</Text>
                  {option.hint && (
                    <Text variant="footnote" tone="secondary">
                      {option.hint}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.mark,
                    {
                      borderColor: selected ? theme.colors.accent : theme.colors.text.tertiary,
                      backgroundColor: selected ? theme.colors.accent : 'transparent',
                    },
                  ]}
                >
                  {selected && (
                    <Check size={14} color={theme.colors.text.onAccent} strokeWidth={3} />
                  )}
                </View>
              </PressableScale>
            );
          })}
        </View>
      </Animated.View>

      <View style={styles.actions}>
        <View style={styles.action}>
          <Button
            label={isLast ? 'Finish' : 'Continue'}
            onPress={isLast ? finish : () => setIndex(i => i + 1)}
            disabled={!canContinue}
            loading={updateHairProfile.isPending}
            fullWidth
            testID="quiz-next"
          />
        </View>
      </View>
    </Screen>
  );
}
