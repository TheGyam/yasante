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
import { useUpdateProfile } from '../hooks';
import { hoursLabel } from '../format';
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

/** Her week, and the days she's away. Clients only see times inside these. */
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
  const setDay = (day: number, value: Availability['week'][number]) =>
    setHours(h => ({
      ...h,
      week: h.week.map((d, i) => (i === day ? value : d)) as Availability['week'],
    }));

  const badTimes = hours.week.some(d => d && d.start >= d.end);
  const today = new Date().toISOString().slice(0, 10);

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

        {save.isError && (
          <InlineAlert message={errorMessage(save.error, 'Couldn’t save your hours.')} />
        )}
        {save.isSuccess && !save.isPending && <InlineAlert tone="success" message="Saved." />}
        <div>
          <Button
            label="Save hours"
            disabled={badTimes}
            loading={save.isPending}
            onClick={() =>
              save.mutate({
                // Past days off are dropped: they can't block anything any more.
                availability: { ...hours, blocked: hours.blocked.filter(d => d >= today) },
              })
            }
          />
        </div>
      </div>
    </Page>
  );
}
