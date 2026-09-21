import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BellRing, CalendarClock, Scissors } from 'lucide-react-native';
import { errorMessage, useAuth } from '@/features/auth';
import { SlotPicker, useFreeSlots, useRequestBooking, whenLabel } from '@/features/booking';
import {
  estimate,
  formatDuration,
  formatPrice,
  hoursLabel,
  optionGroups,
  useStylistPage,
  type ChosenOptions,
} from '@/features/stylist';
import { POLICY_VERSION } from '@/shared/config/policies';
import { formatMoney } from '@/shared/lib/format';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Chip } from '@/shared/ui/Chip';
import { notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';
import { track } from '@/shared/lib/analytics';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  group: { gap: space.sm },
  label: { marginLeft: space.xs },
  estimate: { gap: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

/**
 * Asking for an appointment. She picks from the stylist's real free times — the
 * days she works, with the hours already taken left out — so whatever's asked for
 * is something the stylist can say yes to.
 */
export default function RequestBookingScreen() {
  const styles = useStyles();
  const router = useRouter();
  // "Book this look" arrives with a service; an opened slot arrives with its day.
  const {
    handle,
    service: fromLook,
    date: slotDay,
  } = useLocalSearchParams<{ handle: string; service?: string; date?: string }>();
  const { user } = useAuth();
  const { data, isLoading } = useStylistPage(handle);
  const request = useRequestBooking();
  useEffect(() => {
    track('start_booking', { handle, from: fromLook ? 'look' : slotDay ? 'slot' : 'page' });
    // Once, when she opens it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [serviceId, setServiceId] = useState<string | undefined>(fromLook);
  const [time, setTime] = useState<string>();
  const [ownHair, setOwnHair] = useState(false);
  const [notes, setNotes] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [chosen, setChosen] = useState<ChosenOptions>({});

  const service = useMemo(
    () => data?.menu.find(item => item.id === serviceId),
    [data?.menu, serviceId]
  );
  // Her free times depend on how long the job runs, so they follow the options.
  const optionIds = Object.values(chosen).filter((id): id is string => !!id);
  const quoteReady = !!service && estimate(service, chosen).complete;
  const slots = useFreeSlots(handle, quoteReady ? serviceId : undefined, optionIds);
  // A different job can take a different amount of time; a picked time may no longer fit.
  useEffect(() => {
    if (time && slots.data && !slots.data.days.some(d => d.times.includes(time))) {
      setTime(undefined);
    }
  }, [slots.data, time]);

  const send = async () => {
    if (!data || !service || !time) return;
    try {
      const booking = await request.mutateAsync({
        stylistId: data.profile.accountId,
        serviceId: service.id,
        options: chosen,
        bringingOwnHair: ownHair,
        requestedTimes: [time],
        notes: notes.trim() || undefined,
        policyVersion: POLICY_VERSION,
      });
      haptics.success();
      router.replace(`/bookings/${booking.id}`);
    } catch (error) {
      haptics.error();
      const message = errorMessage(error, 'Check your connection and try again.');
      await notify({ title: 'Couldn’t send that', message });
      // The one thing she can fix from here.
      if (message.toLowerCase().includes('mobile')) router.push('/auth/verify-phone');
      // Someone got there first: show what's still free.
      slots.refetch();
    }
  };

  if (isLoading || !data) {
    return (
      <Screen title="Request a booking" modal testID="booking-request">
        <Skeleton height={240} />
      </Screen>
    );
  }

  const { profile, menu } = data;
  const quote = service ? estimate(service, chosen) : undefined;
  const groups = service ? optionGroups(service) : [];
  const depositDue =
    profile.policies.depositType === 'none' || !quote
      ? 0
      : profile.policies.depositType === 'percent'
        ? Math.round((quote.price * (profile.policies.depositAmount ?? 0)) / 100)
        : (profile.policies.depositAmount ?? 0);

  return (
    <Screen title={`Book ${profile.displayName}`} modal keyboard testID="booking-request">
      <View style={styles.body}>
        <View style={styles.group}>
          <Text variant="footnote" tone="secondary" style={styles.label}>
            What would you like?
          </Text>
          <Section>
            {menu.map(item => (
              <ListRow
                key={item.id}
                title={item.name}
                subtitle={item.durationMinutes ? formatDuration(item.durationMinutes) : item.note}
                value={formatPrice(item)}
                icon={Scissors}
                iconTone={serviceId === item.id ? 'accent' : 'neutral'}
                onPress={() => {
                  setServiceId(item.id);
                  setChosen({});
                }}
                testID={`service-${item.id}`}
              />
            ))}
          </Section>
        </View>

        {groups.map(({ group, name, choices }) => (
          <View key={group} style={styles.group}>
            <Text variant="footnote" tone="secondary" style={styles.label}>
              {name}
            </Text>
            <View style={styles.chips}>
              {choices.map((choice, index) => (
                <Chip
                  key={choice.id}
                  label={
                    index === 0 ? choice.label : `${choice.label} · +${formatMoney(choice.add)}`
                  }
                  selected={chosen[group] === choice.id}
                  onPress={() => setChosen(current => ({ ...current, [group]: choice.id }))}
                />
              ))}
            </View>
          </View>
        ))}

        {!!service && !!quote && (
          <Section
            title="What it comes to"
            footer={
              quote.complete
                ? 'Worked out from her own price list. She confirms it when she accepts.'
                : `Pick your ${groups.map(g => g.name.toLowerCase()).join(' and ')} to see what it comes to.`
            }
          >
            <ListRow
              title={[service.name, ...quote.labels].join(' · ')}
              subtitle={
                [
                  quote.minutes ? `About ${formatDuration(quote.minutes)}` : undefined,
                  service.hairIncluded ? 'Hair included' : undefined,
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined
              }
              value={`${quote.fromPrice ? 'from ' : ''}${formatMoney(quote.price)}`}
              icon={CalendarClock}
            />
            {depositDue > 0 && (
              <ListRow
                title="Deposit to confirm"
                subtitle="Paid straight to her, once she accepts"
                value={formatMoney(depositDue)}
              />
            )}
          </Section>
        )}

        <View style={styles.group}>
          <Text variant="footnote" tone="secondary" style={styles.label}>
            {!service
              ? 'Pick a service to see when she’s free.'
              : !quoteReady
                ? `Pick your ${groups.map(g => g.name.toLowerCase()).join(' and ')} to see when she’s free.`
                : `When suits you?${hoursLabel(profile.availability) ? ` She works ${hoursLabel(profile.availability)}.` : ''}`}
          </Text>
          {quoteReady && (
            <SlotPicker
              slots={slots.data}
              loading={slots.isLoading}
              value={time}
              onChange={setTime}
              initialDay={slotDay}
              whenFull={
                <Button
                  label="Tell me when a slot opens"
                  icon={BellRing}
                  variant="secondary"
                  onPress={() => router.replace(`/waitlist/${handle}`)}
                  fullWidth
                />
              }
            />
          )}
        </View>

        <Section footer="She'll know not to order hair for you.">
          <ListRow
            title="I'm bringing my own hair"
            trailing={
              <Toggle
                value={ownHair}
                onValueChange={setOwnHair}
                accessibilityLabel="I'm bringing my own hair"
              />
            }
          />
        </Section>

        <Input
          label="Anything she should know"
          value={notes}
          onChangeText={setNotes}
          placeholder="My hair is shoulder length and I'd like it waist length"
          multiline
          style={{ minHeight: 80 }}
        />

        <Checkbox checked={accepted} onChange={setAccepted}>
          <Text variant="footnote" tone="secondary">
            I accept {profile.displayName}’s terms: {profile.policies.noticeHours} hours’ notice to
            cancel, and the deposit is paid directly to her.
          </Text>
        </Checkbox>

        <View style={styles.footer}>
          <Button
            label="Send request"
            onPress={send}
            disabled={!service || !quote?.complete || !accepted || !time}
            loading={request.isPending}
            fullWidth
            testID="booking-send"
          />
          <Text variant="caption" tone="tertiary" align="center">
            {user?.phoneVerified
              ? time
                ? `${whenLabel(time)}. She has 48 hours to reply.`
                : 'Pick a time and she has 48 hours to reply.'
              : 'You’ll verify your mobile number before this can be sent.'}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
