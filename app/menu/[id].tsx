import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Clock, PoundSterling, Scissors, Trash2 } from 'lucide-react-native';
import {
  formatDuration,
  parseDuration,
  useAddMenuItem,
  useMenu,
  useRemoveMenuItem,
  useUpdateMenuItem,
  type MenuItemDraft,
} from '@/features/stylist';
import { errorMessage } from '@/features/auth';
import { parseMoney } from '@/shared/lib/format';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { confirm, notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Toggle } from '@/shared/ui/Toggle';

const useStyles = makeStyles(() => ({
  body: { gap: space.lg },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

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

  // A deep link can arrive before the menu does; fill the form once it's here.
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setPrice(String(existing.price));
    setFromPrice(existing.fromPrice);
    setHowLong(existing.durationMinutes ? formatDuration(existing.durationMinutes) : '');
    setNote(existing.note ?? '');
  }, [existing]);

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
