import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BadgeCheck, MapPin, Scissors, Star } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { useStyleTaxonomy } from '@/features/looks';
import { useUpdateHairProfile, useUser } from '@/features/profile';
import { useStylistsForStyle, type StylistSearchResult, type Within } from '@/features/stylist';
import { formatMoney } from '@/shared/lib/format';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { Input } from '@/shared/ui/Input';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { areasFor, POSTCODE, tidyPostcode } from '@/shared/utils/postcode';

// How far people usually go for a style, and further if they want.
const RADII: { value: Within; label: string }[] = [
  { value: 5, label: '5 miles' },
  { value: 10, label: '10 miles' },
  { value: 20, label: '20 miles' },
  { value: 'any', label: 'Anywhere' },
];

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
  near: { gap: space.sm, marginBottom: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  where: { gap: space.md, marginBottom: space.lg },
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
  const { user } = useAuth();
  const { data: account } = useUser(user?.id);
  const hair = account?.hairProfile;
  const place = hair?.area || hair?.postcode;
  const [within, setWithin] = useState<Within>(10);
  const { data: stylists = [], isLoading } = useStylistsForStyle(style, {
    within: place ? within : undefined,
  });
  const wider = RADII[RADII.findIndex(r => r.value === within) + 1];

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
          {s.miles != null
            ? `${s.miles < 1 ? 'Under a mile' : `${Math.round(s.miles)} mi`} · `
            : ''}
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
        <Text variant="caption" tone="tertiary">
          {s.photoOfStyle
            ? 'Their work in this style'
            : s.photoUri
              ? 'Their recent work'
              : 'On their menu'}
        </Text>
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
      subtitle={
        place ? `Stylists near ${place}, their work in it first.` : 'Their work in it first.'
      }
      modal
      testID="who-does-this"
    >
      {place ? (
        <View style={styles.near}>
          <View style={styles.chips}>
            {RADII.map(r => (
              <Chip
                key={String(r.value)}
                label={r.label}
                selected={within === r.value}
                onPress={() => setWithin(r.value)}
              />
            ))}
          </View>
        </View>
      ) : user ? (
        <WhereAreYou />
      ) : null}
      {isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2].map(i => (
            <Skeleton key={i} height={120} radius={radius.lg} />
          ))}
        </View>
      ) : stylists.length ? (
        <View style={styles.list}>{stylists.map(row)}</View>
      ) : place && wider ? (
        <EmptyState
          icon={MapPin}
          title={`Nobody within ${within} miles yet`}
          message="Stylists who do this are a little further out."
          actionLabel={`Look within ${wider.label.toLowerCase()}`}
          onAction={() => setWithin(wider.value)}
        />
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

/** No area yet: one postcode, and the list is about who's near them from then on. */
function WhereAreYou() {
  const styles = useStyles();
  const { user } = useAuth();
  const save = useUpdateHairProfile(user?.id);
  const [postcode, setPostcode] = useState('');
  const valid = POSTCODE.test(postcode.trim());

  const go = async () => {
    const named = await areasFor(postcode).catch(() => []);
    save.mutate({ postcode: tidyPostcode(postcode), ...(named[0] && { area: named[0] }) });
  };

  return (
    <View style={styles.where}>
      <Text variant="callout">See who’s near you</Text>
      <Input
        label="Your postcode"
        icon={MapPin}
        value={postcode}
        onChangeText={setPostcode}
        placeholder="SE15 4QJ"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="postal-code"
        textContentType="postalCode"
        maxLength={8}
        hint="Kept in your hair profile. It’s never shown to anyone."
      />
      <Button
        label="Show stylists near me"
        variant="secondary"
        onPress={go}
        disabled={!valid}
        loading={save.isPending}
        fullWidth
      />
    </View>
  );
}
