import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { useAuth } from '@/features/auth';
import { useUnanswered } from '@/shared/config/consentStore';
import { track } from '@/shared/lib/analytics';
import { haptics } from '@/shared/lib/haptics';
import { EASE_OUT, makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { notify } from '@/shared/ui/dialog';
import { Chip } from '@/shared/ui/Chip';
import { ConsentQuestion } from '@/shared/ui/ConsentQuestion';
import { MeasuredLength } from './MeasuredLength';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Screen } from '@/shared/ui/Screen';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Text } from '@/shared/ui/Text';
import { hairTraits } from '../format';
import { useUpdateHairProfile, useUser } from '../hooks';
import { useUserStore } from '../store';
import type { HairProfile } from '../types';
import { GoalsStep } from './GoalsStep';
import { LengthStep } from './LengthStep';
import { AreaStep, BudgetStep, ChemicalStep, ScalpStep } from './MoreSteps';
import { CORE, lengthLine, sectionFor, type SectionKey } from './sections';
import { DensityStep, PorosityStep } from './TestStep';
import { StrandArt, TextureStep } from './TextureStep';

type StepKey = SectionKey | 'summary';

// Steps are a sequence, so they arrive from the direction you're travelling.
const FORWARD = FadeInRight.duration(280).easing(EASE_OUT);
const BACKWARD = FadeInLeft.duration(280).easing(EASE_OUT);

const STRETCH = [
  { value: 'stretched', label: 'Stretched' },
  { value: 'shrunk', label: 'As it shrinks' },
] as const;

const useStyles = makeStyles(() => ({
  body: { flex: 1 },
  progress: { marginTop: space.sm, marginBottom: space.xxl },
  heading: { gap: space.sm, marginBottom: space.xl },
  step: { flex: 1 },
  stretch: { marginBottom: space.lg, gap: space.sm },
  footer: { gap: space.xs, paddingTop: space.lg },
  summary: { alignItems: 'center', gap: space.xl, paddingTop: space.xl },
  traits: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
}));

/** Whether a step has an answer yet. */
function answered(key: StepKey, answers: HairProfile) {
  if (key === 'summary') return true;
  return sectionFor(key)!.answered(answers);
}

export interface HairQuizProps {
  /** `onboarding` asks the core and finishes into the app; `section` asks one and saves. */
  mode: 'onboarding' | 'section';
  section?: SectionKey;
}

/**
 * Finding out about someone's hair by having them look at it, not by asking for
 * jargon. Every answer is kept on the device as it's given, so leaving halfway
 * loses nothing: the next open starts where she stopped.
 */
export function HairQuiz({ mode, section }: HairQuizProps) {
  const styles = useStyles();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { data: account } = useUser(user?.id);
  const local = useUserStore(s => s.hairProfile);
  const setHairProfile = useUserStore(s => s.setHairProfile);
  const setOnboardingCompleted = useUserStore(s => s.setOnboardingCompleted);
  const save = useUpdateHairProfile();
  // Asked before the first question, wherever the hair profile starts.
  const askHair = useUnanswered('personalisation', isAuthenticated);
  // Asked once the core is done, before the app opens.
  const askResearch = useUnanswered('research', isAuthenticated);
  const [askingResearch, setAskingResearch] = useState(false);

  const steps: StepKey[] = mode === 'onboarding' ? [...CORE, 'summary'] : [section ?? 'texture'];
  const [answers, setAnswers] = useState<HairProfile>(() => ({
    ...local,
    ...account?.hairProfile,
  }));
  // Resume at the first question still open.
  const [index, setIndex] = useState(() =>
    mode === 'onboarding'
      ? Math.max(
          0,
          steps.findIndex(key => !answered(key, answers))
        )
      : 0
  );
  const [direction, setDirection] = useState<1 | -1>(1);
  // Stretched and as it shrinks are two answers; this is which one the figure is setting.
  const [lengthMode, setLengthMode] = useState<'stretched' | 'shrunk'>('stretched');

  const key = steps[index];
  const info = key === 'summary' ? undefined : sectionFor(key)!;

  const set = <K extends keyof HairProfile>(field: K, value: HairProfile[K]) => {
    const next = { ...answers, [field]: value };
    if (field === 'length' || field === 'shrunkLength') {
      next.lengthMeasuredAt = new Date().toISOString();
    }
    setAnswers(next);
    // Kept as she goes, so a closed app or a phone call doesn't cost her the answers.
    setHairProfile(next);
  };

  const go = (by: 1 | -1) => {
    if (by > 0 && key !== 'summary') track('profile_section_completed', { section: key });
    setDirection(by);
    setIndex(i => i + by);
  };

  const store = async (profile: HairProfile) => {
    setHairProfile(profile);
    if (!isAuthenticated) return;
    try {
      await save.mutateAsync(profile);
    } catch {
      notify({
        title: 'Saved on this device',
        message: 'We couldn’t reach the server, so your answers are kept here and sent later.',
      });
    }
  };

  const finish = async () => {
    await store({ ...answers, completedAt: answers.completedAt ?? new Date().toISOString() });
    haptics.success();
    if (askResearch) {
      setAskingResearch(true);
      return;
    }
    // First run: this opens the app — the welcome screens' guard closes behind it.
    setOnboardingCompleted(true);
  };

  const saveSection = async () => {
    track('profile_section_completed', { section: key });
    // "Still the same" is a measurement too: the growth curve needs to know it held.
    await store(
      key === 'length' ? { ...answers, lengthMeasuredAt: new Date().toISOString() } : answers
    );
    haptics.success();
    router.back();
  };

  if (askHair) {
    return (
      <ConsentQuestion
        purpose="personalisation"
        modal={mode === 'section'}
        back={mode === 'onboarding'}
        onAnswered={granted => {
          if (granted) return;
          // Without it there's nothing to fill in here, but the rest of the app is hers.
          if (mode === 'onboarding') setOnboardingCompleted(true);
          else router.back();
        }}
      />
    );
  }
  if (askingResearch) {
    return <ConsentQuestion purpose="research" onAnswered={() => setOnboardingCompleted(true)} />;
  }

  const traits = hairTraits(answers);
  const done = answered(key, answers);
  const questions = steps.length - 1;
  const primary = mode === 'section' ? 'Save' : key === 'summary' ? 'Start exploring' : 'Continue';

  return (
    <Screen
      scroll={false}
      keyboard
      modal={mode === 'section'}
      back={index > 0 || mode === 'onboarding'}
      onBack={index > 0 ? () => go(-1) : undefined}
      testID="quiz-screen"
    >
      <View style={styles.body}>
        {mode === 'onboarding' && (
          <View style={styles.progress}>
            <ProgressBar progress={Math.min(index + 1, questions) / questions} height={4} />
          </View>
        )}

        <Animated.View key={key} entering={direction > 0 ? FORWARD : BACKWARD} style={styles.step}>
          <View style={styles.heading}>
            <Text variant="title1" accessibilityRole="header">
              {info?.title ?? 'Here’s your hair'}
            </Text>
            {!!info?.help && (
              <Text variant="subhead" tone="secondary">
                {info.help}
              </Text>
            )}
          </View>

          {key === 'texture' && (
            <TextureStep value={answers.texture} onChange={v => set('texture', v)} />
          )}
          {key === 'length' && (
            <>
              <View style={styles.stretch}>
                <SegmentedControl options={STRETCH} value={lengthMode} onChange={setLengthMode} />
                <Text variant="caption" tone="tertiary" align="center">
                  {lengthLine(answers)}
                </Text>
              </View>
              {/* One figure per state, each holding its own answer. */}
              <LengthStep
                key={lengthMode}
                value={lengthMode === 'stretched' ? answers.length : answers.shrunkLength}
                onChange={v => set(lengthMode === 'stretched' ? 'length' : 'shrunkLength', v)}
              />
              <MeasuredLength cm={answers.lengthCm} onChange={cm => set('lengthCm', cm)} />
            </>
          )}
          {key === 'density' && (
            <DensityStep value={answers.density} onChange={v => set('density', v)} />
          )}
          {key === 'porosity' && (
            <PorosityStep value={answers.porosity} onChange={v => set('porosity', v)} />
          )}
          {key === 'goals' && <GoalsStep value={answers.goals} onChange={v => set('goals', v)} />}
          {key === 'scalp' && <ScalpStep value={answers.scalp} onChange={v => set('scalp', v)} />}
          {key === 'chemicals' && (
            <ChemicalStep value={answers.chemicals} onChange={v => set('chemicals', v)} />
          )}
          {key === 'area' && (
            <AreaStep
              value={answers.area}
              postcode={answers.postcode}
              onChange={v => set('area', v)}
              onPostcode={v => set('postcode', v)}
            />
          )}
          {key === 'budget' && (
            <BudgetStep value={answers.budget} onChange={v => set('budget', v)} />
          )}
          {key === 'summary' && (
            <View style={styles.summary}>
              {answers.texture && <StrandArt texture={answers.texture} selected height={140} />}
              <View style={styles.traits}>
                {traits.map(trait => (
                  <Chip key={trait} label={trait} selected />
                ))}
              </View>
              <Text variant="body" tone="secondary" align="center">
                Tips, products and styles now follow your hair. There’s more you can add whenever
                you like — it’s all on your profile.
              </Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.footer}>
          <Button
            label={primary}
            onPress={mode === 'section' ? saveSection : key === 'summary' ? finish : () => go(1)}
            disabled={!done}
            loading={save.isPending}
            haptic={mode === 'onboarding' && key !== 'summary' ? 'light' : undefined}
            fullWidth
            testID="quiz-next"
          />
          {info?.optional && !done && mode === 'onboarding' && (
            <Button label="I’m not sure — skip" variant="ghost" onPress={() => go(1)} fullWidth />
          )}
        </View>
      </View>
    </Screen>
  );
}
