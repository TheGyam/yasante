import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInLeft, FadeInRight, ZoomIn } from 'react-native-reanimated';
import {
  Check,
  Clock,
  Hourglass,
  Rabbit,
  UserCheck,
  UserX,
  type LucideIcon,
} from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  TIMING_BUCKETS,
  TIMING_REASONS,
  useBooking,
  useCloseBooking,
  type TimingBucket,
  type TimingOutcome,
  type TimingReason,
} from '@/features/booking';
import { ChoiceCard } from '@/features/profile';
import { DEFAULT_CURRENCY, formatMoney, parseMoney, SEP } from '@/shared/lib/format';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { EASE_OUT, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

type Step = 'came' | 'time' | 'bucket' | 'reason' | 'paid' | 'no_show' | 'done';

const OUTCOMES: { value: TimingOutcome; label: string; icon: LucideIcon }[] = [
  { value: 'early', label: 'Finished early', icon: Rabbit },
  { value: 'on_time', label: 'On time', icon: Clock },
  { value: 'over', label: 'Ran over', icon: Hourglass },
];

const FORWARD = FadeInRight.duration(260).easing(EASE_OUT);
const BACKWARD = FadeInLeft.duration(260).easing(EASE_OUT);

const useStyles = makeStyles(t => ({
  body: { flex: 1 },
  progress: { marginTop: space.sm, marginBottom: space.xxl },
  heading: { gap: space.sm, marginBottom: space.xl },
  row: { flexDirection: 'row', gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  half: { width: '48%' },
  option: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  footer: { gap: space.xs, paddingTop: space.lg },
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
 * Closing an appointment: did she come, how did the time go, and what was paid.
 * Taps, never typed minutes — the plan's rule, and the only way the numbers stay
 * comparable from one stylist to the next.
 */
export default function CloseOutScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading } = useBooking(id);
  const close = useCloseBooking();

  const [history, setHistory] = useState<Step[]>(['came']);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [outcome, setOutcome] = useState<TimingOutcome>();
  const [bucket, setBucket] = useState<TimingBucket>();
  const [reason, setReason] = useState<TimingReason>();
  const [paid, setPaid] = useState('');
  // The extension hair she used, if any: her own record, never shown to the client.
  const [brand, setBrand] = useState('');
  const [product, setProduct] = useState('');
  const [packs, setPacks] = useState('');
  const usedHair = !!(brand.trim() || product.trim() || packs.trim());
  const [closedAs, setClosedAs] = useState<'attended' | 'no_show'>();

  const step = history[history.length - 1];
  const go = (next: Step) => {
    setDirection(1);
    setHistory(h => [...h, next]);
  };
  const back = () => {
    setDirection(-1);
    setHistory(h => h.slice(0, -1));
  };

  const started = !!booking?.scheduledFor && new Date(booking.scheduledFor) <= new Date();

  const submit = async (noShow: boolean) => {
    try {
      await close.mutateAsync({
        id,
        outcome: noShow ? 'no_show' : 'attended',
        timing: noShow || !outcome ? undefined : { outcome, bucket, reason },
        actualPrice: noShow ? undefined : parseMoney(paid) || undefined,
        extensionHair:
          noShow || !usedHair
            ? undefined
            : {
                brand: brand.trim() || undefined,
                product: product.trim() || undefined,
                packs: Number(packs) || undefined,
              },
      });
      haptics.success();
      setClosedAs(noShow ? 'no_show' : 'attended');
      go('done');
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t close it',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  if (isLoading || !booking) {
    return (
      <Screen modal scroll={false} testID="close-out">
        <Skeleton height={220} />
      </Screen>
    );
  }

  const first = booking.clientName.split(' ')[0];

  if (step === 'done') {
    return (
      <Screen modal scroll={false} testID="close-out">
        <View style={styles.done}>
          <Animated.View entering={ZoomIn.duration(320).easing(EASE_OUT)} style={styles.tick}>
            <Check size={34} color={theme.colors.success} strokeWidth={2.6} />
          </Animated.View>
          <Animated.View entering={FadeIn.delay(120).duration(240)}>
            <Text variant="title2" align="center" accessibilityRole="header">
              {closedAs === 'no_show' ? 'Marked as a no-show' : 'All closed out'}
            </Text>
            <Text variant="body" tone="secondary" align="center" style={{ marginTop: space.xs }}>
              {closedAs === 'no_show'
                ? `${first} is told, and can contest it once.`
                : `${first} will be asked for a review, and to share the look.`}
            </Text>
          </Animated.View>
        </View>
        <Button label="Done" onPress={() => router.back()} fullWidth testID="close-out-done" />
      </Screen>
    );
  }

  const questions: Record<Exclude<Step, 'done'>, { title: string; help?: string }> = {
    came: { title: `Did ${first} come?` },
    time: { title: 'How did the time go?', help: `Quoted at the length on your menu.` },
    bucket: { title: outcome === 'early' ? 'Early by roughly…' : 'Over by roughly…' },
    reason: {
      title: 'What made the difference?',
      help: 'Only the reasons on your side count towards your public label.',
    },
    paid: { title: 'What were you paid?', help: 'It stays between you and your numbers.' },
    no_show: {
      title: `Mark ${first} as a no-show?`,
      help: 'It goes on their record, and they can contest it once. Only mark it if they really didn’t arrive.',
    },
  };
  const question = questions[step];
  const total = outcome === 'on_time' ? 3 : 5;
  const progress = Math.min(history.length, total) / total;

  return (
    <Screen
      modal
      scroll={step === 'reason' || step === 'paid'}
      keyboard={step === 'paid'}
      back={history.length > 1 || undefined}
      onBack={history.length > 1 ? back : undefined}
      testID="close-out"
    >
      <View style={styles.body}>
        <View style={styles.progress}>
          <ProgressBar progress={progress} height={4} />
        </View>

        <Animated.View key={step} entering={direction > 0 ? FORWARD : BACKWARD}>
          <View style={styles.heading}>
            <Text variant="overline" tone="tertiary">
              {booking.serviceName}
              {SEP}
              {booking.clientName}
            </Text>
            <Text variant="title1" accessibilityRole="header">
              {question.title}
            </Text>
            {!!question.help && (
              <Text variant="subhead" tone="secondary">
                {question.help}
              </Text>
            )}
          </View>

          {step === 'came' && (
            <>
              <View style={styles.row}>
                <ChoiceCard
                  label="They came"
                  selected={false}
                  onPress={() => go('time')}
                  style={styles.option}
                >
                  <UserCheck size={30} color={theme.colors.success} strokeWidth={1.8} />
                </ChoiceCard>
                <ChoiceCard
                  label="They didn’t turn up"
                  hint={started ? undefined : 'After the start time'}
                  selected={false}
                  onPress={() => (started ? go('no_show') : undefined)}
                  style={[styles.option, !started && { opacity: 0.45 }]}
                >
                  <UserX size={30} color={theme.colors.text.secondary} strokeWidth={1.8} />
                </ChoiceCard>
              </View>
            </>
          )}

          {step === 'time' && (
            <View style={styles.row}>
              {OUTCOMES.map(option => {
                const Icon = option.icon;
                return (
                  <ChoiceCard
                    key={option.value}
                    label={option.label}
                    selected={outcome === option.value}
                    onPress={() => {
                      setOutcome(option.value);
                      if (option.value === 'on_time') {
                        setBucket(undefined);
                        setReason(undefined);
                        go('paid');
                      } else go('bucket');
                    }}
                    style={styles.option}
                  >
                    <Icon
                      size={28}
                      color={
                        outcome === option.value ? theme.colors.accent : theme.colors.text.secondary
                      }
                      strokeWidth={1.8}
                    />
                  </ChoiceCard>
                );
              })}
            </View>
          )}

          {step === 'bucket' && (
            <View style={styles.grid}>
              {TIMING_BUCKETS.map(option => (
                <ChoiceCard
                  key={option.value}
                  label={option.label}
                  selected={bucket === option.value}
                  onPress={() => {
                    setBucket(option.value);
                    go('reason');
                  }}
                  style={styles.half}
                />
              ))}
            </View>
          )}

          {step === 'reason' && (
            <>
              {(['client', 'stylist'] as const).map(side => (
                <View key={side}>
                  <Text variant="footnote" tone="secondary" style={{ marginBottom: space.sm }}>
                    {side === 'client' ? 'On their side' : 'On your side, or the job'}
                  </Text>
                  <View style={styles.chips}>
                    {TIMING_REASONS.filter(r => r.side === side).map(option => (
                      <Chip
                        key={option.value}
                        label={option.label}
                        selected={reason === option.value}
                        onPress={() => {
                          setReason(option.value);
                          go('paid');
                        }}
                      />
                    ))}
                  </View>
                </View>
              ))}
              <Button
                label="Skip — no particular reason"
                variant="ghost"
                onPress={() => {
                  setReason(undefined);
                  go('paid');
                }}
                fullWidth
              />
            </>
          )}

          {step === 'paid' && (
            <View style={{ gap: space.lg }}>
              <Input
                label="Amount paid, including the deposit"
                value={paid}
                onChangeText={setPaid}
                placeholder={String(booking.price)}
                keyboardType="decimal-pad"
                hint={`Quoted ${booking.fromPrice ? 'from ' : ''}${formatMoney(booking.price, booking.currency ?? DEFAULT_CURRENCY)}. Leave it empty if it matched.`}
              />
              <Input
                label="Extension hair brand (optional)"
                value={brand}
                onChangeText={setBrand}
                maxLength={80}
                placeholder="For example X-Pression"
              />
              <Input
                label="Product or colour (optional)"
                value={product}
                onChangeText={setProduct}
                maxLength={120}
              />
              <Input
                label="Packs used (optional)"
                value={packs}
                onChangeText={text => setPacks(text.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
              />
              <View style={styles.footer}>
                <Button
                  label="Close it out"
                  onPress={() => submit(false)}
                  loading={close.isPending}
                  fullWidth
                  testID="close-out-submit"
                />
              </View>
            </View>
          )}

          {step === 'no_show' && (
            <View style={styles.footer}>
              <Button
                label="Mark as a no-show"
                variant="danger"
                onPress={() => submit(true)}
                loading={close.isPending}
                fullWidth
                testID="close-out-no-show"
              />
              <Button label="They did come" variant="ghost" onPress={back} fullWidth />
            </View>
          )}
        </Animated.View>
      </View>
    </Screen>
  );
}
