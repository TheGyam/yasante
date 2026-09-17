import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { useAuth } from '@/features/auth';
import { haptics } from '@/shared/lib/haptics';
import { EASE_OUT, makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { hairTraits } from '../format';
import { useUpdateHairProfile, useUser } from '../hooks';
import { useUserStore } from '../store';
import type { HairProfile } from '../types';
import { GoalsStep } from './GoalsStep';
import { LengthStep } from './LengthStep';
import { DensityStep, PorosityStep } from './TestStep';
import { StrandArt, TextureStep } from './TextureStep';

type StepKey = 'texture' | 'length' | 'density' | 'porosity' | 'goals' | 'summary';

const STEPS: readonly { key: StepKey; title: string; help: string; optional?: boolean }[] = [
  {
    key: 'texture',
    title: 'Which strand looks like yours?',
    help: 'Pull out a single curl when your hair is dry and has no product in it.',
  },
  {
    key: 'length',
    title: 'How long is it, stretched?',
    help: 'Gently pull a curl straight. Drag along the figure to where it reaches.',
  },
  { key: 'density', title: 'How full is it?', help: '', optional: true },
  { key: 'porosity', title: 'How does it take water?', help: '', optional: true },
  { key: 'goals', title: 'What are you working towards?', help: 'Pick as many as you like.' },
  { key: 'summary', title: 'Here’s your hair', help: '' },
];
const QUESTIONS = STEPS.length - 1;

// Steps are a sequence, so they arrive from the direction you're travelling.
const FORWARD = FadeInRight.duration(280).easing(EASE_OUT);
const BACKWARD = FadeInLeft.duration(280).easing(EASE_OUT);

const useStyles = makeStyles(() => ({
  body: { flex: 1 },
  progress: { marginTop: space.sm, marginBottom: space.xxl },
  heading: { gap: space.sm, marginBottom: space.xl },
  step: { flex: 1 },
  footer: { gap: space.xs, paddingTop: space.lg },
  summary: { alignItems: 'center', gap: space.xl, paddingTop: space.xl },
  traits: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
}));

export interface HairQuizProps {
  /** `onboarding` finishes into the app; `retake` saves and closes. */
  mode: 'onboarding' | 'retake';
}

/** Finding out about someone's hair by having them look at it, not by asking for jargon. */
export function HairQuiz({ mode }: HairQuizProps) {
  const styles = useStyles();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { data: account } = useUser(user?.id);
  const local = useUserStore(s => s.hairProfile);
  const setHairProfile = useUserStore(s => s.setHairProfile);
  const setOnboardingCompleted = useUserStore(s => s.setOnboardingCompleted);
  const save = useUpdateHairProfile();

  const [answers, setAnswers] = useState<HairProfile>(() =>
    mode === 'retake' ? { ...(account?.hairProfile ?? local) } : {}
  );
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const step = STEPS[index];
  const set = <K extends keyof HairProfile>(key: K, value: HairProfile[K]) =>
    setAnswers(prev => ({ ...prev, [key]: value }));

  const go = (by: 1 | -1) => {
    setDirection(by);
    setIndex(i => i + by);
  };

  const value = step.key === 'summary' ? undefined : answers[step.key];
  const answered = step.key === 'summary' || (Array.isArray(value) ? value.length > 0 : !!value);

  const finish = async () => {
    const profile = { ...answers, completedAt: new Date().toISOString() };
    if (isAuthenticated) {
      try {
        await save.mutateAsync(profile);
      } catch {
        Alert.alert(
          'Saved on this device',
          'We couldn’t reach the server, so your answers are kept here for now.'
        );
      }
    }
    haptics.success();
    setHairProfile(profile);
    // First run: this opens the app — the welcome screens' guard closes behind it.
    if (mode === 'onboarding') setOnboardingCompleted(true);
    else router.back();
  };

  const traits = hairTraits(answers);

  return (
    <Screen
      scroll={false}
      modal={mode === 'retake'}
      back={index > 0 || mode === 'onboarding'}
      onBack={index > 0 ? () => go(-1) : undefined}
      testID="quiz-screen"
    >
      <View style={styles.body}>
        <View style={styles.progress}>
          <ProgressBar progress={Math.min(index + 1, QUESTIONS) / QUESTIONS} height={4} />
        </View>

        <Animated.View
          key={step.key}
          entering={direction > 0 ? FORWARD : BACKWARD}
          style={styles.step}
        >
          <View style={styles.heading}>
            <Text variant="title1" accessibilityRole="header">
              {step.title}
            </Text>
            {!!step.help && (
              <Text variant="subhead" tone="secondary">
                {step.help}
              </Text>
            )}
          </View>

          {step.key === 'texture' && (
            <TextureStep value={answers.texture} onChange={v => set('texture', v)} />
          )}
          {step.key === 'length' && (
            <LengthStep value={answers.length} onChange={v => set('length', v)} />
          )}
          {step.key === 'density' && (
            <DensityStep value={answers.density} onChange={v => set('density', v)} />
          )}
          {step.key === 'porosity' && (
            <PorosityStep value={answers.porosity} onChange={v => set('porosity', v)} />
          )}
          {step.key === 'goals' && (
            <GoalsStep value={answers.goals} onChange={v => set('goals', v)} />
          )}
          {step.key === 'summary' && (
            <View style={styles.summary}>
              {answers.texture && <StrandArt texture={answers.texture} selected height={140} />}
              <View style={styles.traits}>
                {traits.map(trait => (
                  <Chip key={trait} label={trait} selected />
                ))}
              </View>
              <Text variant="body" tone="secondary" align="center">
                Tips, products and styles now follow your hair. Retake this whenever it changes —
                it’s on your profile.
              </Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.footer}>
          <Button
            label={
              step.key === 'summary'
                ? mode === 'onboarding'
                  ? 'Start exploring'
                  : 'Save'
                : 'Continue'
            }
            onPress={step.key === 'summary' ? finish : () => go(1)}
            disabled={!answered}
            loading={save.isPending}
            haptic={step.key === 'summary' ? undefined : 'light'}
            fullWidth
            testID="quiz-next"
          />
          {step.optional && !answered && (
            <Button label="I’m not sure — skip" variant="ghost" onPress={() => go(1)} fullWidth />
          )}
        </View>
      </View>
    </Screen>
  );
}
