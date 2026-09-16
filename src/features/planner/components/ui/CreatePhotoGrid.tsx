import React from 'react';
import { View, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { Text } from '@/shared/ui/Text';
import { ImageWithPlaceholder } from '@/shared/ui/ImageWithPlaceholder';
import { useTheme } from '@/shared/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CreatePhotoGridProps {
  photos: string[];
  onRemovePhoto: (index: number) => void;
}

export function CreatePhotoGrid({ photos, onRemovePhoto }: CreatePhotoGridProps) {
  const { theme } = useTheme();

  if (photos.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text
          variant="body"
          weight="bold"
          color={theme.colors.text.high}
          style={{ fontSize: 16, textTransform: 'uppercase', fontStyle: 'italic' }}
        >
          Added
        </Text>
        <View
          style={{
            backgroundColor: theme.colors.text.high,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            transform: [{ rotate: '3deg' }],
          }}
        >
          <Text
            variant="caption"
            weight="bold"
            color={theme.colors.surface}
            style={{ fontSize: 10 }}
          >
            {photos.length} {photos.length === 1 ? 'PIN' : 'PINS'}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {photos.map((uri, index) => (
          <Animated.View
            key={`${uri}-${index}`}
            entering={FadeIn.delay(index * 50).duration(200)}
            style={{ position: 'relative' }}
          >
            <View
              style={{
                width: (SCREEN_WIDTH - 40 - 16) / 3,
                aspectRatio: 1,
                borderRadius: 14,
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: theme.colors.text.high,
                backgroundColor: theme.colors.surface,
              }}
            >
              <ImageWithPlaceholder
                source={{ uri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => onRemovePhoto(index)}
                activeOpacity={0.7}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  backgroundColor: 'rgba(51, 51, 51, 0.8)',
                  borderRadius: 10,
                  padding: 4,
                }}
              >
                <X size={12} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}
