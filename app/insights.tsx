import { useState } from 'react';
import { View } from 'react-native';
import { formatDistanceToNowStrict } from 'date-fns';
import { ChartNoAxesColumn } from 'lucide-react-native';
import { useInsights, type InsightsPeriod } from '@/features/profile';
import { formatMoneyList, SEP } from '@/shared/lib/format';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadError } from '@/shared/ui/LoadError';
import { Screen } from '@/shared/ui/Screen';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const PERIODS = [
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'Since you started' },
] as const;

const useStyles = makeStyles(t => ({
  body: { gap: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '48.5%' },
  inner: { gap: 2 },
  card: { gap: space.xs },
  style: { gap: 6, paddingVertical: 2 },
  styleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: t.colors.glass.fillStrong },
  bar: { height: 6, borderRadius: radius.pill, backgroundColor: t.colors.accent },
}));

const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

/** "12 hrs", "4.5 hrs", "None yet" */
const hours = (n: number) => (n ? `${Number.isInteger(n) ? n : n.toFixed(1)} hrs` : 'None yet');

/**
 * Your hair in numbers: what you had done and with whom, your length and your care,
 * from what you already do here.
 */
export default function InsightsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const [period, setPeriod] = useState<InsightsPeriod>('month');
  const { data: i, isLoading, isRefetching, refetch, error } = useInsights(period);

  const tiles = i
    ? [
        { label: 'Appointments', value: String(i.appointments) },
        {
          label: 'Spent',
          // Each currency on its own: "$60 · €45 · GH₵300", never converted or added.
          value: i.spending.length ? formatMoneyList(i.spending) : 'None yet',
        },
        { label: 'Time with stylists', value: hours(i.hoursInChair) },
        { label: 'Wash days', value: String(i.washes) },
        { label: 'Care plan days', value: String(i.carePlanDays) },
        { label: 'Looks saved', value: String(i.looksSaved) },
      ]
    : [];
  const empty =
    i &&
    !i.appointments &&
    !i.washes &&
    !i.length &&
    !i.currentStyle &&
    !i.looksSaved &&
    !i.carePlanDays;
  const most = i?.styleCounts[0]?.times ?? 1;

  return (
    <Screen title="Your hair" back refreshing={isRefetching} onRefresh={refetch} testID="insights">
      <View style={styles.body}>
        <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} />
        {isLoading ? (
          <Skeleton height={320} />
        ) : !i ? (
          // Not a skeleton for ever: a failed load says so.
          <LoadError what="your numbers" error={error} onRetry={refetch} retrying={isRefetching} />
        ) : empty ? (
          <EmptyState
            icon={ChartNoAxesColumn}
            title="Nothing to show yet"
            message="Book an appointment, log a wash day or add your length, and your numbers start here."
          />
        ) : (
          <>
            {i.currentStyle && (
              <Card>
                <View style={styles.card}>
                  <Text variant="overline" tone="tertiary">
                    In right now
                  </Text>
                  <Text variant="title3">
                    {i.currentStyle.name}, day {i.currentStyle.days + 1}
                  </Text>
                  {!!i.styleLastsDays && (
                    <Text variant="subhead" tone="secondary">
                      Yours usually last {i.styleLastsDays} days.
                    </Text>
                  )}
                </View>
              </Card>
            )}
            <View style={styles.grid}>
              {tiles.map(tile => (
                <View key={tile.label} style={styles.tile}>
                  <Card accessibilityLabel={`${tile.label}: ${tile.value}`}>
                    <View style={styles.inner}>
                      <Text variant="caption" tone="tertiary">
                        {tile.label}
                      </Text>
                      <Text variant="numeric">{tile.value}</Text>
                    </View>
                  </Card>
                </View>
              ))}
            </View>
            {i.styleCounts.length > 0 && (
              <Card>
                <View style={styles.card}>
                  <Text variant="overline" tone="tertiary">
                    What you had done
                  </Text>
                  {i.styleCounts.map(style => (
                    <View
                      key={style.name}
                      style={styles.style}
                      accessible
                      accessibilityLabel={`${style.name}, ${times(style.times)}`}
                    >
                      <View style={styles.styleRow}>
                        <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                          {style.name}
                        </Text>
                        <Text variant="subhead" tone="secondary">
                          {times(style.times)}
                        </Text>
                      </View>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.bar,
                            { width: `${Math.max(8, (style.times / most) * 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                  {i.stylists > 1 && (
                    <Text variant="footnote" tone="tertiary">
                      With {i.stylists} stylists
                    </Text>
                  )}
                </View>
              </Card>
            )}
            {i.favouriteStylist && (
              <Card>
                <View style={styles.card}>
                  <Text variant="overline" tone="tertiary">
                    Your stylist
                  </Text>
                  <Text variant="title3">{i.favouriteStylist.name}</Text>
                  <Text variant="subhead" tone="secondary">
                    You’ve been {times(i.favouriteStylist.times)}{' '}
                    {period === 'month' ? 'this month' : 'since you started'}.
                  </Text>
                  {!!i.favouriteStylist.handle && (
                    <Button
                      label="Book again"
                      variant="secondary"
                      size="sm"
                      onPress={() => router.push(`/book/${i.favouriteStylist!.handle}`)}
                    />
                  )}
                </View>
              </Card>
            )}
            {i.length && (
              <Card>
                <View style={styles.card}>
                  <Text variant="overline" tone="tertiary">
                    Length
                  </Text>
                  <Text variant="title3">
                    {i.length.now}
                    {i.length.nowCm ? `${SEP}${i.length.nowCm} cm` : ''}
                  </Text>
                  {!!i.length.grewCm && i.length.grewCm > 0 && (
                    <Text variant="subhead" tone="success">
                      Up {i.length.grewCm} cm{' '}
                      {period === 'month' ? 'this month' : 'since you started'}
                    </Text>
                  )}
                  {!!i.length.measuredAt && (
                    <Text variant="footnote" tone="tertiary">
                      Measured {formatDistanceToNowStrict(new Date(i.length.measuredAt))} ago
                    </Text>
                  )}
                  <Button
                    label="Update my length"
                    variant="secondary"
                    size="sm"
                    onPress={() => router.push('/hair-profile/length')}
                  />
                </View>
              </Card>
            )}
            {(i.usualWashDay || i.washEveryDays || i.daysSinceTrim != null || i.trims > 0) && (
              <Card>
                <View style={styles.card}>
                  <Text variant="overline" tone="tertiary">
                    Your routine
                  </Text>
                  {!!i.usualWashDay && (
                    <Text variant="body">You usually wash on {i.usualWashDay}s.</Text>
                  )}
                  {!!i.washEveryDays && (
                    <Text variant="body">About every {i.washEveryDays} days between washes.</Text>
                  )}
                  {i.daysSinceTrim != null && (
                    <Text variant="body">
                      {i.daysSinceTrim === 0
                        ? 'Trimmed today.'
                        : i.daysSinceTrim === 1
                          ? 'Trimmed yesterday.'
                          : `Last trim ${i.daysSinceTrim} days ago.`}
                    </Text>
                  )}
                  {i.trims > 1 && (
                    <Text variant="body">
                      {i.trims} trims {period === 'month' ? 'this month' : 'since you started'}.
                    </Text>
                  )}
                </View>
              </Card>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}
