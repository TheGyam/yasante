import { Alert, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import {
  Calendar,
  CheckCircle2,
  ImageIcon,
  Lock,
  MapPin,
  Pencil,
  Scissors,
  Share,
  Trash2,
  WifiOff,
} from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import {
  appointmentOf,
  boardTotal,
  shareBoard,
  useDeleteMoodBoardEntry,
  useMoodBoardEntry,
} from '@/features/planner';
import { formatMoney } from '@/shared/lib/format';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { ListRow } from '@/shared/ui/ListRow';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(t => ({
  body: { gap: space.xxl },
  cover: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: t.colors.glass.fillStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  photo: { width: '48.5%', aspectRatio: 4 / 5, borderRadius: radius.lg },
  heading: { gap: space.xs },
}));

export default function BoardScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: entry, isLoading, isError, refetch, isRefetching } = useMoodBoardEntry(id);
  const { user } = useAuth();
  const remove = useDeleteMoodBoardEntry(id, user?.id);

  const confirmDelete = () =>
    Alert.alert('Delete this board?', 'Its photos and details go with it. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(undefined, {
            onSuccess: () => router.back(),
            onError: () =>
              Alert.alert('Couldn’t delete the board', 'Check your connection and try again.'),
          }),
      },
    ]);

  const headerRight = entry && (
    <>
      <IconButton
        icon={Share}
        size={36}
        accessibilityLabel="Share board"
        onPress={() => shareBoard(entry)}
      />
      <IconButton
        icon={Pencil}
        size={36}
        accessibilityLabel="Edit board"
        onPress={() => router.push(`/boards/${entry.id}/edit`)}
      />
    </>
  );

  if (!entry) {
    return (
      <Screen back testID="moodboard-screen">
        {isLoading ? (
          <View style={styles.body}>
            <Skeleton radius={radius.xl} style={styles.cover} />
            <Skeleton height={32} width="60%" />
          </View>
        ) : (
          <EmptyState
            icon={WifiOff}
            title={isError ? 'Couldn’t load this board' : 'Board not found'}
            message={isError ? 'Check your connection and try again.' : 'It may have been deleted.'}
            actionLabel={isError ? 'Try again' : undefined}
            onAction={isError ? () => refetch() : undefined}
          />
        )}
      </Screen>
    );
  }

  const when = appointmentOf(entry);
  const cover = entry.mainPhotoUri || entry.photos?.[0];
  const rest = (entry.photos ?? []).filter(uri => uri !== cover);
  const stylistPrice = Number(entry.stylistPrice || 0);
  const hairPrice = Number(entry.hairPrice || 0);

  return (
    <Screen
      back
      headerRight={headerRight}
      refreshing={isRefetching}
      onRefresh={refetch}
      testID="moodboard-screen"
    >
      <View style={styles.body}>
        <View style={styles.cover}>
          {cover ? (
            <RemoteImage
              uri={cover}
              style={StyleSheet.absoluteFill}
              priority="high"
              accessibilityLabel={entry.name}
            />
          ) : (
            <ImageIcon size={40} color={theme.colors.text.tertiary} strokeWidth={1.6} />
          )}
        </View>

        <View style={styles.heading}>
          <Text variant="title1" accessibilityRole="header">
            {entry.name}
          </Text>
          {entry.isSecret && (
            <Text variant="subhead" tone="secondary">
              Private board
            </Text>
          )}
        </View>

        <Section>
          <ListRow
            title={when ? format(when, 'EEEE d MMMM') : 'No appointment yet'}
            value={when ? format(when, 'HH:mm') : undefined}
            icon={Calendar}
            onPress={when ? undefined : () => router.push(`/boards/${entry.id}/edit`)}
          />
          {!!entry.stylistName && (
            <ListRow title={entry.stylistName} icon={Scissors} iconTone="neutral" />
          )}
          {!!entry.stylistLocation && (
            <ListRow title={entry.stylistLocation} icon={MapPin} iconTone="neutral" />
          )}
          {entry.completed && <ListRow title="Style done" icon={CheckCircle2} iconTone="success" />}
          {entry.isSecret && (
            <ListRow title="Only you can see this" icon={Lock} iconTone="neutral" />
          )}
        </Section>

        {boardTotal(entry) > 0 && (
          <Section title="Budget">
            {stylistPrice > 0 && <ListRow title="Stylist fee" value={formatMoney(stylistPrice)} />}
            {hairPrice > 0 && <ListRow title="Hair & products" value={formatMoney(hairPrice)} />}
            <ListRow title="Total" value={formatMoney(boardTotal(entry))} />
          </Section>
        )}

        {!!entry.notes && (
          <Section title="Notes">
            <View style={{ padding: space.lg }}>
              <Text variant="body">{entry.notes}</Text>
            </View>
          </Section>
        )}

        {rest.length > 0 && (
          <View style={styles.gallery}>
            {rest.map((uri, i) => (
              <RemoteImage key={`${uri}-${i}`} uri={uri} style={styles.photo} />
            ))}
          </View>
        )}

        {entry.userId === user?.id && (
          <Section>
            <ListRow title="Delete board" icon={Trash2} destructive onPress={confirmDelete} />
          </Section>
        )}
      </View>
    </Screen>
  );
}
