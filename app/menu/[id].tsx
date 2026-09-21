import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Clock, Plus, PoundSterling, Scissors, Sparkles, Trash2, X } from 'lucide-react-native';
import {
  OPTION_GROUPS,
  TYPICAL_OPTIONS,
  formatDuration,
  parseDuration,
  useAddMenuItem,
  useMenu,
  useRemoveMenuItem,
  useUpdateMenuItem,
  type MenuItemDraft,
  type OptionGroup,
  type PriceOption,
} from '@/features/stylist';
import { errorMessage } from '@/features/auth';
import { formatMoney, parseMoney } from '@/shared/lib/format';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
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

  const add = useAddMenuItem();
  const update = useUpdateMenuItem(id);
  const remove = useRemoveMenuItem(id);

  const minutes = parseDuration(howLong);
  const amount = parseMoney(price);
  const ready = !!name.trim() && amount > 0;

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
          icon={PoundSterling}
          value={price}
          onChangeText={setPrice}
          placeholder="120"
          keyboardType="decimal-pad"
        />
        <Section footer="Braids priced by length and size are nearly always a starting price.">
          <ListRow
            title="This is a starting price"
            subtitle="Shows as “from £120”"
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
              icon={Sparkles}
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
                        label="Adds £"
                        value={option.add}
                        onChangeText={add => changeOption(option.id, { add })}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        hint={
                          amount && parseMoney(option.add)
                            ? formatMoney(amount + parseMoney(option.add))
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
          label="How long it takes"
          icon={Clock}
          value={howLong}
          onChangeText={setHowLong}
          placeholder="4 hrs"
          hint={
            minutes ? `Clients see ${formatDuration(minutes)}` : 'Optional — “4 hrs”, “90 mins”'
          }
        />
        <Input
          label="Anything they should know"
          value={note}
          onChangeText={setNote}
          placeholder="Hair not included"
          multiline
          style={{ minHeight: 72 }}
        />

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
