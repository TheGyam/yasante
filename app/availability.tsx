import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { addDays, format } from 'date-fns';
import { CalendarOff, CalendarX2, X } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  AHEAD_CHOICES,
  DEFAULT_AHEAD_DAYS,
  DEFAULT_AVAILABILITY,
  DEFAULT_NOTICE_HOURS,
  GAP_CHOICES,
  MAX_NOTICE_HOURS,
  NOTICE_CHOICES,
  bookingRulesLabel,
  hoursLabel,
  noticeLabel,
  useMyStylistProfile,
  useUpdateStylistProfile,
  type Availability,
} from '@/features/stylist';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { DateTimeField } from '@/shared/ui/DateTimeField';
import { notify } from '@/shared/ui/dialog';
import { IconButton } from '@/shared/ui/IconButton';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { dayKey, MonthCalendar } from '@/shared/ui/MonthCalendar';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';

// Monday first, the way she thinks about a week.
const DAYS = [
  { index: 1, name: 'Monday' },
  { index: 2, name: 'Tuesday' },
  { index: 3, name: 'Wednesday' },
  { index: 4, name: 'Thursday' },
  { index: 5, name: 'Friday' },
  { index: 6, name: 'Saturday' },
  { index: 0, name: 'Sunday' },
];

const useStyles = makeStyles(t => ({
  body: { gap: space.xl },
  hours: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  half: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: { paddingTop: space.lg },
  group: { gap: space.sm },
  own: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  ownNumber: { flex: 1 },
  sees: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: 20,
    backgroundColor: t.colors.accentSoft,
  },
}));

const PRESET_NOTICE: readonly number[] = NOTICE_CHOICES.map(c => c.hours);

const toDate = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};
const toTime = (date: Date) => format(date, 'HH:mm');

/**
 * When she works. Clients can only ask for days she's open, so her inbox fills
 * with requests she can actually say yes to.
 */
export default function AvailabilityScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data: profile, isLoading } = useMyStylistProfile();
  const update = useUpdateStylistProfile();
  const [draft, setDraft] = useState<Availability>(DEFAULT_AVAILABILITY);
  const [month, setMonth] = useState(new Date());
  // Her own notice, typed: a number and whether it's hours or days.
  const [own, setOwn] = useState<{ text: string; unit: 'hours' | 'days' } | null>(null);

  useEffect(() => {
    if (!profile?.availability) return;
    setDraft(profile.availability);
    const lead = profile.availability.leadHours;
    if (lead && !PRESET_NOTICE.includes(lead)) {
      setOwn(
        lead % 24
          ? { text: String(lead), unit: 'hours' }
          : { text: String(lead / 24), unit: 'days' }
      );
    }
  }, [profile?.availability]);

  const setOwnNotice = (text: string, unit: 'hours' | 'days') => {
    setOwn({ text, unit });
    const count = Number.parseInt(text, 10);
    const hours = count * (unit === 'days' ? 24 : 1);
    if (count > 0 && hours <= MAX_NOTICE_HOURS)
      setDraft(current => ({ ...current, leadHours: hours }));
  };
  const ownHours = own ? Number.parseInt(own.text, 10) * (own.unit === 'days' ? 24 : 1) : 0;
  const ownProblem =
    own && !(ownHours >= 1 && ownHours <= MAX_NOTICE_HOURS)
      ? 'Anything from an hour to 30 days'
      : undefined;

  const setDay = (index: number, hours: Availability['week'][number]) =>
    setDraft(current => {
      const week = [...current.week] as Availability['week'];
      week[index] = hours;
      return { ...current, week };
    });

  const toggleBlocked = (day: Date) => {
    const key = dayKey(day);
    haptics.selection();
    setDraft(current => ({
      ...current,
      blocked: current.blocked.includes(key)
        ? current.blocked.filter(d => d !== key)
        : [...current.blocked, key].sort(),
    }));
  };

  const save = async () => {
    if (ownProblem) return;
    try {
      await update.mutateAsync({ availability: draft });
      haptics.success();
      router.back();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t save your hours',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  if (isLoading) {
    return (
      <Screen title="Working hours" modal testID="availability">
        <Skeleton height={320} />
      </Screen>
    );
  }

  const upcoming = draft.blocked.filter(d => d >= dayKey(new Date()));
  const closed = (draft.closed ?? []).filter(d => d >= dayKey(new Date()));
  const ahead = draft.aheadDays ?? DEFAULT_AHEAD_DAYS;
  const lead = draft.leadHours ?? DEFAULT_NOTICE_HOURS;

  return (
    <Screen title="Working hours" modal testID="availability">
      <View style={styles.body}>
        <Text variant="body" tone="secondary">
          {hoursLabel(draft)}. Clients only see the days you’re open when they ask for a date.
        </Text>

        <Section title="Your week">
          {DAYS.map(({ index, name }) => {
            const hours = draft.week[index];
            return (
              <View key={index}>
                <ListRow
                  title={name}
                  subtitle={hours ? undefined : 'Closed'}
                  trailing={
                    <Toggle
                      value={!!hours}
                      onValueChange={on =>
                        setDay(index, on ? { start: '09:00', end: '18:00' } : null)
                      }
                      accessibilityLabel={`Open on ${name}`}
                    />
                  }
                />
                {hours && (
                  <View style={styles.hours}>
                    <View style={styles.half}>
                      <DateTimeField
                        title="From"
                        mode="time"
                        value={toDate(hours.start)}
                        onChange={d => setDay(index, { ...hours, start: toTime(d) })}
                      />
                    </View>
                    <View style={styles.half}>
                      <DateTimeField
                        title="Until"
                        mode="time"
                        value={toDate(hours.end)}
                        onChange={d => setDay(index, { ...hours, end: toTime(d) })}
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </Section>

        <View style={styles.group}>
          <Text variant="overline" tone="tertiary">
            Notice you need
          </Text>
          <View style={styles.chips}>
            {NOTICE_CHOICES.map(choice => (
              <Chip
                key={choice.hours}
                label={choice.label}
                selected={!own && lead === choice.hours}
                onPress={() => {
                  setOwn(null);
                  setDraft(current => ({ ...current, leadHours: choice.hours }));
                }}
              />
            ))}
            <Chip
              label="Your own"
              selected={!!own}
              onPress={() => setOwn(current => current ?? { text: '', unit: 'hours' })}
            />
          </View>
          {own && (
            <View style={styles.own}>
              <Input
                label={own.unit === 'days' ? 'Days' : 'Hours'}
                value={own.text}
                onChangeText={text => setOwnNotice(text.replace(/\D/g, ''), own.unit)}
                keyboardType="number-pad"
                maxLength={3}
                error={own.text ? ownProblem : undefined}
                containerStyle={styles.ownNumber}
                testID="availability-own-notice"
              />
              <View style={[styles.chips, { paddingTop: space.md }]}>
                <Chip
                  label="Hours"
                  selected={own.unit === 'hours'}
                  onPress={() => setOwnNotice(own.text, 'hours')}
                />
                <Chip
                  label="Days"
                  selected={own.unit === 'days'}
                  onPress={() => setOwnNotice(own.text, 'days')}
                />
              </View>
            </View>
          )}
          <Text variant="footnote" tone="secondary">
            Clients only see times at least {noticeLabel(lead).replace(' notice', '')} away. A
            request you haven’t answered lapses 2 hours before its time.
          </Text>
        </View>

        <View style={styles.group}>
          <Text variant="overline" tone="tertiary">
            How far ahead
          </Text>
          <View style={styles.chips}>
            {AHEAD_CHOICES.map(choice => (
              <Chip
                key={choice.days}
                label={choice.label}
                selected={ahead === choice.days}
                onPress={() => setDraft(current => ({ ...current, aheadDays: choice.days }))}
              />
            ))}
          </View>
          <Text variant="footnote" tone="secondary">
            Clients can book up to {format(addDays(new Date(), ahead - 1), 'EEEE d MMMM')}. One more
            day opens each morning, and anyone waiting for a later month hears when it does.
          </Text>
        </View>

        <View style={styles.group}>
          <Text variant="overline" tone="tertiary">
            Time between clients
          </Text>
          <View style={styles.chips}>
            {GAP_CHOICES.map(choice => (
              <Chip
                key={choice.minutes}
                label={choice.label}
                selected={(draft.gapMinutes ?? 0) === choice.minutes}
                onPress={() => setDraft(current => ({ ...current, gapMinutes: choice.minutes }))}
              />
            ))}
          </View>
          <Text variant="footnote" tone="secondary">
            Kept free after each appointment: to tidy up, take a breath, or get to the next client.
          </Text>
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="overline" tone="tertiary">
            Days off
          </Text>
          <Text variant="footnote" tone="secondary">
            Tap a day to block it — a holiday, a family day. Tap it again to open it.
          </Text>
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            selected={null}
            onSelect={toggleBlocked}
            marked={new Set(draft.blocked)}
          />
          {upcoming.length > 0 && (
            <Section>
              {upcoming.map(day => (
                <ListRow
                  key={day}
                  title={format(new Date(`${day}T12:00:00`), 'EEEE d MMMM')}
                  icon={CalendarOff}
                  iconTone="neutral"
                  trailing={
                    <IconButton
                      icon={X}
                      variant="plain"
                      size={32}
                      accessibilityLabel={`Open ${day} again`}
                      onPress={() => toggleBlocked(new Date(`${day}T12:00:00`))}
                    />
                  }
                />
              ))}
            </Section>
          )}
        </View>

        {closed.length > 0 && (
          <Section
            title="Closed to new bookings"
            footer="You have enough clients those days. What’s booked stays; tap the cross to take requests again."
          >
            {closed.map(day => (
              <ListRow
                key={day}
                title={format(new Date(`${day}T12:00:00`), 'EEEE d MMMM')}
                icon={CalendarX2}
                iconTone="neutral"
                trailing={
                  <IconButton
                    icon={X}
                    variant="plain"
                    size={32}
                    accessibilityLabel={`Take requests on ${day} again`}
                    onPress={() => {
                      haptics.selection();
                      setDraft(current => ({
                        ...current,
                        closed: (current.closed ?? []).filter(d => d !== day),
                      }));
                    }}
                  />
                }
              />
            ))}
          </Section>
        )}

        <View style={styles.sees}>
          <Text variant="callout" tone="accent">
            What clients see
          </Text>
          <Text variant="subhead">
            “{profile?.displayName ?? 'You'} works {hoursLabel(draft)}, {bookingRulesLabel(draft)}
            .”
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            label="Save"
            onPress={save}
            loading={update.isPending}
            fullWidth
            testID="availability-save"
          />
        </View>
      </View>
    </Screen>
  );
}
