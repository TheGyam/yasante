import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { Images, ImagePlus, ScrollText, LayoutGrid } from 'lucide-react-native';
import {
  PhotoTagSheet,
  useMenu,
  usePortfolio,
  useRemovePhoto,
  useUpdatePhoto,
  type PortfolioPhoto,
} from '@/features/stylist';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { confirm } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useContentInsets } from '@/shared/ui/layout';
import { ListRow } from '@/shared/ui/ListRow';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen, ScreenTitle, useScreenScrollHandler } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const COLUMNS = 3;

// Virtualised: a portfolio grows for as long as she works.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as unknown as typeof FlashList;

const useStyles = makeStyles(() => ({
  header: { gap: space.xl, marginBottom: space.lg },
  cell: { flex: 1, paddingHorizontal: 3, paddingBottom: space.sm, gap: 4 },
  photo: { width: '100%', aspectRatio: 0.8, borderRadius: radius.sm },
  grid: { marginHorizontal: -3 },
}));

export default function PortfolioScreen() {
  return (
    <Screen title="Portfolio" scroll="list" testID="stylist-portfolio">
      <PortfolioGrid />
    </Screen>
  );
}

function PortfolioGrid() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const insets = useContentInsets();
  const onScroll = useScreenScrollHandler();

  const { data: photos = [], isLoading, isRefetching, refetch } = usePortfolio();
  const { data: services = [] } = useMenu();
  const [tagging, setTagging] = useState<PortfolioPhoto>();
  const retag = useUpdatePhoto();
  const remove = useRemovePhoto();

  const nameOf = (serviceId?: string) => services.find(s => s.id === serviceId)?.name;

  const confirmRemove = async (photo: PortfolioPhoto) => {
    const yes = await confirm({
      title: 'Remove this photo?',
      message: 'It comes off your page straight away.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (yes) remove.mutate(photo.id);
    setTagging(undefined);
  };

  const header = (
    <View style={styles.header}>
      <ScreenTitle title="Portfolio" />
      <Section footer="The first thing a client asks for, answered before they ask.">
        <ListRow
          title="Menu and prices"
          subtitle={
            services.length
              ? `${services.length} ${services.length === 1 ? 'service' : 'services'}`
              : 'Nothing added yet'
          }
          icon={ScrollText}
          onPress={() => router.push('/menu')}
          testID="portfolio-menu"
        />
        <ListRow
          title="Looks"
          subtitle="Post your work where clients are looking"
          icon={LayoutGrid}
          onPress={() => router.push('/looks')}
          testID="portfolio-looks"
        />
      </Section>
      <Button
        label="Add photos"
        icon={ImagePlus}
        variant="secondary"
        onPress={() => router.push('/portfolio/import')}
        fullWidth
        testID="portfolio-add"
      />
      {isLoading && <Skeleton height={200} />}
    </View>
  );

  return (
    <>
      <AnimatedFlashList
        data={isLoading ? [] : photos}
        numColumns={COLUMNS}
        keyExtractor={photo => photo.id}
        renderItem={({ item, index }) => (
          <View style={styles.cell}>
            <PressableScale
              onPress={() => setTagging(item)}
              accessibilityLabel={`Photo ${index + 1}, ${nameOf(item.serviceId) ?? 'no service'}`}
            >
              <RemoteImage uri={item.uri} style={styles.photo} recyclingKey={item.id} />
            </PressableScale>
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              {nameOf(item.serviceId) ?? ' '}
            </Text>
          </View>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon={Images}
              title="Show your work"
              message="Six photos or more lets clients see your style before they ask. Add them all at once and tag them in one go."
              actionLabel="Add photos"
              onAction={() => router.push('/portfolio/import')}
            />
          )
        }
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
            progressViewOffset={insets.top}
          />
        }
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: GUTTER,
        }}
      />

      <PhotoTagSheet
        visible={!!tagging}
        onClose={() => setTagging(undefined)}
        services={services}
        value={tagging?.serviceId}
        onChange={serviceId => tagging && retag.mutate({ id: tagging.id, serviceId })}
        onRemove={() => tagging && confirmRemove(tagging)}
      />
    </>
  );
}
