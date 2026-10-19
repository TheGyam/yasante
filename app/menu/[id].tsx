import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Clock, Plus, Banknote, Scissors, Trash2, X, ListPlus } from 'lucide-react-native';
import {
  DURATION_PICKS,
  OPTION_GROUPS,
  SERVICE_PRESETS,
  TYPICAL_OPTIONS,
  estimate,
  formatDuration,
  formatPrice,
  parseDuration,
  serviceKey,
  useAddMenuItem,
  useMenu,
  useMyCurrency,
  useRemoveMenuItem,
  useUpdateMenuItem,
  type MenuItemDraft,
  type OptionGroup,
  type PriceOption,
} from '@/features/stylist';
import { errorMessage } from '@/features/auth';
import { currencySymbol, formatMoney, parseMoney } from '@/shared/lib/format';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, makeStyles, space } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { Button } from '@/shared/ui/Button';
import { confirm, notify } from '@/shared/ui/dialog';
import { IconButton } from '@/shared/ui/IconButton';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';

const useStyles = makeStyles(() => ({
  body: { gap: space.lg },
  footer: { gap: space.xs, paddingTop: space.lg },
  group: { gap: space.sm },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  optionLabel: { flex: 2 },
  optionAdd: { flex: 1 },
  remove: { marginTop: space.sm },
  strip: { marginHorizontal: -GUTTER },
  chips: { flexDirection: 'row', gap: space.sm, paddingHorizontal: GUTTER },
}));

let nextId = 0;
const localId = () => `opt_${Date.now().toString(36)}_${nextId++}`;

/** Options as typed: prices stay text until they're saved. */
type OptionDraft = Omit<PriceOption, 'add'> & { add: string };

/** One service, added or edited. `/menu/new` is the add form; ids are never "new". */
export default function MenuItemScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const { data: menu } = useMenu();
  const currency = useMyCurrency();
  const existing = menu?.find(item => item.id === id);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [fromPrice, setFromPrice] = useState(false);
  const [howLong, setHowLong] = useState('');
  const [note, setNote] = useState('');
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [hairIncluded, setHairIncluded] = useState(false);

  // A deep link can arrive before the menu does; fill the form once it's here.
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setPrice(String(existing.price));
    setFromPrice(existing.fromPrice);
    setHowLong(existing.durationMinutes ? formatDuration(existing.durationMinutes) : '');
    setNote(existing.note ?? '');
    setOptions((existing.options ?? []).map(o => ({ ...o, add: String(o.add) })));
    setHairIncluded(!!existing.hairIncluded);
  }, [existing]);

  const addOption = (group: OptionGroup) =>
    setOptions(current => [...current, { id: localId(), group, label: '', add: '' }]);
  const changeOption = (id: string, change: Partial<OptionDraft>) =>
    setOptions(current => current.map(o => (o.id === id ? { ...o, ...change } : o)));
  const removeOption = (id: string) => setOptions(current => current.filter(o => o.id !== id));
  const startTypical = () => {
    haptics.light();
    setOptions(TYPICAL_OPTIONS.map(o => ({ ...o, id: localId(), add: String(o.add) })));
  };
  // One tap sets up the shape of a common service; she only has to add her price.
  const startFrom = (preset: (typeof SERVICE_PRESETS)[number]) => {
    setName(preset.name);
    setHowLong(formatDuration(preset.minutes));
    setFromPrice(preset.by.length > 0);
    setOptions(
      TYPICAL_OPTIONS.filter(o => preset.by.includes(o.group)).map(o => ({
        ...o,
        id: localId(),
        add: String(o.add),
      }))
    );
  };
  const onMenu = new Set((menu ?? []).map(item => serviceKey(item.name)));
  const presets = SERVICE_PRESETS.filter(p => !onMenu.has(serviceKey(p.name)));

  const add = useAddMenuItem();
  const update = useUpdateMenuItem(id);
  const remove = useRemoveMenuItem(id);

  const minutes = parseDuration(howLong);
  const amount = parseMoney(price);
  const ready = !!name.trim() && amount > 0;

  // Exactly what her page will show, and the most a client could be quoted.
  const preview = ready
    ? {
        id: 'preview',
        name: name.trim(),
        price: amount,
        fromPrice,
        durationMinutes: minutes,
        options: options
          .filter(o => o.label.trim())
          .map(o => ({ ...o, add: parseMoney(o.add) || 0 })),
      }
    : undefined;
  const top = preview
    ? estimate(
        preview,
        Object.fromEntries(
          OPTION_GROUPS.map(({ group }) => {
            const inGroup = preview.options.filter(o => o.group === group);
            return [group, inGroup[inGroup.length - 1]?.id];
          })
        )
      )
    : undefined;

  const save = async () => {
    const draft: MenuItemDraft = {
      name: name.trim(),
      price: amount,
      fromPrice,
      durationMinutes: minutes,
      note: note.trim() || undefined,
      options: options
        .filter(o => o.label.trim())
        .map(o => ({ ...o, label: o.label.trim(), add: parseMoney(o.add) || 0 })),
      hairIncluded,
    };
    try {
      await (isNew ? add.mutateAsync(draft) : update.mutateAsync(draft));
      haptics.success();
      router.back();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t save that',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  const confirmRemove = async () => {
    const yes = await confirm({
      title: `Remove ${existing?.name ?? 'this service'}?`,
      message: 'It comes off your page straight away.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!yes) return;
    try {
      await remove.mutateAsync();
      haptics.success();
      router.back();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t remove it',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <Screen title={isNew ? 'Add a service' : 'Edit service'} modal keyboard testID="menu-item-form">
      <View style={styles.body}>
        {isNew && presets.length > 0 && (
          <View style={styles.group}>
            <Text variant="footnote" tone="secondary">
              Start from one of these, or type your own
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.strip}
              contentContainerStyle={styles.chips}
              keyboardShouldPersistTaps="handled"
            >
              {presets.map(preset => (
                <Chip
                  key={preset.name}
                  label={preset.name}
                  selected={name === preset.name}
                  onPress={() => startFrom(preset)}
                />
              ))}
            </ScrollView>
          </View>
        )}
        <Input
          label="What you call it"
          icon={Scissors}
          value={name}
          onChangeText={setName}
          placeholder="Knotless braids"
          autoCapitalize="sentences"
        />
        <Input
          label="Price"
          icon={Banknote}
          value={price}
          onChangeText={setPrice}
          placeholder="120"
          keyboardType="decimal-pad"
        />
        <Input
          label="How long it takes"
          icon={Clock}
          value={howLong}
          onChangeText={setHowLong}
          placeholder="4 hrs"
          hint={
            minutes ? `Clients see ${formatDuration(minutes)}` : 'Optional — “4 hrs”, “90 mins”'
          }
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.strip}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
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
        <Section footer="Braids priced by length and size are nearly always a starting price.">
          <ListRow
            title="This is a starting price"
            subtitle={`Shows as “from ${formatMoney(120, currency)}”`}
            trailing={
              <Toggle
                value={fromPrice}
                onValueChange={setFromPrice}
                accessibilityLabel="This is a starting price"
              />
            }
          />
        </Section>
        <View style={styles.group}>
          <Text variant="overline" tone="tertiary">
            Priced by length or size
          </Text>
          <Text variant="footnote" tone="secondary">
            The first of each is your base price. Clients pick theirs, and see what it comes to
            before they ask.
          </Text>
          {!options.length && (
            <Button
              label="Start with typical prices"
              icon={ListPlus}
              variant="secondary"
              onPress={startTypical}
              fullWidth
              testID="menu-typical-options"
            />
          )}
          {OPTION_GROUPS.map(({ group, name }) => {
            const inGroup = options.filter(o => o.group === group);
            return (
              <View key={group} style={styles.group}>
                {inGroup.map((option, index) => (
                  <View key={option.id} style={styles.option}>
                    <View style={styles.optionLabel}>
                      <Input
                        label={index === 0 ? `${name} (base)` : name}
                        value={option.label}
                        onChangeText={label => changeOption(option.id, { label })}
                        placeholder={group === 'length' ? 'Waist' : 'Small'}
                        autoCapitalize="sentences"
                      />
                    </View>
                    <View style={styles.optionAdd}>
                      <Input
                        label={`Adds ${currencySymbol(currency)}`}
                        value={option.add}
                        onChangeText={add => changeOption(option.id, { add })}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        hint={
                          amount && parseMoney(option.add)
                            ? formatMoney(amount + parseMoney(option.add), currency)
                            : undefined
                        }
                      />
                    </View>
                    <IconButton
                      icon={X}
                      variant="plain"
                      size={32}
                      style={styles.remove}
                      accessibilityLabel={`Remove ${option.label || name.toLowerCase()}`}
                      onPress={() => removeOption(option.id)}
                    />
                  </View>
                ))}
                <Button
                  label={`Add a ${name.toLowerCase()}`}
                  icon={Plus}
                  variant="ghost"
                  size="sm"
                  onPress={() => addOption(group)}
                />
              </View>
            );
          })}
        </View>
        <Section>
          <ListRow
            title="Hair is included"
            subtitle="You bring the braiding hair, and it’s in the price"
            trailing={
              <Toggle
                value={hairIncluded}
                onValueChange={setHairIncluded}
                accessibilityLabel="Hair is included"
              />
            }
          />
        </Section>
        <Input
          label="Anything they should know"
          value={note}
          onChangeText={setNote}
          placeholder="Hair not included"
          multiline
          style={{ minHeight: 72 }}
        />

        {!!preview && (
          <Section
            title="On your page"
            footer={
              top && top.labels.length
                ? `${top.labels.join(', ')} comes to ${formatPrice({ price: top.price, fromPrice: false }, currency)}.`
                : undefined
            }
          >
            <ListRow
              title={preview.name}
              subtitle={minutes ? formatDuration(minutes) : note.trim() || undefined}
              value={formatPrice(preview, currency)}
              icon={Scissors}
            />
          </Section>
        )}

        <View style={styles.footer}>
          <Button
            label={isNew ? 'Add to my menu' : 'Save'}
            onPress={save}
            disabled={!ready}
            loading={add.isPending || update.isPending}
            fullWidth
            testID="menu-item-save"
          />
          {!isNew && (
            <Button
              label="Remove from my menu"
              icon={Trash2}
              variant="danger"
              onPress={confirmRemove}
              loading={remove.isPending}
              fullWidth
            />
          )}
        </View>
      </View>
    </Screen>
  );
}
