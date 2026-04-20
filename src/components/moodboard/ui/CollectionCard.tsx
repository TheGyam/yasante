import React from 'react';
import { View, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CheckCircle2, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { ImageWithPlaceholder } from '@/components/ui/ImageWithPlaceholder';
import { useTheme } from '@/hooks/useTheme';
import type { MoodBoardEntry } from '@/types/planner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CollectionCardProps {
  entry: MoodBoardEntry;
  index: number;
}

export function CollectionCard({ entry, index }: CollectionCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  
  const isCompleted = entry.completed ?? false;
  const photos = entry.photos || [];
  const cardWidth = (SCREEN_WIDTH - 64) / 2;

  return (
    <Animated.View
      key={entry.id}
      entering={FadeIn.delay(index * 100).duration(300)}
      style={{ width: cardWidth, marginBottom: 24 }}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`/(tabs)/planner/moodboard/${entry.id}` as any)}
        style={{ width: '100%' }}
      >
        <View style={{ position: 'relative' }}>
          <View style={{
            position: 'absolute', top: 4, left: 4, right: -4, bottom: -4,
            backgroundColor: theme.colors.primary, borderRadius: 16,
            borderWidth: 2, borderColor: theme.colors.text.high,
          }} />
          <View style={{
            height: cardWidth * 1.1, borderRadius: 16, overflow: 'hidden',
            borderWidth: 2, borderColor: theme.colors.text.high,
            backgroundColor: theme.colors.surface,
          }}>
            {photos.length > 0 ? (
              <>
                <ImageWithPlaceholder source={{ uri: photos[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                {isCompleted && (
                  <View style={{
                    position: 'absolute', top: 8, left: 8,
                    backgroundColor: theme.colors.primary, borderRadius: 8,
                    borderWidth: 2, borderColor: theme.colors.text.high,
                    paddingHorizontal: 8, paddingVertical: 3,
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                  }}>
                    <CheckCircle2 size={12} color={theme.colors.surface} strokeWidth={2.5} />
                    <Text variant="caption" weight="bold" color={theme.colors.surface} style={{ fontSize: 9 }}>DONE</Text>
                  </View>
                )}
                {photos.length > 1 && (
                  <View style={{
                    position: 'absolute', bottom: 8, right: 8,
                    backgroundColor: theme.colors.text.high, borderRadius: 8,
                    paddingHorizontal: 8, paddingVertical: 3,
                  }}>
                    <Text variant="caption" weight="bold" color={theme.colors.surface} style={{ fontSize: 10 }}>
                      +{photos.length - 1}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={{
                flex: 1, alignItems: 'center', justifyContent: 'center',
                backgroundColor: theme.colors.background,
              }}>
                <Camera size={28} color={theme.colors.primary} strokeWidth={1.5} />
              </View>
            )}
          </View>
        </View>

        <View style={{ marginTop: 10, paddingRight: 4 }}>
          <Text variant="body" weight="bold" color={theme.colors.text.high} numberOfLines={1} style={{ fontSize: 14 }}>
            {entry.name}
          </Text>
          <Text variant="caption" color={theme.colors.primary} style={{ marginTop: 2, fontSize: 11, fontWeight: '700' }}>
            {photos.length} {photos.length === 1 ? 'PIN' : 'PINS'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
