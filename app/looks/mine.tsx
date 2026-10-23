import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { Camera, Images, Lock } from 'lucide-react-native';
import { useMyLooks } from '@/features/looks';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, makeStyles, radius, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useContentInsets } from '@/shared/ui/layout';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen, ScreenTitle, useScreenScrollHandler } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';

const COLUMNS = 3;

// Virtualised: she can post for years.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as unknown as typeof FlashList;

const useStyles = makeStyles(t => ({
  header: { gap: space.lg, marginBottom: space.lg },
  cell: { flex: 1, padding: 2 },
  photo: {
    aspectRatio: 0.8,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: t.colors.glass.fillStrong,
  },
  lock: {
    position: 'absolute',
    top: space.xs,
    right: space.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,8,10,0.55)',
  },
}));

/** Every look she's posted, including the ones she kept for herself. */
export default function MyLooksScreen() {
  return (
    <Screen title="Your looks" back scroll="list" testID="my-looks">
      <MyLooks />
    </Screen>
  );
}

function MyLooks() {
  const styles = useStyles();
  const router = useRouter();
  const insets = useContentInsets();
  const onScroll = useScreenScrollHandler();
  const { data: looks = [], isLoading } = useMyLooks();

  return (
    <AnimatedFlashList
      data={looks}
      numColumns={COLUMNS}
      keyExtractor={look => look.id}
      renderItem={({ item }) => (
        <PressableScale
          onPress={() => router.push(`/looks/${item.id}`)}
          accessibilityLabel={`${item.caption ?? 'Your look'}${item.visibility === 'private' ? ', only you can see it' : ''}`}
          containerStyle={styles.cell}
        >
          <View style={styles.photo}>
            <RemoteImage
              uri={item.photoUri}
              style={StyleSheet.absoluteFill}
              recyclingKey={item.id}
            />
            {item.visibility === 'private' && (
              <View style={styles.lock}>
                <Lock size={12} color="#FFFFFF" strokeWidth={2.4} />
              </View>
            )}
          </View>
        </PressableScale>
      )}
      ListHeaderComponent={
        <View style={styles.header}>
          <ScreenTitle title="Your looks" />
          <Button
            label="Post a look"
            icon={Camera}
            variant="secondary"
            onPress={() => router.push('/looks/new')}
            fullWidth
          />
          {isLoading && <Skeleton height={160} />}
        </View>
      }
      ListEmptyComponent={
        isLoading ? null : (
          <EmptyState
            icon={Images}
            title="Nothing posted yet"
            message="Post your hair — for everyone, or just for you as a record of how it’s going."
          />
        )
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingHorizontal: GUTTER - 2,
      }}
    />
  );
}
