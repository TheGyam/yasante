import { useState, type MouseEvent } from 'react';
import { BellRing, CalendarHeart, ChevronLeft, ChevronRight, Sun, Zap } from 'lucide-react';
import { hoursOn, type Availability } from '@/features/stylist';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { Glass } from '@/shared/ui/Glass';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { slotParts, zoneMark } from '../format';
import { useFreeSlots } from '../hooks';
import {
  daysBefore,
  monthOf,
  monthSpan,
  monthWeeks,
  passes,
  reachableMonths,
  readyBy,
  roomIndex,
  sayDay,
  shiftDay,
  shiftMonth,
  type DayFilter,
} from '../picker';
import type { FreeSlots, SlotQuery } from '../types';
import * as styles from './SlotPicker.css';

/** Pixels per minute on the day's timeline: a ten-hour day is 360 tall. */
const SCALE = 0.6;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FILTERS: { value: DayFilter; label: string }[] = [
  { value: 'any', label: 'Any day' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'weekdays', label: 'Weekdays' },
];
// When the day is split, so a long list of times reads at a glance.
const PARTS = [
  { name: 'Morning', until: 12 },
  { name: 'Afternoon', until: 17 },
  { name: 'Evening', until: 24 },
];
const WORDS = {
  plenty: 'plenty of times',
  few: 'a few times left',
  full: 'fully booked',
  away: 'away',
  none: 'no times',
};

const toMinutes = (clock: string) => {
  const [h, m] = clock.split(':').map(Number);
  return h * 60 + m;
};
const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const minutesOf = (iso: string, zone?: string) => toMinutes(slotParts(iso, zone).time);
const short = (day: string) => sayDay(day, { weekday: 'short', day: 'numeric', month: 'short' });

export interface SlotPickerProps {
  /** Whose times, for which job (or which appointment being moved). */
  query: SlotQuery;
  stylistName: string;
  /** Her week: the day's hours on the timeline. */
  availability?: Availability;
  /** Her zone, before the first answer says it. */
  timeZone?: string;
  /** The chosen start time, as ISO. */
  value?: string;
  onChange: (iso: string | undefined) => void;
  /** A day to open on, yyyy-MM-dd: a slot someone was told about. */
  initialDay?: string;
  /** Being told when a time opens on these days; without it, no such offer. */
  onWatch?: (from: string, to: string) => Promise<unknown>;
}

/**
 * Choosing a time, as the app does (src/features/booking/components/SlotPicker.tsx):
 * ideas first, then months that show at a glance how much room each day has (two side
 * by side once there's space), then the day drawn as a timeline with the appointment on
 * it. Only real openings, on her clock; the server checks the one picked again.
 */
export function SlotPicker({
  query,
  stylistName,
  availability,
  timeZone,
  value,
  onChange,
  initialDay,
  onWatch,
}: SlotPickerProps) {
  // Today on her calendar, as of when the picker opened.
  const [today] = useState(() => slotParts(new Date().toISOString(), timeZone).day);
  const startDay = value ? slotParts(value, timeZone).day : initialDay;
  const [month, setMonth] = useState(() => monthOf(startDay ?? today));
  const [picked, setPicked] = useState(startDay);
  const [filter, setFilter] = useState<DayFilter>('any');
  const [event, setEvent] = useState('');
  const [told, setTold] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);

  const span = monthSpan(month);
  const slots = useFreeSlots(query, span.from, span.to);
  const data = slots.data;
  const zone = data?.timeZone ?? timeZone;
  const reach = reachableMonths(today, data?.lastDate);
  const lastMonth = reach[reach.length - 1];
  const nextMonth = shiftMonth(month, 1);
  const nextSpan = monthSpan(nextMonth);
  // The month beside it on a wide screen, and the next page anywhere: asked for now.
  const beside = useFreeSlots(query, nextSpan.from, nextSpan.to, month < lastMonth);
  const around = useFreeSlots(
    query,
    event ? shiftDay(event, -daysBefore(event).length) : undefined,
    event ? shiftDay(event, -1) : undefined,
    !!event
  );
  const best = event ? readyBy(event, around.data) : undefined;
  const ringed = new Set(event ? daysBefore(event) : []);

  const choose = (iso: string) => {
    const day = slotParts(iso, zone).day;
    setMonth(monthOf(day));
    setPicked(day);
    onChange(iso);
  };
  const ask = async (key: string, from: string, to: string) => {
    if (!onWatch) return;
    setAsking(true);
    try {
      // Noon UTC is the same date on her calendar, wherever she is.
      await onWatch(`${from}T12:00:00.000Z`, `${to}T12:00:00.000Z`);
      setTold(current => [...current, key]);
    } catch {
      // Not on the list: whoever asked shows why (a sign-in page, an error).
    } finally {
      setAsking(false);
    }
  };
  const pickDay = (day: string) => {
    if (day === picked) return;
    setPicked(day);
    // A time belongs to its day: another day starts without one.
    if (value) onChange(undefined);
  };

  if (!data) {
    return (
      <div className={styles.body}>
        <div className={styles.skeletons}>
          {[0, 1, 2].map(i => (
            <Skeleton key={i} style={{ height: 92, borderRadius: 20 }} />
          ))}
        </div>
        <Skeleton style={{ height: 320, borderRadius: 20 }} />
      </div>
    );
  }

  const lastDate = data.lastDate;
  const ideas = [
    { key: 'soonest', title: 'Soonest', Icon: Zap, at: data.soonest },
    { key: 'weekend', title: 'A weekend', Icon: Sun, at: data.weekend },
  ];
  const shown: { month: string; data?: FreeSlots }[] = [{ month, data }];
  if (month < lastMonth) shown.push({ month: nextMonth, data: beside.data });

  const renderMonth = (m: string, monthData: FreeSlots | undefined, index: number) => {
    const rooms = roomIndex(monthData);
    return (
      <div key={m} className={`${styles.month} ${index ? styles.second : ''}`}>
        <Text variant="callout" as="h3">
          {sayDay(`${m}-01`, { month: 'long', year: 'numeric' })}
        </Text>
        <div className={styles.week} aria-hidden>
          {WEEKDAYS.map((label, i) => (
            <span key={i} className={styles.weekday}>
              {label}
            </span>
          ))}
        </div>
        {monthWeeks(m).map(week => (
          <div key={week.find(Boolean)} className={styles.week}>
            {week.map((day, i) => {
              if (!day) return <span key={i} />;
              const room = passes(day, filter) ? (rooms.get(day) ?? 'none') : 'none';
              const on = day === picked;
              const open = room === 'plenty' || room === 'few';
              const tappable = open || room === 'full';
              const label = `${sayDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}, ${
                room === 'none' && lastDate && day > lastDate
                  ? 'not open for booking yet'
                  : WORDS[room]
              }${day === event ? ', your day' : ''}`;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={!tappable}
                  aria-pressed={on}
                  aria-label={label}
                  title={label}
                  onClick={() => pickDay(day)}
                  className={[
                    styles.day,
                    open && styles.dayState.open,
                    room === 'full' && styles.dayState.full,
                    ringed.has(day) && !on && styles.dayState.before,
                    day === event && styles.dayState.event,
                    on && styles.dayState.on,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {Number(day.slice(8))}
                  <span
                    className={[
                      styles.bar,
                      room === 'plenty' && styles.barRoom.plenty,
                      room === 'few' && styles.barRoom.few,
                      on && open && styles.barRoom.on,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.body}>
      <div className={styles.ideas}>
        {ideas.map(({ key, title, Icon, at }) => (
          <button
            key={key}
            type="button"
            className={styles.idea}
            disabled={!at}
            aria-pressed={!!at && at === value}
            onClick={() => at && choose(at)}
          >
            <Icon size={18} strokeWidth={2.2} className={styles.ideaIcon} aria-hidden />
            <Text variant="overline" tone="tertiary">
              {title}
            </Text>
            <Text variant="callout">{at ? short(slotParts(at, zone).day) : 'Nothing free'}</Text>
            {!!at && (
              <Text variant="footnote" tone="secondary">
                {slotParts(at, zone).time}
              </Text>
            )}
          </button>
        ))}
        <label className={`${styles.idea} ${styles.readyIdea}`} data-on={!!event}>
          <CalendarHeart size={18} strokeWidth={2.2} className={styles.ideaGold} aria-hidden />
          <Text variant="overline" tone="tertiary">
            Ready by
          </Text>
          <Text variant="footnote" tone="secondary">
            The day you need it for
          </Text>
          <input
            type="date"
            aria-label="The day you need it done for"
            className={styles.dateInput}
            min={shiftDay(today, 1)}
            value={event}
            onChange={e => {
              setEvent(e.target.value);
              if (e.target.value) setMonth(monthOf(shiftDay(e.target.value, -1)));
            }}
          />
        </label>
      </div>

      {!!event && (
        <div className={styles.hint} aria-live="polite">
          <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
            {best
              ? `Best fit: ${sayDay(best.day, { weekday: 'long', day: 'numeric', month: 'short' })} at ${slotParts(best.time, zone).time}. The days just before yours are ringed.`
              : around.isPending
                ? 'Looking at the days before it…'
                : `Nothing free in the ${daysBefore(event).length} days before it. Try another date, or pick any time below.`}
          </Text>
          {!!best && best.time !== value && (
            <Button
              label="Take it"
              size="sm"
              variant="secondary"
              onClick={() => choose(best.time)}
            />
          )}
          <Button label="Clear" size="sm" variant="ghost" onClick={() => setEvent('')} />
        </div>
      )}

      <Glass className={`${styles.card} ${slots.isPlaceholderData ? styles.dim : ''}`}>
        <div className={styles.header}>
          <div className={styles.filters} role="group" aria-label="Which days">
            {FILTERS.map(f => (
              <Chip
                key={f.value}
                label={f.label}
                selected={filter === f.value}
                onClick={() => setFilter(f.value)}
              />
            ))}
          </div>
          <div className={styles.nav}>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Previous month"
              disabled={month <= reach[0]}
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft size={20} aria-hidden />
            </button>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Next month"
              disabled={month >= lastMonth}
              onClick={() => setMonth(nextMonth)}
            >
              <ChevronRight size={20} aria-hidden />
            </button>
          </div>
        </div>
        <div className={styles.months}>{shown.map((s, i) => renderMonth(s.month, s.data, i))}</div>
        <Text variant="caption" tone="tertiary">
          A long bar is plenty of times, a short one a few left.
        </Text>
      </Glass>

      {!data.soonest && (
        <div className={styles.banner}>
          <Text variant="callout">{stylistName} is fully booked for now.</Text>
          {!!onWatch && (
            <Button
              label={
                told.includes('any') ? 'We’ll tell you if a time opens' : 'Tell me if a time opens'
              }
              icon={BellRing}
              variant="secondary"
              size="md"
              disabled={told.includes('any') || asking}
              onClick={() => ask('any', today, lastDate ?? shiftDay(today, 83))}
            />
          )}
        </div>
      )}
      {!!data.soonest && !!lastDate && shown.some(s => s.month === lastMonth) && (
        <div className={styles.banner}>
          <Text variant="callout">
            {stylistName} takes bookings up to{' '}
            {sayDay(lastDate, { weekday: 'long', day: 'numeric', month: 'long' })}. One more day
            opens each morning.
          </Text>
          {!!onWatch && (
            <Button
              label={
                told.includes('later')
                  ? 'We’ll tell you when it opens'
                  : `Tell me when ${sayDay(shiftDay(lastDate, 1), { month: 'long' })} opens`
              }
              icon={BellRing}
              variant="secondary"
              size="md"
              disabled={told.includes('later') || asking}
              onClick={() => ask('later', shiftDay(lastDate, 1), shiftDay(lastDate, 31))}
            />
          )}
        </div>
      )}

      {!!picked && (
        <Day
          key={picked}
          day={picked}
          slots={picked >= nextSpan.from && beside.data ? beside.data : data}
          zone={zone}
          availability={availability}
          value={value}
          onChange={onChange}
          toldFree={told.includes(picked)}
          asking={asking}
          onAskFree={onWatch ? () => ask(picked, picked, picked) : undefined}
        />
      )}
    </div>
  );
}

interface DayProps {
  day: string;
  slots: FreeSlots;
  zone?: string;
  availability?: Availability;
  value?: string;
  onChange: (iso: string) => void;
  toldFree: boolean;
  asking: boolean;
  onAskFree?: () => void;
}

/** The day drawn out: her hours, what's booked, and the appointment where it'd sit. */
function Day({
  day,
  slots,
  zone,
  availability,
  value,
  onChange,
  toldFree,
  asking,
  onAskFree,
}: DayProps) {
  const free = slots.days.find(d => d.date === day);
  const times = free?.times ?? [];
  const busy = free?.busy ?? [];
  const minutes = slots.minutes;
  const at = (iso: string) => minutesOf(iso, zone);
  const title = sayDay(day, { weekday: 'long', day: 'numeric', month: 'long' });

  if (!times.length) {
    return (
      <div className={styles.part}>
        <Text variant="title3" as="h3">
          {title}
        </Text>
        <Text variant="subhead" tone="secondary">
          Fully booked.{onAskFree ? ' If a time frees up, you can be the first to know.' : ''}
        </Text>
        {!!onAskFree && (
          <div>
            <Button
              label={toldFree ? 'We’ll tell you if one opens' : 'Tell me if a time opens'}
              icon={BellRing}
              variant="secondary"
              size="md"
              disabled={toldFree || asking}
              onClick={onAskFree}
            />
          </div>
        )}
      </div>
    );
  }

  // Her hours that day, stretched to anything that runs past them.
  const hours = hoursOn(availability, day);
  const starts = times.map(at);
  let open = hours ? toMinutes(hours.start) : Math.min(...starts);
  let close = hours ? toMinutes(hours.end) : starts[starts.length - 1] + minutes;
  for (const b of busy) {
    open = Math.min(open, at(b.start));
    close = Math.max(close, at(b.end) || 24 * 60);
  }
  close = Math.max(close, starts[starts.length - 1] + minutes);
  open = Math.floor(open / 60) * 60;
  close = Math.ceil(close / 60) * 60;
  const height = (close - open) * SCALE;
  const chosen = value && times.includes(value) ? at(value) : undefined;
  const marks = Array.from({ length: (close - open) / 60 + 1 }, (_, i) => open + i * 60);

  // A click on the timeline starts the appointment at the nearest time free to there.
  const clickAt = (e: MouseEvent<HTMLDivElement>) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const wanted = open + y / SCALE - minutes / 2;
    const nearest = times.reduce((a, b) =>
      Math.abs(at(b) - wanted) < Math.abs(at(a) - wanted) ? b : a
    );
    if (nearest !== value) onChange(nearest);
  };

  return (
    <div className={styles.body}>
      <div>
        <Text variant="title3" as="h3">
          {title}
        </Text>
        <Text variant="footnote" tone="secondary">
          {hours ? `${hours.start}–${hours.end}` : ''}
          {chosen !== undefined
            ? `${hours ? ' · ' : ''}You’d be there ${clock(chosen)} to ${clock(chosen + minutes)}`
            : `${hours ? ' · ' : ''}Pick a time, or click a free part of the day`}
        </Text>
      </div>

      <div className={styles.timeline} aria-hidden>
        <div className={styles.hours} style={{ height }}>
          {marks.map(m => (
            <span
              key={m}
              className={styles.hourLabel}
              style={{ top: Math.min(Math.max(0, (m - open) * SCALE - 8), height - 16) }}
            >
              {clock(m)}
            </span>
          ))}
        </div>
        <div className={styles.track} style={{ height }} onClick={clickAt}>
          {marks.slice(1, -1).map(m => (
            <span key={m} className={styles.line} style={{ top: (m - open) * SCALE }} />
          ))}
          {busy.map(b => {
            const from = Math.max(open, at(b.start));
            const to = Math.min(close, at(b.end) || 24 * 60);
            return (
              <span
                key={b.start}
                className={`${styles.block} ${b.mine ? styles.mine : ''}`}
                style={{
                  top: (from - open) * SCALE + 2,
                  height: Math.max(12, (to - from) * SCALE - 4),
                }}
              >
                {b.mine ? 'Yours' : 'Booked'} {clock(from)}–{clock(to)}
              </span>
            );
          })}
          {chosen !== undefined && (
            <span
              className={styles.you}
              style={{
                height: Math.max(28, minutes * SCALE - 4),
                transform: `translateY(${(chosen - open) * SCALE}px)`,
              }}
            >
              <span className={styles.youName}>You</span>
              <span>
                {clock(chosen)} → {clock(chosen + minutes)}
              </span>
            </span>
          )}
        </div>
      </div>

      {PARTS.map((part, index) => {
        const from = index ? PARTS[index - 1].until : 0;
        const list = times.filter(t => {
          const { hour } = slotParts(t, zone);
          return hour >= from && hour < part.until;
        });
        if (!list.length) return null;
        return (
          <div key={part.name} className={styles.part}>
            <Text variant="overline" tone="tertiary">
              {part.name}
            </Text>
            <div className={styles.times}>
              {list.map(time => (
                <Chip
                  key={time}
                  label={slotParts(time, zone).time}
                  selected={value === time}
                  onClick={() => onChange(time)}
                />
              ))}
            </div>
          </div>
        );
      })}
      {!!zoneMark(zone) && (
        <Text variant="footnote" tone="tertiary">
          Times are in{zoneMark(zone)}, where the appointment is.
        </Text>
      )}
    </div>
  );
}
