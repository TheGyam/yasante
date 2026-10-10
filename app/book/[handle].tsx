import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import {
  BellRing,
  CalendarClock,
  Car,
  Check,
  Circle,
  CircleCheck,
  House,
  MapPin,
  Scissors,
} from 'lucide-react-native';
import { errorMessage, useAuth } from '@/features/auth';
import { useLook } from '@/features/looks';
import {
  SlotPicker,
  useBooking,
  useBookings,
  useFreeSlots,
  useRequestBooking,
  whenLabel,
} from '@/features/booking';
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
import { EASE_OUT, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Chip } from '@/shared/ui/Chip';
import { notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Pop, RollingText, Tilt } from '@/shared/ui/Motion';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';
import { track } from '@/shared/lib/analytics';
import { joinAddress, POSTCODE, splitAddress } from '@/shared/utils/postcode';

const useStyles = makeStyles(t => ({
  body: { gap: space.xl },
  look: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: t.colors.glass.fill,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
  },
  lookPhoto: { width: 64, height: 80, borderRadius: radius.md },
  lookText: { flex: 1, gap: 2 },
  sent: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: t.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    padding: space.xxl,
  },
  sentTick: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
  },
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
  const theme = useTheme();
  const router = useRouter();
  // "Book this look" arrives with a service; an opened slot arrives with its day.
  const {
    handle,
    service: fromLookService,
    date: slotDay,
    look: lookId,
    again,
  } = useLocalSearchParams<{
    handle: string;
    service?: string;
    date?: string;
    look?: string;
    /** A past booking to repeat: its style, options and hair choice come filled in. */
    again?: string;
  }>();
  // The look she's booking from: shown here, and to the stylist with the request.
  const { data: fromLookData } = useLook(lookId ?? '');
  const fromLook = lookId ? fromLookData : undefined;
  const [sent, setSent] = useState<{ id: string; name: string } | null>(null);
  const { user } = useAuth();
  const { data, isLoading } = useStylistPage(handle);
  const request = useRequestBooking();
  useEffect(() => {
    track('start_booking', {
      handle,
      from: again ? 'again' : fromLookService ? 'look' : slotDay ? 'slot' : 'page',
    });
    // Once, when she opens it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [serviceId, setServiceId] = useState<string | undefined>(fromLookService);
  const [time, setTime] = useState<string>();
  const [ownHair, setOwnHair] = useState(false);
  const [notes, setNotes] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [chosen, setChosen] = useState<ChosenOptions>({});
  // Where: at theirs, or at the client's when they travel. A stylist who only
  // travels always comes to the client.
  const [atClient, setAtClient] = useState(false);
  const [street, setStreet] = useState('');
  const [postcode, setPostcode] = useState('');
  const offers = data?.profile.serviceModels ?? [];
  const comesToMe = offers.includes('mobile') && (atClient || offers.every(m => m === 'mobile'));
  // The address from their last home visit, so it's typed once.
  const { data: past = [] } = useBookings('client');
  const lastHome = past.find(b => b.atClient && b.address)?.address;
  useEffect(() => {
    if (!lastHome || street || postcode) return;
    const known = splitAddress(lastHome);
    setStreet(known.street);
    setPostcode(known.postcode);
    // Once, when it arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastHome]);

  // Booking the same again: once both are here, the same style with the same choices,
  // matched by name, as long as the stylist still offers them.
  const { data: previous } = useBooking(again ?? '');
  const [repeated, setRepeated] = useState(false);
  useEffect(() => {
    if (repeated || !previous || !data) return;
    setRepeated(true);
    const item = data.menu.find(m => m.id === previous.serviceId);
    if (!item) return;
    setServiceId(item.id);
    setOwnHair(previous.bringingOwnHair);
    const labels = previous.optionLabels ?? [];
    const same: ChosenOptions = {};
    for (const g of optionGroups(item)) {
      const match = g.choices.find(c => labels.includes(c.label));
      if (match) same[g.group] = match.id;
    }
    setChosen(same);
  }, [previous, data, repeated]);

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

  // A beat on "sent", then the booking. Closing the screen first cancels the hop.
  useEffect(() => {
    if (!sent) return;
    const hop = setTimeout(() => router.replace(`/bookings/${sent.id}`), 1500);
    return () => clearTimeout(hop);
  }, [sent, router]);

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
        lookId: fromLook?.id,
        atClient: comesToMe,
        clientAddress: comesToMe ? joinAddress(street, postcode) : undefined,
      });
      haptics.success();
      // A beat to see it went, then the booking itself.
      setSent({ id: booking.id, name: data.profile.displayName });
    } catch (error) {
      haptics.error();
      const message = errorMessage(error, 'Check your connection and try again.');
      await notify({ title: 'Couldn’t send that', message });
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

  if (sent) {
    return (
      <Screen modal scroll={false} back={false} testID="booking-sent">
        <View style={styles.sent} accessibilityLiveRegion="polite">
          <Animated.View entering={ZoomIn.duration(320).easing(EASE_OUT)} style={styles.sentTick}>
            <Check size={46} color={theme.colors.accent} strokeWidth={2.8} />
          </Animated.View>
          <Animated.View entering={FadeIn.delay(140).duration(260)}>
            <Text variant="title1" align="center" accessibilityRole="header">
              Sent to {sent.name}
            </Text>
            <Text variant="body" tone="secondary" align="center" style={{ marginTop: space.xs }}>
              They have 48 hours to reply. We’ll let you know the moment they do.
            </Text>
          </Animated.View>
        </View>
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

  const travels = profile.serviceModels.includes('mobile');
  const hosts = profile.serviceModels.some(m => m !== 'mobile');
  const addressReady = !!street.trim() && POSTCODE.test(postcode.trim());

  // The button stays off until everything's there; say what's left, so it never
  // just looks broken.
  const missing = !service
    ? 'Pick a service to send a request.'
    : !quote?.complete
      ? `Pick your ${groups.map(g => g.name.toLowerCase()).join(' and ')}.`
      : !time
        ? 'Pick a time and they have 48 hours to reply.'
        : comesToMe && !addressReady
          ? 'Add your street and postcode so they can get to you.'
          : !accepted
            ? 'Tick their terms above to send.'
            : undefined;

  return (
    <Screen title={`Book ${profile.displayName}`} modal keyboard testID="booking-request">
      <View style={styles.body}>
        {fromLook && (
          <Tilt
            style={styles.look}
            onPress={() => router.push(`/looks/${fromLook.id}`)}
            accessibilityLabel={`Booking from ${fromLook.authorName}'s look. Opens the look`}
          >
            <RemoteImage
              uri={fromLook.thumbUri ?? fromLook.feedUri ?? fromLook.photoUri}
              style={styles.lookPhoto}
            />
            <View style={styles.lookText}>
              <Text variant="overline" tone="tertiary">
                Booking this look
              </Text>
              <Text variant="callout" numberOfLines={2}>
                {fromLook.caption || fromLook.serviceName || 'The look you picked'}
              </Text>
              <Text variant="footnote" tone="secondary">
                {profile.displayName} will see it with your request
              </Text>
            </View>
          </Tilt>
        )}
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
                // A choice, not a link: a tick where a chevron would promise another page.
                trailing={
                  serviceId === item.id ? (
                    <Pop trigger={item.id}>
                      <CircleCheck size={20} color={theme.colors.accent} strokeWidth={2.2} />
                    </Pop>
                  ) : (
                    <Circle size={20} color={theme.colors.text.tertiary} strokeWidth={1.8} />
                  )
                }
                haptic="selection"
                accessibilityLabel={`${item.name}${serviceId === item.id ? ', chosen' : ''}`}
                onPress={() => {
                  if (item.id === serviceId) return;
                  setServiceId(item.id);
                  setChosen({});
                  // A time picked for another service may not fit this one.
                  setTime(undefined);
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
                ? 'Worked out from their own price list. They confirm it when they accept.'
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
              trailing={
                <RollingText variant="callout" tone="secondary">
                  {`${quote.fromPrice ? 'from ' : ''}${formatMoney(quote.price)}`}
                </RollingText>
              }
              icon={CalendarClock}
            />
            {depositDue > 0 && (
              <ListRow
                title="Deposit to confirm"
                subtitle="Paid straight to them, once they accept"
                value={formatMoney(depositDue)}
              />
            )}
          </Section>
        )}

        <View style={styles.group}>
          <Text variant="footnote" tone="secondary" style={styles.label}>
            {!service
              ? 'Pick a service to see when they’re free.'
              : !quoteReady
                ? `Pick your ${groups.map(g => g.name.toLowerCase()).join(' and ')} to see when they’re free.`
                : `When suits you?${hoursLabel(profile.availability) ? ` They work ${hoursLabel(profile.availability)}.` : ''}`}
          </Text>
          {quoteReady && (
            <SlotPicker
              slots={slots.data}
              loading={slots.isLoading}
              refreshing={slots.isPlaceholderData}
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

        {travels && (
          <View style={styles.group}>
            <Text variant="footnote" tone="secondary" style={styles.label}>
              {hosts ? 'Where?' : `${profile.displayName} comes to you`}
            </Text>
            {hosts && (
              <View style={styles.chips}>
                <Chip
                  label={`At theirs · ${profile.baseArea}`}
                  icon={House}
                  selected={!atClient}
                  onPress={() => setAtClient(false)}
                />
                <Chip
                  label="Come to me"
                  icon={Car}
                  selected={atClient}
                  onPress={() => setAtClient(true)}
                />
              </View>
            )}
            {comesToMe && (
              <>
                <Input
                  label="Your house number and street"
                  icon={MapPin}
                  value={street}
                  onChangeText={setStreet}
                  placeholder="4 Choumert Grove"
                  autoCapitalize="words"
                  autoComplete="street-address"
                  textContentType="streetAddressLine1"
                  testID="booking-street"
                />
                <Input
                  label="Your postcode"
                  value={postcode}
                  onChangeText={setPostcode}
                  placeholder="SE15 4RB"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete="postal-code"
                  textContentType="postalCode"
                  maxLength={8}
                  hint={`They see your postcode area first${profile.travelRadiusMiles ? ` (they travel up to ${profile.travelRadiusMiles} miles from ${profile.baseArea})` : ''}, and your street once they confirm.`}
                  testID="booking-postcode"
                />
              </>
            )}
          </View>
        )}

        <Section footer="They'll know not to order hair for you.">
          <ListRow
            title="I'm bringing my own hair"
            // The whole row, not just the switch: a small target is the one people miss.
            onPress={() => setOwnHair(on => !on)}
            haptic="selection"
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
          label="Anything they should know"
          value={notes}
          onChangeText={setNotes}
          placeholder="My hair is shoulder length and I'd like it waist length"
          multiline
          style={{ minHeight: 80 }}
        />

        <Checkbox checked={accepted} onChange={setAccepted}>
          <Text variant="footnote" tone="secondary">
            I accept {profile.displayName}’s terms: {profile.policies.noticeHours} hours’ notice to
            cancel
            {profile.policies.depositType === 'none'
              ? '.'
              : ', and the deposit is paid directly to them.'}
          </Text>
        </Checkbox>

        <View style={styles.footer}>
          <Button
            label="Send request"
            onPress={send}
            disabled={!!missing}
            loading={request.isPending}
            fullWidth
            testID="booking-send"
          />
          <Text variant="caption" tone="tertiary" align="center">
            {missing ?? `${whenLabel(time!, slots.data?.timeZone)}. They have 48 hours to reply.`}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
