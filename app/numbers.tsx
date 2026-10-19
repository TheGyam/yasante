import { View } from 'react-native';
import { format } from 'date-fns';
import { Timer } from 'lucide-react-native';
import {
  formatDuration,
  useMyCurrency,
  useStylistNumbers,
  type ServiceTiming,
  type WeekCounts,
} from '@/features/stylist';
import { formatMoney, formatMoneyList } from '@/shared/lib/format';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Rise } from '@/shared/ui/Rise';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const TILES: {
  key: Exclude<keyof WeekCounts, 'earnings'>;
  label: string;
  money?: boolean;
  lowerIsBetter?: boolean;
}[] =
  [
    { key: 'views', label: 'Page views' },
    { key: 'requests', label: 'Requests' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'completed', label: 'Done' },
    { key: 'noShows', label: 'No-shows', lowerIsBetter: true },
    { key: 'earned', label: 'Paid', money: true },
  ];

/** A service worth re-quoting: it runs half an hour or more away from what she says. */
const OFF_BY = 30;

const useStyles = makeStyles(t => ({
  body: { gap: space.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '48.5%' },
  tileInner: { gap: 2 },
  timing: { gap: space.sm },
  bar: { flexDirection: 'row', height: 6, borderRadius: radius.pill, overflow: 'hidden', gap: 2 },
  early: { backgroundColor: t.colors.accentSoft },
  onTime: { backgroundColor: t.colors.success },
  over: { backgroundColor: t.colors.gold },
}));

function change(
  now: number,
  before: number,
  currency: string,
  money?: boolean,
  lowerIsBetter?: boolean
) {
  if (now === before) return { text: 'Same as last week', tone: 'tertiary' as const };
  const diff = now - before;
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  const amount = money ? formatMoney(Math.abs(diff), currency) : String(Math.abs(diff));
  return {
    text: `${diff > 0 ? '+' : '−'}${amount} on last week`,
    tone: better ? ('success' as const) : ('secondary' as const),
  };
}

/**
 * Her week, and how her services really run. The timing view is hers alone and
 * has no threshold: it's there to make her quotes true, not to judge her.
 */
export default function NumbersScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useStylistNumbers();
  const currency = useMyCurrency();

  const timingRow = (t: ServiceTiming) => {
    const off =
      t.quotedMinutes && t.typicalMinutes ? t.typicalMinutes - t.quotedMinutes : undefined;
    const worthUpdating = off !== undefined && Math.abs(off) >= OFF_BY;
    return (
      <Card key={t.serviceId}>
        <View style={styles.timing}>
          <Text variant="bodyStrong">{t.serviceName}</Text>
          <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no">
            {t.early > 0 && <View style={[styles.early, { flex: t.early }]} />}
            {t.onTime > 0 && <View style={[styles.onTime, { flex: t.onTime }]} />}
            {t.over > 0 && <View style={[styles.over, { flex: t.over }]} />}
          </View>
          <Text variant="footnote" tone="secondary">
            {[
              t.onTime && `${t.onTime} on time`,
              t.early && `${t.early} early`,
              t.over && `${t.over} over`,
            ]
              .filter(Boolean)
              .join(' · ')}{' '}
            — from {t.sample} {t.sample === 1 ? 'appointment' : 'appointments'}
          </Text>
          {worthUpdating && (
            <>
              <Text variant="callout">
                It usually runs {formatDuration(t.typicalMinutes!)}, but you quote{' '}
                {formatDuration(t.quotedMinutes!)}.
              </Text>
              <Button
                label="Update your estimate"
                variant="secondary"
                size="sm"
                onPress={() => router.push(`/menu/${t.serviceId}`)}
              />
            </>
          )}
          {t.clientSide > 0 && (
            <Text variant="caption" tone="tertiary">
              {t.clientSide} of the overruns were down to the client — worth a line in your prep
              notes.
            </Text>
          )}
        </View>
      </Card>
    );
  };

  return (
    <Screen
      title="Your numbers"
      back
      refreshing={isRefetching}
      onRefresh={refetch}
      testID="stylist-numbers"
    >
      {isLoading || !data ? (
        <Skeleton height={320} />
      ) : (
        <View style={styles.body}>
          <Text variant="subhead" tone="secondary">
            Week of {format(new Date(data.weekOf), 'd MMMM')}
          </Text>

          <View style={styles.grid}>
            {TILES.map((tile, index) => {
              const now = data.thisWeek[tile.key];
              // Paid in more than her own currency this week: each on its own, never added.
              const earnings = data.thisWeek.earnings ?? [];
              const shown = !tile.money
                ? String(now)
                : earnings.length > 1 || (earnings.length === 1 && earnings[0].currency !== currency)
                  ? formatMoneyList(earnings)
                  : formatMoney(now, currency);
              const delta = change(
                now,
                data.lastWeek[tile.key],
                currency,
                tile.money,
                tile.lowerIsBetter
              );
              return (
                <Rise key={tile.key} index={index} style={styles.tile}>
                  <Card accessibilityLabel={`${tile.label}: ${shown}. ${delta.text}`}>
                    <View style={styles.tileInner}>
                      <Text variant="caption" tone="tertiary">
                        {tile.label}
                      </Text>
                      <Text variant="numeric">{shown}</Text>
                      <Text variant="caption" tone={delta.tone}>
                        {delta.text}
                      </Text>
                    </View>
                  </Card>
                </Rise>
              );
            })}
          </View>

          <View style={{ gap: space.sm }}>
            <Text variant="overline" tone="tertiary">
              How your services really run
            </Text>
            {data.timing.length ? (
              data.timing.map(timingRow)
            ) : (
              <EmptyState
                icon={Timer}
                title="Nothing to show yet"
                message="Close out appointments with how the time went, and each service shows how long it really takes."
              />
            )}
            <Text variant="caption" tone="tertiary">
              Only you see this. Clients see a timing label only once it’s earned, and only the
              times that were down to you.
            </Text>
          </View>
        </View>
      )}
    </Screen>
  );
}
