import React, { useRef, useMemo, useCallback, useState } from 'react';
import { View, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowLeft, Share2, Edit, Info, Camera } from 'lucide-react-native';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { useMoodBoardEntry } from '@/features/planner';
import { ImageWithPlaceholder } from '@/shared/legacy/ui/ImageWithPlaceholder';
import { Text } from '@/shared/legacy/ui/Text';
import { shareMoodBoardEntry } from '@/features/planner';
import { format } from 'date-fns';
import { BoardDetailsSheetContent } from '@/features/planner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLUMN_GAP = 8;
const NUM_COLUMNS = 2;
const PADDING = 16;

const getPhotoHeight = (index: number): number => {
  const heights = [200, 260, 180, 240, 220, 280, 190, 250];
  return heights[index % heights.length];
};

export default function MoodBoardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: entry, isLoading } = useMoodBoardEntry(id || '');
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const snapPoints = useMemo(() => ['55%'], []);

  const handleBack = () => router.back();
  const handleEdit = () => router.push(`/(tabs)/planner/moodboard/edit/${id}` as any);
  const handleShare = async () => {
    if (entry) await shareMoodBoardEntry(entry);
  };

  const handleOpenDetails = useCallback(() => {
    setDetailsOpen(true);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const columns = useMemo(() => {
    if (!entry?.photos?.length) return [[], []];
    const col1: { uri: string; height: number; index: number }[] = [];
    const col2: { uri: string; height: number; index: number }[] = [];
    let h1 = 0,
      h2 = 0;

    entry.photos.forEach((uri: string, index: number) => {
      const height = getPhotoHeight(index);
      if (h1 <= h2) {
        col1.push({ uri, height, index });
        h1 += height + COLUMN_GAP;
      } else {
        col2.push({ uri, height, index });
        h2 += height + COLUMN_GAP;
      }
    });

    return [col1, col2];
  }, [entry?.photos]);

  let appointmentDate = '';
  if (entry?.appointmentTime) {
    try {
      const date = new Date(entry.appointmentTime);
      if (!isNaN(date.getTime())) {
        appointmentDate = format(date, 'EEEE, MMM d, yyyy · h:mm a');
      }
    } catch {}
  }

  if (isLoading || !entry) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
        }}
      >
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: theme.colors.surface,
            borderWidth: 2,
            borderColor: theme.colors.text.high,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={20} color={theme.colors.text.high} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            variant="body"
            color={theme.colors.primary}
            weight="bold"
            style={{ textTransform: 'uppercase', letterSpacing: 2 }}
          >
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      testID="moodboard-detail-screen"
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.colors.background,
          borderBottomWidth: 4,
          borderBottomColor: theme.colors.border,
          zIndex: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: theme.colors.surface,
              borderWidth: 2,
              borderColor: theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={18} color={theme.colors.text.high} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              variant="h3"
              weight="bold"
              color={theme.colors.text.high}
              numberOfLines={1}
              style={{
                fontSize: 20,
                textTransform: 'uppercase',
                fontStyle: 'italic',
                letterSpacing: -1,
              }}
            >
              {entry.name}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={handleShare}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: theme.colors.surface,
              borderWidth: 2,
              borderColor: theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Share2 size={16} color={theme.colors.text.high} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleEdit}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: theme.colors.primary,
              borderWidth: 2,
              borderColor: theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Edit size={16} color={theme.colors.surface} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Masonry Photo Grid */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: PADDING,
          paddingTop: 16,
          paddingBottom: insets.bottom + 240,
        }}
        showsVerticalScrollIndicator={false}
      >
        {entry.photos && entry.photos.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: COLUMN_GAP }}>
            {columns.map((column, colIndex) => (
              <View key={colIndex} style={{ flex: 1, gap: COLUMN_GAP }}>
                {column.map(photo => (
                  <Animated.View
                    key={photo.index}
                    entering={FadeIn.delay(photo.index * 60).duration(300)}
                  >
                    <View style={{ position: 'relative' }}>
                      <View
                        style={{
                          height: photo.height,
                          borderRadius: 16,
                          overflow: 'hidden',
                          borderWidth: 2,
                          borderColor: theme.colors.text.high,
                          backgroundColor: theme.colors.surface,
                        }}
                      >
                        <ImageWithPlaceholder
                          source={{ uri: photo.uri }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      </View>
                    </View>
                  </Animated.View>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <View
              style={{
                width: 80,
                height: 80,
                backgroundColor: theme.colors.primary,
                borderWidth: 4,
                borderColor: theme.colors.text.high,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                transform: [{ rotate: '-10deg' }],
              }}
            >
              <Camera size={40} color={theme.colors.surface} strokeWidth={2} />
            </View>
            <Text
              variant="h3"
              weight="bold"
              color={theme.colors.text.high}
              style={{
                textTransform: 'uppercase',
                fontStyle: 'italic',
                fontSize: 22,
                marginBottom: 4,
              }}
            >
              NO PINS YET
            </Text>
            <Text
              variant="caption"
              weight="bold"
              color={theme.colors.primary}
              style={{
                letterSpacing: 3,
                textTransform: 'uppercase',
                fontSize: 9,
              }}
            >
              ADD MEDIA TO THIS BOARD
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Details Button */}
      {!detailsOpen && (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 100,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 20,
          }}
        >
          <TouchableOpacity
            onPress={handleOpenDetails}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 28,
              paddingVertical: 16,
              backgroundColor: theme.colors.accentSecondary || theme.colors.accent,
              borderWidth: 4,
              borderColor: theme.colors.text.high,
              borderRadius: 20,
              shadowColor: theme.colors.text.high,
              shadowOffset: { width: 4, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 8,
            }}
          >
            <Info size={18} color={theme.colors.text.high} strokeWidth={2.5} />
            <Text
              variant="body"
              weight="bold"
              color={theme.colors.text.high}
              style={{ fontSize: 15, textTransform: 'uppercase', fontStyle: 'italic' }}
            >
              Details
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Details Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={-1}
        enablePanDownToClose={true}
        onClose={() => setDetailsOpen(false)}
        backgroundStyle={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          borderColor: theme.colors.text.high,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.colors.primary,
          width: 40,
          height: 5,
          borderRadius: 3,
        }}
      >
        <BoardDetailsSheetContent entry={entry as any} appointmentDate={appointmentDate} />
      </BottomSheet>
    </View>
  );
}
