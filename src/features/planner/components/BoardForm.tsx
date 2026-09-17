import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ImagePlus,
  Lock,
  MapPin,
  Scissors,
  X,
} from 'lucide-react-native';
import { GUTTER, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { DateTimeField } from '@/shared/ui/DateTimeField';
import { IconButton } from '@/shared/ui/IconButton';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Section } from '@/shared/ui/Section';
import { PhotoSourceSheet } from '@/shared/ui/PhotoSourceSheet';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';
import type { BoardDraft } from '../boardDraft';

export interface BoardFormProps {
  initial: BoardDraft;
  submitLabel: string;
  pending: boolean;
  onSubmit: (draft: BoardDraft) => void;
  /** Editing only: a destructive action at the foot of the form. */
  onDelete?: () => void;
}

const TILE = { width: 104, height: 130 };

const useStyles = makeStyles(t => ({
  form: { gap: space.xxl },
  photos: { marginHorizontal: -GUTTER },
  photosContent: { paddingHorizontal: GUTTER, gap: space.sm },
  tile: { ...TILE, borderRadius: radius.md, overflow: 'hidden' },
  remove: { position: 'absolute', top: space.xs, right: space.xs },
  add: {
    ...TILE,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: t.colors.glass.border,
    backgroundColor: t.colors.glass.fill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  fields: { gap: space.lg },
  prices: { flexDirection: 'row', gap: space.md },
  price: { flex: 1 },
  notes: { minHeight: 96, textAlignVertical: 'top', paddingTop: space.md },
  actions: { gap: space.sm },
}));

export function BoardForm({ initial, submitLabel, pending, onSubmit, onDelete }: BoardFormProps) {
  const styles = useStyles();
  const theme = useTheme();
  const [draft, setDraft] = useState(initial);
  const [nameError, setNameError] = useState<string>();
  const [addingPhoto, setAddingPhoto] = useState(false);

  const set = <K extends keyof BoardDraft>(key: K, value: BoardDraft[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }));

  const addPhoto = (uri: string) => {
    setDraft(prev => ({ ...prev, photos: [...prev.photos, uri] }));
    setAddingPhoto(false);
  };

  const submit = () => {
    if (!draft.name.trim()) {
      setNameError('Give your board a name');
      return;
    }
    onSubmit(draft);
  };

  return (
    <View style={styles.form}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.photos}
        contentContainerStyle={styles.photosContent}
      >
        {draft.photos.map((uri, i) => (
          <View key={`${uri}-${i}`} style={styles.tile}>
            <RemoteImage uri={uri} style={StyleSheet.absoluteFill} />
            <IconButton
              icon={X}
              variant="overlay"
              size={28}
              accessibilityLabel={i === 0 ? 'Remove cover photo' : `Remove photo ${i + 1}`}
              style={styles.remove}
              onPress={() =>
                set(
                  'photos',
                  draft.photos.filter((_, j) => j !== i)
                )
              }
            />
          </View>
        ))}
        <PressableScale
          onPress={() => setAddingPhoto(true)}
          accessibilityLabel="Add a photo"
          style={styles.add}
        >
          <ImagePlus size={24} color={theme.colors.accent} strokeWidth={2} />
          <Text variant="footnote" tone="secondary">
            {draft.photos.length ? 'Add' : 'Add a cover'}
          </Text>
        </PressableScale>
      </ScrollView>

      <Input
        label="Board name"
        placeholder="Knotless braids for the wedding"
        value={draft.name}
        onChangeText={text => {
          set('name', text);
          if (nameError) setNameError(undefined);
        }}
        error={nameError}
        returnKeyType="done"
        maxLength={80}
      />

      <Section title="Appointment">
        <ListRow
          title="I’ve booked it"
          icon={Calendar}
          trailing={
            <Toggle
              value={draft.hasAppointment}
              onValueChange={value => set('hasAppointment', value)}
              accessibilityLabel="I’ve booked an appointment"
            />
          }
        />
        {draft.hasAppointment && (
          <DateTimeField
            title="Date"
            icon={Calendar}
            iconTone="neutral"
            value={draft.appointment}
            onChange={value => set('appointment', value)}
          />
        )}
        {draft.hasAppointment && (
          <DateTimeField
            title="Time"
            mode="time"
            icon={Clock}
            iconTone="neutral"
            value={draft.appointment}
            onChange={value => set('appointment', value)}
          />
        )}
      </Section>

      <View style={styles.fields}>
        <Input
          label="Stylist"
          placeholder="Who’s doing it?"
          icon={Scissors}
          value={draft.stylistName}
          onChangeText={text => set('stylistName', text)}
          autoCapitalize="words"
        />
        <Input
          label="Where"
          placeholder="Salon or area"
          icon={MapPin}
          value={draft.location}
          onChangeText={text => set('location', text)}
          autoCapitalize="words"
        />
        <View style={styles.prices}>
          <Input
            label="Stylist fee"
            placeholder="£0"
            keyboardType="decimal-pad"
            value={draft.stylistPrice}
            onChangeText={text => set('stylistPrice', text)}
            containerStyle={styles.price}
          />
          <Input
            label="Hair & products"
            placeholder="£0"
            keyboardType="decimal-pad"
            value={draft.hairPrice}
            onChangeText={text => set('hairPrice', text)}
            containerStyle={styles.price}
          />
        </View>
        <Input
          label="Notes"
          placeholder="Length, colour, what to bring…"
          multiline
          value={draft.notes}
          onChangeText={text => set('notes', text)}
          style={styles.notes}
        />
      </View>

      <Section footer="Private boards never appear to anyone else.">
        <ListRow
          title="Private board"
          icon={Lock}
          iconTone="neutral"
          trailing={
            <Toggle
              value={draft.isSecret}
              onValueChange={value => set('isSecret', value)}
              accessibilityLabel="Private board"
            />
          }
        />
        {onDelete && (
          <ListRow
            title="Style done"
            icon={CheckCircle2}
            iconTone="success"
            trailing={
              <Toggle
                value={draft.completed}
                onValueChange={value => set('completed', value)}
                accessibilityLabel="Style done"
              />
            }
          />
        )}
      </Section>

      <View style={styles.actions}>
        <Button label={submitLabel} onPress={submit} loading={pending} haptic="success" fullWidth />
        {onDelete && <Button label="Delete board" variant="danger" onPress={onDelete} fullWidth />}
      </View>

      <PhotoSourceSheet
        visible={addingPhoto}
        onClose={() => setAddingPhoto(false)}
        onPick={addPhoto}
        allowLink
      />
    </View>
  );
}
