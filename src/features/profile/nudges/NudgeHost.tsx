import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { subDays } from 'date-fns';
import { useAuth } from '@/features/auth';
import { useBookings } from '@/features/booking';
import { useConsentStore } from '@/shared/config/consentStore';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Sheet } from '@/shared/ui/Sheet';
import { Text } from '@/shared/ui/Text';
import { TAKE_DOWN_REASONS, useHairLog, useLogHair, type TakeDownReason } from '../hairLog';
import { useUpdateHairProfile, useUser } from '../hooks';
import type { HairPorosity } from '../types';
import { nextNudge, type Nudge, type NudgeKind } from './logic';
import { useNudgeMemory } from './store';

const useStyles = makeStyles(() => ({
  body: { gap: space.lg },
  text: { gap: space.xs },
  answers: { gap: space.sm },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
}));

/** Waits for the screen to settle before asking anything. */
const SETTLE_MS = 2500;

interface Answer {
  label: string;
  onPress: () => void;
}

/**
 * Asks one of the occasional questions (see logic.ts) on the home screen: a small
 * sheet, a question in plain words and a tap to answer. Once per visit at most.
 * Nothing loads until the screen has settled, so the feed has the network first.
 */
export function NudgeHost() {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);
  return settled ? <Nudges /> : null;
}

function Nudges() {
  const styles = useStyles();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { data: account } = useUser(user?.id);
  const { data: bookings } = useBookings('client');
  const { data: log } = useHairLog(isAuthenticated);
  const logHair = useLogHair();
  const saveHair = useUpdateHairProfile(user?.id);
  const memory = useNudgeMemory();
  const hairAllowed = useConsentStore(s => s.consents.personalisation?.granted ?? false);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  // A follow-up question within the same sheet (when? why? has it grown?).
  const [step, setStep] = useState<'when' | 'why' | 'grown' | null>(null);
  const [outDaysAgo, setOutDaysAgo] = useState(0);
  const asked = useRef(false);

  useEffect(() => {
    if (isAuthenticated) memory.seen();
    // Once per sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const ready = isAuthenticated && !!account && !!bookings && !!log;
  useEffect(() => {
    if (!ready || asked.current) return;
    asked.current = true;
    const next = nextNudge({ memory, bookings, log, hair: account.hairProfile, hairAllowed });
    if (next) {
      memory.shown();
      setNudge(next);
    }
    // Decided once the data is here, not again as it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!nudge) return null;

  const close = () => {
    setNudge(null);
    setStep(null);
  };
  const later = (kind: NudgeKind, days: number) => {
    memory.snooze(kind, days);
    close();
  };
  const done = () => {
    haptics.success();
    close();
  };
  const updateLength = () => {
    close();
    router.push('/hair-profile/length');
  };
  // The diary is never edited, so the take-down is saved once "why" is answered or skipped.
  const takeDown = (reason?: TakeDownReason) => {
    if (nudge.kind !== 'take_down') return;
    logHair.mutate({
      kind: 'take_down',
      bookingId: nudge.booking.id,
      at: subDays(new Date(), outDaysAgo).toISOString(),
      reason,
    });
    haptics.light();
    // Updating her length saves to her hair profile, so only with her yes.
    if (hairAllowed) setStep('grown');
    else close();
  };
  const when = (daysAgo: number) => {
    setOutDaysAgo(daysAgo);
    setStep('why');
  };
  const porosity = (value: HairPorosity) => {
    saveHair.mutate({ porosity: value });
    done();
  };

  let title = '';
  let message: string | undefined;
  let answers: Answer[] = [];
  let snooze = 14;

  if (nudge.kind === 'take_down' && step === 'when') {
    title = 'When did they come out?';
    answers = [
      { label: 'Today', onPress: () => when(0) },
      { label: 'In the last few days', onPress: () => when(3) },
      { label: 'Last week', onPress: () => when(8) },
      { label: 'Longer ago', onPress: () => when(21) },
    ];
  } else if (nudge.kind === 'take_down' && step === 'why') {
    title = 'Why did they come out?';
    answers = [
      // "It hurt" is health data: only asked with her yes to using hair details.
      ...TAKE_DOWN_REASONS.filter(r => r.value !== 'hurt' || hairAllowed).map(r => ({
        label: r.label,
        onPress: () => takeDown(r.value),
      })),
      { label: 'Skip', onPress: () => takeDown() },
    ];
  } else if (nudge.kind === 'take_down' && step === 'grown') {
    title = 'While your hair’s out, has it grown?';
    message = 'It’s the best time to see your real length. It takes a few seconds.';
    answers = [
      { label: 'Update my length', onPress: updateLength },
      { label: 'Maybe later', onPress: close },
    ];
  } else if (nudge.kind === 'take_down') {
    const style = nudge.booking.serviceName.toLowerCase();
    title = `Are your ${style} still in?`;
    message = `From your appointment with ${nudge.booking.stylistName}. It helps us tell you how long your styles really last.`;
    snooze = 7;
    answers = [
      { label: 'Still in', onPress: () => later('take_down', 7) },
      { label: 'I’ve taken them out', onPress: () => setStep('when') },
    ];
  } else if (nudge.kind === 'length') {
    title = nudge.afterTakeDown
      ? 'Your hair’s out. How long is it now?'
      : 'Has your hair grown lately?';
    message = 'It’s been a while since you last checked. Your growth shows up in Your hair.';
    snooze = 21;
    answers = [
      { label: 'Update my length', onPress: updateLength },
      {
        label: 'It’s about the same',
        onPress: () => {
          saveHair.mutate({ lengthMeasuredAt: new Date().toISOString() });
          done();
        },
      },
    ];
  } else if (nudge.kind === 'porosity') {
    title = 'A quick one about your hair';
    message = 'When you wet your hair, what does the water do?';
    snooze = 30;
    answers = [
      { label: 'It sits on top for a while', onPress: () => porosity('low') },
      { label: 'It soaks in after a moment', onPress: () => porosity('medium') },
      { label: 'It soaks in straight away', onPress: () => porosity('high') },
    ];
  } else if (nudge.kind === 'trim') {
    title = 'When did you last have a trim?';
    message = 'We’ll keep track, so you know when your ends are due.';
    snooze = 28;
    answers = [
      {
        label: 'In the last few weeks',
        onPress: () => {
          logHair.mutate({ kind: 'trim', at: subDays(new Date(), 14).toISOString() });
          done();
        },
      },
      { label: 'It’s been a while', onPress: () => later('trim', 28) },
    ];
  } else if (nudge.kind === 'wash') {
    const since = new Date(nudge.lastWash).toLocaleDateString('en-GB', { weekday: 'long' });
    title = `Had a wash day since ${since}?`;
    snooze = 3;
    answers = [
      {
        label: 'Yes, today',
        onPress: () => {
          logHair.mutate('wash');
          done();
        },
      },
      {
        label: 'Yes, a day or two ago',
        onPress: () => {
          logHair.mutate({ kind: 'wash', at: subDays(new Date(), 1).toISOString() });
          done();
        },
      },
      { label: 'Not yet', onPress: () => later('wash', 2) },
    ];
  }

  return (
    <Sheet visible onClose={() => later(nudge.kind, snooze)}>
      <View style={styles.body} testID={`nudge-${nudge.kind}`}>
        <View style={styles.text}>
          <Text variant="title3">{title}</Text>
          {!!message && (
            <Text variant="subhead" tone="secondary">
              {message}
            </Text>
          )}
        </View>
        <View style={styles.answers}>
          {answers.map((answer, i) => (
            <Button
              key={answer.label}
              label={answer.label}
              variant={i === 0 && answers.length === 2 ? 'primary' : 'secondary'}
              onPress={answer.onPress}
              fullWidth
            />
          ))}
        </View>
        {!step && (
          <View style={styles.footer}>
            <Button
              label="Not now"
              variant="ghost"
              size="sm"
              onPress={() => later(nudge.kind, snooze)}
            />
            <Button
              label="Don’t ask me this"
              variant="ghost"
              size="sm"
              onPress={() => {
                memory.turnOff(nudge.kind);
                close();
              }}
            />
          </View>
        )}
      </View>
    </Sheet>
  );
}
