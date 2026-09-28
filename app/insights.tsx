import { useState } from 'react';
import { View } from 'react-native';
import { formatDistanceToNowStrict } from 'date-fns';
import { Sparkles } from 'lucide-react-native';
import { useInsights, type InsightsPeriod } from '@/features/profile';
import { formatMoney } from '@/shared/lib/format';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Screen } from '@/shared/ui/Screen';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const PERIODS = [
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'Since you started' },
] as const;

const useStyles = makeStyles(() => ({
  body: { gap: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '48.5%' },
  inner: { gap: 2 },
  card: { gap: space.xs },
}));

/** Your hair in numbers: appointments, length and care, from what you already do here. */
export default function InsightsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const [period, setPeriod] = useState<InsightsPeriod>('month');
  const { data: i, isLoading, isRefetching, refetch } = useInsights(period);

  const tiles = i
    ? [
        { label: 'Appointments', value: String(i.appointments) },
        { label: 'Spent', value: formatMoney(i.spent) },
        { label: 'Wash days', value: String(i.washes) },
        { label: 'Looks saved', value: String(i.looksSaved) },
      ]
    : [];
  const empty = i && !i.appointments && !i.washes && !i.length && !i.currentStyle && !i.looksSaved;

  return (
    <Screen title="Your hair" back refreshing={isRefetching} onRefresh={refetch} testID="insights">
      <View style={styles.body}>
        <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} />
        {isLoading || !i ? (
          <Skeleton height={320} />
        ) : empty ? (
          <EmptyState
            icon={Sparkles}
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
            {i.length && (
              <Card>
                <View style={styles.card}>
                  <Text variant="overline" tone="tertiary">
                    Length
                  </Text>
                  <Text variant="title3">
                    {i.length.now}
                    {i.length.nowCm ? ` · ${i.length.nowCm} cm` : ''}
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
            {(i.usualWashDay || i.washEveryDays || i.daysSinceTrim != null) && (
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
                    <Text variant="body">Last trim {i.daysSinceTrim} days ago.</Text>
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
