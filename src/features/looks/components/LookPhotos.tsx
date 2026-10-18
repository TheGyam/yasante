import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { makeStyles, space, timing, useTheme } from '@/shared/theme';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import { lookPhotos, type Look, type LookPhoto } from '../types';
import { usePhotoTaps } from './usePhotoTaps';

/** How long the "2/5" counter stays up after the last swipe. */
const COUNTER_FADE_MS = 1500;

export interface LookPhotosProps {
  look: Look;
  /** On the look's own page: the full photo, and a tap does nothing but like. */
  detail?: boolean;
  onOpen?: (look: Look, photoIndex: number) => void;
  onLike: (look: Look, liked: boolean) => void;
  /** Press and hold a photo: who does this style. */
  onFindStylists?: (look: Look) => void;
  /** Opens already swiped to the photo she was looking at when she tapped in. */
  initialIndex?: number;
}

interface PhotoProps {
  look: Look;
  photo: LookPhoto;
  index: number;
  detail?: boolean;
  onOpen?: (look: Look, photoIndex: number) => void;
  onLike: (look: Look, liked: boolean) => void;
  onFindStylists?: (look: Look) => void;
  /** Fixed width inside the swiper; omitted when it's the only photo and fills its parent. */
  width?: number;
  /**
   * False inside the swiper: the carousel itself is the one accessible, adjustable
   * element, and a photo nested under it would be invisible to a screen reader anyway.
   */
  accessible?: boolean;
}

/** One photo: the image, the double-tap heart, and (outside a swiper) its own a11y. */
function Photo({
  look,
  photo,
  index,
  detail,
  onOpen,
  onLike,
  onFindStylists,
  width,
  accessible = true,
}: PhotoProps) {
  const { gesture, heart } = usePhotoTaps(
    look,
    onOpen && (() => onOpen(look, index)),
    onLike,
    96,
    onFindStylists
  );
  return (
    <View style={width ? { width, height: '100%' } : StyleSheet.absoluteFill}>
      <GestureDetector gesture={gesture}>
        <View
          style={StyleSheet.absoluteFill}
          accessible={accessible}
          accessibilityRole={accessible ? (detail ? 'image' : 'button') : undefined}
          accessibilityLabel={
            accessible ? look.caption ?? look.serviceName ?? 'A look' : undefined
          }
          accessibilityHint={
            accessible ? (detail ? 'Double tap to like' : 'Opens the look') : undefined
          }
        >
          <RemoteImage
            uri={(detail ? undefined : photo.feedUri) ?? photo.uri}
            style={StyleSheet.absoluteFill}
            recyclingKey={width ? undefined : look.id}
            placeholderUri={photo.thumbUri}
          />
          {heart}
        </View>
      </GestureDetector>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: space.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { width: 6, height: 6, borderRadius: 3 },
  counter: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(12,8,10,0.55)',
  },
  counterText: { color: '#FFFFFF' },
}));

/** More than one photo: a paging strip, dots, and a fading "n/total" counter. */
function Swiper({
  look,
  photos,
  detail,
  onOpen,
  onLike,
  onFindStylists,
  initialIndex = 0,
}: {
  look: Look;
  photos: LookPhoto[];
  detail?: boolean;
  onOpen?: (look: Look, photoIndex: number) => void;
  onLike: (look: Look, liked: boolean) => void;
  onFindStylists?: (look: Look) => void;
  initialIndex?: number;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const total = photos.length;
  const start = Math.min(total - 1, Math.max(0, initialIndex));
  const listRef = useRef<FlatList<LookPhoto>>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(start);
  const counterOpacity = useSharedValue(1);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showCounter = useCallback(() => {
    counterOpacity.set(1);
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => counterOpacity.set(withTiming(0, timing.state)), COUNTER_FADE_MS);
  }, [counterOpacity]);

  useEffect(() => {
    showCounter();
    return () => clearTimeout(fadeTimer.current);
  }, [showCounter]);

  // Whichever photo is on screen, the next one's feed copy is ready before she swipes to it.
  useEffect(() => {
    const next = photos[index + 1];
    if (next) Image.prefetch([next.feedUri ?? next.uri], 'memory-disk').catch(() => {});
  }, [photos, index]);

  const goTo = useCallback(
    (i: number) => {
      if (!width) return;
      const clamped = Math.min(total - 1, Math.max(0, i));
      listRef.current?.scrollToOffset({ offset: clamped * width, animated: true });
      setIndex(clamped);
      showCounter();
    },
    [width, total, showCounter]
  );

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    showCounter();
  };

  const renderItem = useCallback(
    ({ item, index: i }: { item: LookPhoto; index: number }) => (
      <Photo
        look={look}
        photo={item}
        index={i}
        detail={detail}
        onOpen={onOpen}
        onLike={onLike}
        onFindStylists={onFindStylists}
        width={width}
        accessible={false}
      />
    ),
    [look, detail, onOpen, onLike, onFindStylists, width]
  );

  const counterStyle = useAnimatedStyle(() => ({ opacity: counterOpacity.get() }));

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${look.caption ?? look.serviceName ?? 'A look'}, photo ${index + 1} of ${total}`}
      accessibilityHint={detail ? 'Double tap to like' : 'Opens the look'}
      accessibilityValue={{ min: 1, max: total, now: index + 1 }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
      onAccessibilityAction={event => {
        const action = event.nativeEvent.actionName;
        if (action === 'increment') return goTo(index + 1);
        if (action === 'decrement') return goTo(index - 1);
        if (action === 'activate') return onOpen ? onOpen(look, index) : onLike(look, !look.liked);
      }}
    >
      {width > 0 && (
        <FlatList
          ref={listRef}
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          windowSize={3}
          initialNumToRender={1}
          initialScrollIndex={start}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          onMomentumScrollEnd={onMomentumScrollEnd}
        />
      )}
      <View style={styles.dots} pointerEvents="none">
        {photos.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === index && [styles.dotActive, { backgroundColor: theme.colors.accent }],
            ]}
          />
        ))}
      </View>
      <Animated.View style={[styles.counter, counterStyle]} pointerEvents="none">
        <Text variant="caption" style={styles.counterText}>
          {index + 1}/{total}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * A look's photos. One photo renders exactly as a single image always has — no
 * list, no dots. More than one adds a horizontal, paging swiper: dots and a
 * fading counter, every photo cropped to the card's frame so it never changes
 * height as she swipes through it.
 */
export const LookPhotos = memo(function LookPhotos({
  look,
  detail,
  onOpen,
  onLike,
  onFindStylists,
  initialIndex,
}: LookPhotosProps) {
  const photos = lookPhotos(look);
  if (photos.length <= 1) {
    return (
      <Photo
        look={look}
        photo={photos[0]}
        index={0}
        detail={detail}
        onOpen={onOpen}
        onLike={onLike}
        onFindStylists={onFindStylists}
      />
    );
  }
  return (
    <Swiper
      look={look}
      photos={photos}
      detail={detail}
      onOpen={onOpen}
      onLike={onLike}
      onFindStylists={onFindStylists}
      initialIndex={initialIndex}
    />
  );
});
