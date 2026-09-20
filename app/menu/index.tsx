import { View } from 'react-native';
import { ClipboardPaste, Plus, Scissors, WifiOff } from 'lucide-react-native';
import { formatDuration, formatPrice, useMenu } from '@/features/stylist';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
  actions: { gap: space.sm },
}));

/**
 * Her menu. A stylist has a handful of services, not a catalogue, so the list is
 * short enough to map — see the growth rules in ARCHITECTURE.md.
 */
export default function MenuScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data: menu, isLoading, isError, refetch, isRefetching } = useMenu();

  const actions = (
    <View style={styles.actions}>
      <Button
        label="Add a service"
        icon={Plus}
        onPress={() => router.push('/menu/new')}
        fullWidth
        testID="menu-add"
      />
      <Button
        label="Paste a price list"
        icon={ClipboardPaste}
        variant="secondary"
        onPress={() => router.push('/menu/paste')}
        fullWidth
        testID="menu-paste"
      />
    </View>
  );

  return (
    <Screen
      title="Menu"
      subtitle="What you do, what it costs"
      back
      refreshing={isRefetching}
      onRefresh={refetch}
      testID="stylist-menu"
    >
      <View style={styles.body}>
        {isLoading ? (
          <Skeleton height={180} />
        ) : isError ? (
          <EmptyState
            icon={WifiOff}
            title="Couldn’t load your menu"
            message="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => refetch()}
          />
        ) : !menu?.length ? (
          <>
            <EmptyState
              icon={Scissors}
              title="Nothing on your menu yet"
              message="Clients ask for prices before anything else. Add them once and your page answers for you."
            />
            {actions}
          </>
        ) : (
          <>
            <Section footer="Prices show on your page exactly as they read here.">
              {menu.map(item => (
                <ListRow
                  key={item.id}
                  title={item.name}
                  subtitle={item.durationMinutes ? formatDuration(item.durationMinutes) : item.note}
                  value={formatPrice(item)}
                  icon={Scissors}
                  onPress={() => router.push(`/menu/${item.id}`)}
                  testID={`menu-item-${item.id}`}
                />
              ))}
            </Section>
            {actions}
          </>
        )}
      </View>
    </Screen>
  );
}
