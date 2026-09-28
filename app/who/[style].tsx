import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Scissors, Star } from 'lucide-react-native';
import { useStyleTaxonomy } from '@/features/looks';
import { useStylistsForStyle, type StylistSearchResult } from '@/features/stylist';
import { formatMoney } from '@/shared/lib/format';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(t => ({
  list: { gap: space.md },
  row: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: t.colors.glass.fill,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
  },
  work: { width: 76, height: 96, borderRadius: radius.sm, overflow: 'hidden' },
  text: { flex: 1, gap: 2, justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  book: { alignSelf: 'center' },
}));

/**
 * Who does this style: opened from a look (press and hold in the feed, or the card
 * under a look). Their work in it first, then near you, then checked and well rated.
 */
export default function WhoDoesThisStyle() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { style } = useLocalSearchParams<{ style: string }>();
  const { data: taxonomy = [] } = useStyleTaxonomy();
  const name = taxonomy.find(s => s.id === style)?.name ?? 'This style';
  const { data: stylists = [], isLoading } = useStylistsForStyle(style);

  const row = (s: StylistSearchResult) => (
    <PressableScale
      key={s.accountId}
      onPress={() => router.push(`/stylist/${s.handle}`)}
      accessibilityLabel={`${s.displayName}, ${s.baseArea}${s.fromPrice ? `, from ${formatMoney(s.fromPrice)}` : ''}`}
      style={styles.row}
    >
      {s.photoUri ? (
        <View style={styles.work}>
          <RemoteImage
            uri={s.photoUri}
            style={StyleSheet.absoluteFill}
            recyclingKey={s.accountId}
          />
        </View>
      ) : (
        <Avatar uri={s.avatarUri} name={s.displayName} size={56} />
      )}
      <View style={styles.text}>
        <View style={styles.line}>
          <Text variant="callout" numberOfLines={1}>
            {s.displayName}
          </Text>
          {!!s.verificationTier && (
            <BadgeCheck size={15} color={theme.colors.success} strokeWidth={2.4} />
          )}
        </View>
        <Text variant="footnote" tone="secondary" numberOfLines={1}>
          {s.baseArea}
          {s.fromPrice ? ` · from ${formatMoney(s.fromPrice)}` : ''}
        </Text>
        {!!s.ratingCount && s.rating != null && (
          <View style={styles.line}>
            <Star size={13} color={theme.colors.gold} fill={theme.colors.gold} strokeWidth={0} />
            <Text variant="caption" tone="secondary">
              {s.rating.toFixed(1)} ({s.ratingCount})
            </Text>
          </View>
        )}
        {!s.photoUri && (
          <Text variant="caption" tone="tertiary">
            On their menu, no photos of it yet
          </Text>
        )}
      </View>
      {!!s.serviceId && (
        <Button
          label="Book"
          size="sm"
          onPress={() => router.push(`/book/${s.handle}?service=${s.serviceId}`)}
          style={styles.book}
        />
      )}
    </PressableScale>
  );

  return (
    <Screen
      title={`Who does ${name.toLowerCase()}?`}
      subtitle="Their work in it first, then stylists near you."
      modal
      testID="who-does-this"
    >
      {isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2].map(i => (
            <Skeleton key={i} height={120} radius={radius.lg} />
          ))}
        </View>
      ) : stylists.length ? (
        <View style={styles.list}>{stylists.map(row)}</View>
      ) : (
        <EmptyState
          icon={Scissors}
          title="Nobody’s listed it yet"
          message="As more stylists join, the ones who do this will show here."
        />
      )}
    </Screen>
  );
}
