import { useState } from 'react';
import { X } from 'lucide-react';
import { errorMessage } from '@/shared/lib/errors';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Chip } from '@/shared/ui/Chip';
import { Glass } from '@/shared/ui/Glass';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Page } from '@/shared/ui/Page';
import { Text } from '@/shared/ui/Text';
import { fromSalonInput, toSalonInput, whenLabel } from '@/shared/lib/salonTime';
import {
  useAddTimeBlock,
  useRemoveTimeBlock,
  useSkipTimeBlock,
  useTimeBlocks,
  useUpdateProfile,
} from '../hooks';
import {
  AHEAD_CHOICES,
  DEFAULT_AHEAD_DAYS,
  DEFAULT_NOTICE_HOURS,
  GAP_CHOICES,
  MAX_NOTICE_HOURS,
  NOTICE_CHOICES,
  bookingRulesLabel,
  hoursLabel,
  noticeLabel,
  nextOccurrences,
  repeatChoices,
  repeatLabel,
} from '../format';
import type { Availability, StylistProfile } from '../types';
import * as styles from './StudioScreens.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Monday first, the way people say a week. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const NINE_TO_SIX = { start: '09:00', end: '18:00' };

/** The app's starting point: Tuesday to Saturday, nine to six. */
const DEFAULT: Availability = {
  week: [null, null, NINE_TO_SIX, NINE_TO_SIX, NINE_TO_SIX, NINE_TO_SIX, NINE_TO_SIX],
  blocked: [],
};

const PRESET_NOTICE: readonly number[] = NOTICE_CHOICES.map(c => c.hours);
type Own = { text: string; unit: 'hours' | 'days' };
/** Her own notice, as she'd type it again: whole days when it is some. */
const ownFrom = (lead?: number): Own | null =>
  !lead || PRESET_NOTICE.includes(lead)
    ? null
    : lead % 24
      ? { text: String(lead), unit: 'hours' }
      : { text: String(lead / 24), unit: 'days' };

/**
 * Her week, how much notice she needs, how far ahead and with what gap she's booked,
 * and the days she's away or full. Clients only see times inside these.
 */
export function HoursScreen({
  accountId,
  profile,
}: {
  accountId: string;
  profile: StylistProfile;
}) {
  const save = useUpdateProfile(accountId);
  const [hours, setHours] = useState<Availability>(() =>
    profile.availability?.week?.length === 7 ? profile.availability : DEFAULT
  );
  const [away, setAway] = useState('');
  const [own, setOwnState] = useState<Own | null>(() => ownFrom(profile.availability?.leadHours));
  const setOwn = (next: Own) => {
    setOwnState(next);
    const hours = Number.parseInt(next.text, 10) * (next.unit === 'days' ? 24 : 1);
    if (hours >= 1 && hours <= MAX_NOTICE_HOURS) setHours(h => ({ ...h, leadHours: hours }));
  };
  const ownHours = own ? Number.parseInt(own.text, 10) * (own.unit === 'days' ? 24 : 1) : 0;
  const badOwn = !!own && !(ownHours >= 1 && ownHours <= MAX_NOTICE_HOURS);
  const lead = hours.leadHours ?? DEFAULT_NOTICE_HOURS;
  const ahead = hours.aheadDays ?? DEFAULT_AHEAD_DAYS;
  const setDay = (day: number, value: Availability['week'][number]) =>
    setHours(h => ({
      ...h,
      week: h.week.map((d, i) => (i === day ? value : d)) as Availability['week'],
    }));

  const badTimes = hours.week.some(d => d && d.start >= d.end);
  const today = new Date().toISOString().slice(0, 10);
  const lastDay = new Date(Date.parse(`${today}T12:00:00Z`) + (ahead - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const closed = (hours.closed ?? []).filter(d => d >= today);

  return (
    <Page title="Working hours">
      <div className={styles.form}>
        <div>
          <Text variant="title1">Working hours</Text>
          <Text variant="subhead" tone="secondary">
            {hoursLabel(hours) ?? 'Your week'}. Clients can only ask for times inside these.
          </Text>
        </div>
        <Glass padded radius="xl" className={styles.card}>
          {ORDER.map(day => {
            const open = hours.week[day];
            return (
              <div key={day} className={styles.day}>
                <Checkbox checked={!!open} onChange={on => setDay(day, on ? NINE_TO_SIX : null)}>
                  <Text variant="callout" as="span">
                    {DAYS[day]}
                  </Text>
                </Checkbox>
                {open ? (
                  <>
                    <Input
                      label="From"
                      type="time"
                      step={1800}
                      value={open.start}
                      onChange={e => setDay(day, { ...open, start: e.target.value })}
                    />
                    <Input
                      label="Until"
                      type="time"
                      step={1800}
                      value={open.end}
                      error={open.start >= open.end ? 'After the start' : undefined}
                      onChange={e => setDay(day, { ...open, end: e.target.value })}
                    />
                  </>
                ) : (
                  <Text variant="footnote" tone="tertiary">
                    Not working
                  </Text>
                )}
              </div>
            );
          })}
        </Glass>

        <BlockedTime accountId={accountId} timeZone={profile.timeZone} />

        <Glass padded radius="xl" className={styles.card}>
          <Text variant="overline" tone="tertiary" as="h2">
            Notice you need
          </Text>
          <div className={styles.chips}>
            {NOTICE_CHOICES.map(choice => (
              <Chip
                key={choice.hours}
                label={choice.label}
                selected={!own && lead === choice.hours}
                onClick={() => {
                  setOwnState(null);
                  setHours(h => ({ ...h, leadHours: choice.hours }));
                }}
              />
            ))}
            <Chip
              label="Your own"
              selected={!!own}
              onClick={() => setOwnState(current => current ?? { text: '', unit: 'hours' })}
            />
          </div>
          {own && (
            <div className={styles.option}>
              <Input
                label={own.unit === 'days' ? 'Days' : 'Hours'}
                inputMode="numeric"
                maxLength={3}
                value={own.text}
                error={own.text && badOwn ? 'Anything from an hour to 30 days' : undefined}
                onChange={e => setOwn({ ...own, text: e.target.value.replace(/\D/g, '') })}
              />
              <span />
              <div className={styles.chips}>
                <Chip
                  label="Hours"
                  selected={own.unit === 'hours'}
                  onClick={() => setOwn({ ...own, unit: 'hours' })}
                />
                <Chip
                  label="Days"
                  selected={own.unit === 'days'}
                  onClick={() => setOwn({ ...own, unit: 'days' })}
                />
              </div>
            </div>
          )}
          <Text variant="footnote" tone="secondary">
            Clients only see times at least {noticeLabel(lead).replace(' notice', '')} away. A
            request you haven’t answered lapses 2 hours before its time.
          </Text>
        </Glass>

        <Glass padded radius="xl" className={styles.card}>
          <Text variant="overline" tone="tertiary" as="h2">
            How far ahead
          </Text>
          <div className={styles.chips}>
            {AHEAD_CHOICES.map(choice => (
              <Chip
                key={choice.days}
                label={choice.label}
                selected={ahead === choice.days}
                onClick={() => setHours(h => ({ ...h, aheadDays: choice.days }))}
              />
            ))}
          </div>
          <Text variant="footnote" tone="secondary">
            Clients can book up to {formatDate(lastDay)}. One more day opens each morning, and
            anyone waiting for a later month hears when it does.
          </Text>
        </Glass>

        <Glass padded radius="xl" className={styles.card}>
          <Text variant="overline" tone="tertiary" as="h2">
            Time between clients
          </Text>
          <div className={styles.chips}>
            {GAP_CHOICES.map(choice => (
              <Chip
                key={choice.minutes}
                label={choice.label}
                selected={(hours.gapMinutes ?? 0) === choice.minutes}
                onClick={() => setHours(h => ({ ...h, gapMinutes: choice.minutes }))}
              />
            ))}
          </div>
          <Text variant="footnote" tone="secondary">
            Kept free after each appointment: to tidy up, take a breath, or get to the next client.
          </Text>
        </Glass>

        <Glass padded radius="xl" className={styles.card}>
          <Text variant="overline" tone="tertiary" as="h2">
            Days you’re away
          </Text>
          <div className={styles.option}>
            <Input
              label="A day off"
              type="date"
              min={today}
              value={away}
              onChange={e => setAway(e.target.value)}
            />
            <span />
            <Button
              label="Add"
              variant="secondary"
              size="md"
              disabled={!away || hours.blocked.includes(away)}
              onClick={() => {
                setHours(h => ({ ...h, blocked: [...h.blocked, away].sort() }));
                setAway('');
              }}
            />
          </div>
          {hours.blocked.filter(d => d >= today).length > 0 && (
            <div className={styles.chips}>
              {hours.blocked
                .filter(d => d >= today)
                .map(d => (
                  <Chip
                    key={d}
                    label={formatDate(d)}
                    icon={X}
                    onClick={() =>
                      setHours(h => ({ ...h, blocked: h.blocked.filter(b => b !== d) }))
                    }
                  />
                ))}
            </div>
          )}
        </Glass>

        {closed.length > 0 && (
          <Glass padded radius="xl" className={styles.card}>
            <Text variant="overline" tone="tertiary" as="h2">
              Closed to new bookings
            </Text>
            <div className={styles.chips}>
              {closed.map(d => (
                <Chip
                  key={d}
                  label={formatDate(d)}
                  icon={X}
                  onClick={() =>
                    setHours(h => ({ ...h, closed: (h.closed ?? []).filter(c => c !== d) }))
                  }
                />
              ))}
            </div>
            <Text variant="footnote" tone="secondary">
              You have enough clients those days. What’s booked stays; remove a day to take requests
              for it again.
            </Text>
          </Glass>
        )}

        <Glass padded radius="xl" className={styles.card}>
          <Text variant="callout" tone="accent" as="h2">
            What clients see
          </Text>
          <Text variant="subhead">
            “{profile.displayName} works {hoursLabel(hours)}, {bookingRulesLabel(hours)}.”
          </Text>
        </Glass>

        {save.isError && (
          <InlineAlert message={errorMessage(save.error, 'Couldn’t save your hours.')} />
        )}
        {save.isSuccess && !save.isPending && <InlineAlert tone="success" message="Saved." />}
        <div>
          <Button
            label="Save hours"
            disabled={badTimes || badOwn}
            loading={save.isPending}
            onClick={() =>
              save.mutate({
                // Past days off are dropped: they can't block anything any more.
                availability: { ...hours, blocked: hours.blocked.filter(d => d >= today), closed },
              })
            }
          />
        </div>
      </div>
    </Page>
  );
}

/**
 * Part of a day taken out of her diary: a client booked elsewhere, a school run. Saved
 * as she adds it. Clients see it as booked; only she sees the note.
 */
function BlockedTime({ accountId, timeZone }: { accountId: string; timeZone?: string }) {
  const { data: blocks = [] } = useTimeBlocks(accountId);
  const add = useAddTimeBlock(accountId);
  const remove = useRemoveTimeBlock(accountId);
  const skip = useSkipTimeBlock(accountId);
  const [day, setDay] = useState('');
  const [from, setFrom] = useState('10:00');
  const [until, setUntil] = useState('12:00');
  const [note, setNote] = useState('');
  // Once, every day, weekdays, or every week on the day picked.
  const [repeat, setRepeat] = useState(0);
  const repeats = repeatChoices(day ? new Date(`${day}T12:00:00Z`).getUTCDay() : 1);
  const [today] = useState(() => toSalonInput(new Date(), timeZone).slice(0, 10));
  const backwards = !!from && !!until && until <= from;

  return (
    <Glass padded radius="xl" className={styles.card}>
      <Text variant="overline" tone="tertiary" as="h2">
        Time blocked out
      </Text>
      <Text variant="footnote" tone="secondary">
        A client booked elsewhere, a school run, a long lunch: clients see it as booked, and nothing
        can land on it. Only you see the note.
      </Text>
      <div className={styles.option}>
        <Input
          label="Day"
          type="date"
          min={today}
          value={day}
          onChange={e => setDay(e.target.value)}
        />
        <Input
          label="From"
          type="time"
          step={900}
          value={from}
          onChange={e => setFrom(e.target.value)}
        />
        <Input
          label="Until"
          type="time"
          step={900}
          value={until}
          error={backwards ? 'After the start' : undefined}
          onChange={e => setUntil(e.target.value)}
        />
      </div>
      <div className={styles.chips} role="group" aria-label="Repeats">
        {repeats.map((choice, index) => (
          <Chip
            key={choice.label}
            label={choice.label}
            selected={repeat === index}
            onClick={() => setRepeat(index)}
          />
        ))}
      </div>
      <Input
        label="Note for you (optional)"
        maxLength={100}
        placeholder="Private client"
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      {add.isError && <InlineAlert message={errorMessage(add.error, 'Couldn’t block that out.')} />}
      <div>
        <Button
          label="Block it out"
          variant="secondary"
          size="md"
          disabled={!day || !from || !until || backwards}
          loading={add.isPending}
          onClick={() =>
            add.mutate(
              {
                start: fromSalonInput(`${day}T${from}`, timeZone),
                end: fromSalonInput(`${day}T${until}`, timeZone),
                note: note.trim() || undefined,
                repeats: repeats[repeat].days,
              },
              {
                onSuccess: () => {
                  setNote('');
                  setRepeat(0);
                },
              }
            )
          }
        />
      </div>
      {blocks.length > 0 && (
        <div className={styles.chips}>
          {blocks.map(block => (
            <Chip
              key={block.id}
              label={`${
                block.repeats.length
                  ? `${repeatLabel(block.repeats)}, ${toSalonInput(block.start, timeZone).slice(11)}`
                  : whenLabel(block.start, timeZone)
              }–${toSalonInput(block.end, timeZone).slice(11)}${block.note ? ` · ${block.note}` : ''}`}
              icon={X}
              onClick={() => remove.mutate(block.id)}
            />
          ))}
        </div>
      )}
      {blocks
        .filter(block => block.repeats.length)
        .map(block => (
          <div key={block.id} className={styles.card}>
            <Text variant="footnote" tone="secondary">
              {block.note || repeatLabel(block.repeats)}: click a day to skip it, again to put it
              back
            </Text>
            <div className={styles.chips} role="group" aria-label="Days it lands on">
              {nextOccurrences(block.repeats, today).map(day => {
                const skipped = block.skips.includes(day);
                return (
                  <Chip
                    key={day}
                    label={`${new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric' })}${skipped ? ' · skipped' : ''}`}
                    selected={!skipped}
                    onClick={() => skip.mutate({ id: block.id, date: day, skip: !skipped })}
                  />
                );
              })}
            </div>
          </div>
        ))}
      {skip.isError && (
        <InlineAlert message={errorMessage(skip.error, 'Couldn’t change that day.')} />
      )}
    </Glass>
  );
}
