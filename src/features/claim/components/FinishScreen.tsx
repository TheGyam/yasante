import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CalendarDays, Check, Clock, PartyPopper, Banknote, Tags } from 'lucide-react-native';
import { looksApi, useMyLooks, useStyleTaxonomy, type Look } from '@/features/looks';
import { TEXTURE_LABELS } from '@/features/profile';
import {
  DURATION_PICKS,
  formatDuration,
  parseDuration,
  useMyStylistProfile,
} from '@/features/stylist';
import { errorMessage } from '@/shared/lib/errors';
import { parseMoney, SEP } from '@/shared/lib/format';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';
import { finishProgress } from '../format';
import { useFinishState, usePriceStyle, useTagsChecked } from '../hooks';
import type { FinishStyle } from '../types';

const useStyles = makeStyles(t => ({
  body: { gap: space.xl },
  head: { gap: space.sm },
  step: { gap: space.md },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tick: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.successSoft,
  },
  number: { backgroundColor: t.colors.glass.fillStrong },
  price: { gap: space.sm },
  chips: { gap: space.xs, paddingVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  looks: { gap: space.md },
  look: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  thumb: { width: 64, aspectRatio: 0.8, borderRadius: radius.sm, overflow: 'hidden' },
  lookTags: { flex: 1, gap: space.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  done: { alignItems: 'center', gap: space.md, paddingVertical: space.xl },
}));

function Step({
  n,
  done,
  title,
  body,
  children,
}: {
  n: number;
  done: boolean;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Card style={styles.step}>
      <View style={styles.stepHead}>
        <View style={[styles.tick, !done && styles.number]}>
          {done ? (
            <Check size={14} color={theme.colors.success} strokeWidth={3} />
          ) : (
            <Text variant="caption" tone="secondary">
              {n}
            </Text>
          )}
        </View>
        <Text variant="title3" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {!!body && (
        <Text variant="subhead" tone="secondary">
          {body}
        </Text>
      )}
      {children}
    </Card>
  );
}

/** "6 of your photos are knotless braids. What do you charge?" — and the answer prices them all. */
function PriceStyle({ style }: { style: FinishStyle }) {
  const styles = useStyles();
  const priceIt = usePriceStyle();
  const [price, setPrice] = useState('');
  const [fromPrice, setFromPrice] = useState(true);
  const [howLong, setHowLong] = useState('');
  const amount = parseMoney(price);
  const minutes = parseDuration(howLong);
  if (style.priced)
    return (
      <ListRow
        title={style.name}
        subtitle={`${style.photoCount} ${style.photoCount === 1 ? 'photo' : 'photos'}${SEP}priced`}
        icon={Check}
        iconTone="success"
      />
    );
  return (
    <View style={styles.price}>
      <Text variant="callout">
        {style.photoCount} of your photos {style.photoCount === 1 ? 'is' : 'are'}{' '}
        {style.name.toLowerCase()}. What do you charge?
      </Text>
      <Input
        label="Price"
        icon={Banknote}
        value={price}
        onChangeText={setPrice}
        placeholder="120"
        keyboardType="decimal-pad"
        testID={`finish-price-${style.slug}`}
      />
      <View style={styles.row}>
        <Text variant="subhead">This is a starting price</Text>
        <Toggle
          value={fromPrice}
          onValueChange={setFromPrice}
          accessibilityLabel="This is a starting price"
        />
      </View>
      <Input
        label="How long it takes (optional)"
        icon={Clock}
        value={howLong}
        onChangeText={setHowLong}
        placeholder="4 hrs"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {DURATION_PICKS.map(pick => (
          <Chip
            key={pick}
            label={formatDuration(pick)}
            selected={minutes === pick}
            onPress={() => setHowLong(formatDuration(pick))}
          />
        ))}
      </ScrollView>
      {priceIt.isError && (
        <InlineAlert message={errorMessage(priceIt.error, 'That didn’t save. Try again.')} />
      )}
      <Button
        label="Save price"
        disabled={!(amount > 0)}
        loading={priceIt.isPending}
        onPress={() =>
          priceIt.mutate(
            { style: style.slug, price: amount, fromPrice, durationMinutes: minutes ?? null },
            { onSuccess: () => haptics.success(), onError: () => haptics.error() }
          )
        }
        testID={`finish-save-${style.slug}`}
      />
    </View>
  );
}

/** One of her looks with what we tagged it, changed with a tap. */
function LookTags({ look }: { look: Look }) {
  const styles = useStyles();
  const { data: taxonomy = [] } = useStyleTaxonomy();
  const [editing, setEditing] = useState(false);
  const [styleIds, setStyleIds] = useState(look.styles);
  const [hair, setHair] = useState(look.hairTexture);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const name = (id: string) => taxonomy.find(style => style.id === id)?.name ?? id;
  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await looksApi.updateTags(look.id, { styles: styleIds, hairTexture: hair ?? null });
      haptics.success();
      setEditing(false);
    } catch (failure) {
      haptics.error();
      setError(errorMessage(failure, 'That didn’t save. Try again.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={styles.look}>
      <View style={styles.thumb}>
        <RemoteImage
          uri={look.thumbUri ?? look.photoUri}
          style={StyleSheet.absoluteFill}
          recyclingKey={look.id}
          accessibilityLabel={styleIds.map(name).join(', ') || 'Your look'}
        />
      </View>
      <View style={styles.lookTags}>
        {editing ? (
          <>
            <View style={styles.wrap}>
              {taxonomy.map(style => {
                const on = styleIds.includes(style.id);
                return (
                  <Chip
                    key={style.id}
                    label={style.name}
                    selected={on}
                    onPress={() =>
                      setStyleIds(
                        on
                          ? styleIds.filter(id => id !== style.id)
                          : styleIds.length < 3
                            ? [...styleIds, style.id]
                            : styleIds
                      )
                    }
                  />
                );
              })}
            </View>
            <View style={styles.wrap}>
              {(Object.keys(TEXTURE_LABELS) as (keyof typeof TEXTURE_LABELS)[]).map(id => (
                <Chip
                  key={id}
                  label={TEXTURE_LABELS[id]}
                  selected={hair === id}
                  onPress={() => setHair(hair === id ? undefined : id)}
                />
              ))}
            </View>
            {!!error && <InlineAlert message={error} />}
            <Button
              label="Save"
              size="sm"
              disabled={!styleIds.length}
              loading={saving}
              onPress={save}
            />
          </>
        ) : (
          <>
            <Text variant="callout">{styleIds.map(name).join(', ') || 'No style yet'}</Text>
            <Text variant="footnote" tone="secondary">
              {hair ? TEXTURE_LABELS[hair] : 'Hair type not set'}
            </Text>
            <Button label="Change" size="sm" variant="ghost" onPress={() => setEditing(true)} />
          </>
        )}
      </View>
    </View>
  );
}

/**
 * Everything a page Yasante set up needs before it takes bookings, in one place:
 * a price for each style her photos show, her hours, and a look at our tags.
 * Pricing a style makes the service and puts that price on every photo of it.
 */
export function FinishScreen({ justClaimed }: { justClaimed?: boolean }) {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const finish = useFinishState();
  const { data: profile } = useMyStylistProfile();
  const { data: looks = [] } = useMyLooks();
  const confirm = useTagsChecked();

  if (finish.isLoading) {
    return (
      <Screen back title="Finish your page">
        <Skeleton height={320} />
      </Screen>
    );
  }
  if (!finish.data) {
    return (
      <Screen back title="Finish your page">
        <EmptyState
          icon={Tags}
          title="Nothing to finish"
          message="This is for pages Yasante set up for you."
        />
      </Screen>
    );
  }

  const state = finish.data;
  const done = finishProgress(state);
  if (state.done) {
    return (
      <Screen back title="Finish your page" testID="finish-screen">
        <View style={styles.done}>
          <PartyPopper size={40} color={theme.colors.accent} />
          <Text variant="title1" align="center" accessibilityRole="header">
            You’re taking bookings.
          </Text>
          <Text variant="body" tone="secondary" align="center">
            Everyone on your waitlist has been told.
          </Text>
          {!!profile?.handle && (
            <Button
              label="See your page"
              onPress={() => router.push(`/stylist/${profile.handle}`)}
              fullWidth
            />
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen back title="Finish your page" testID="finish-screen">
      <View style={styles.body}>
        <View style={styles.head}>
          {justClaimed && (
            <InlineAlert tone="success" message="It’s yours. Next, add your prices." />
          )}
          <Text variant="subhead" tone="secondary" accessibilityLiveRegion="polite">
            {done} of 3 done
          </Text>
          <ProgressBar progress={done / 3} />
        </View>

        <Step
          n={1}
          done={state.styles.every(style => style.priced)}
          title="Price your styles"
          body="Each price goes on your menu and on every photo of that style."
        >
          {state.styles.map(style => (
            <PriceStyle key={style.slug} style={style} />
          ))}
        </Step>

        <Step
          n={2}
          done={state.hoursSet}
          title="Set your hours"
          body="Clients only see times inside them."
        >
          <Button
            label={state.hoursSet ? 'Change your hours' : 'Set your hours'}
            icon={CalendarDays}
            variant={state.hoursSet ? 'ghost' : 'secondary'}
            onPress={() => router.push('/availability')}
            fullWidth
          />
        </Step>

        <Step
          n={3}
          done={state.tagsChecked}
          title="Check your tags"
          body="We tagged your photos for you. Fix any we got wrong."
        >
          <View style={styles.looks}>
            {looks
              .filter(look => look.visibility === 'public')
              .map(look => (
                <LookTags key={look.id} look={look} />
              ))}
          </View>
          {!state.tagsChecked && (
            <Button
              label="These look right"
              variant="secondary"
              loading={confirm.isPending}
              onPress={() => confirm.mutate(undefined, { onSuccess: () => haptics.success() })}
              fullWidth
            />
          )}
        </Step>
      </View>
    </Screen>
  );
}
