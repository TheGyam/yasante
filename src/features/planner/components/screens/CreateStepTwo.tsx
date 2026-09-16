import React from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated as RNAnimated,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Link2, Image as ImageIcon } from 'lucide-react-native';
import { Text } from '@/shared/ui/Text';
import { useTheme } from '@/shared/hooks/useTheme';
import { CreatePhotoGrid } from '../ui/CreatePhotoGrid';

interface CreateStepTwoProps {
  linkInput: string;
  setLinkInput: (v: string) => void;
  onAddLink: () => void;
  onOpenMediaPicker: () => void;
  photos: string[];
  onRemovePhoto: (index: number) => void;
}

export function CreateStepTwo({
  linkInput,
  setLinkInput,
  onAddLink,
  onOpenMediaPicker,
  photos,
  onRemovePhoto,
}: CreateStepTwoProps) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.surface,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: theme.colors.text.high,
                padding: 4,
              }}
            >
              <View style={{ padding: 12 }}>
                <Link2 size={20} color={theme.colors.primary} />
              </View>
              <TextInput
                value={linkInput}
                onChangeText={setLinkInput}
                placeholder="Paste Instagram/Pinterest Link"
                placeholderTextColor={theme.colors.primary}
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: theme.colors.text.high,
                  fontWeight: '600',
                  padding: 0,
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={onAddLink}
                activeOpacity={0.7}
                style={{
                  backgroundColor: theme.colors.text.high,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  marginRight: 2,
                }}
              >
                <Text
                  variant="caption"
                  weight="bold"
                  color={theme.colors.surface}
                  style={{ fontSize: 12, fontStyle: 'italic', textTransform: 'uppercase' }}
                >
                  Add
                </Text>
              </TouchableOpacity>
            </View>
            <Text
              variant="caption"
              weight="bold"
              color={theme.colors.primary}
              style={{
                marginTop: 8,
                fontSize: 10,
                letterSpacing: 1,
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              OR UPLOAD DIRECTLY
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <TouchableOpacity
            onPress={onOpenMediaPicker}
            activeOpacity={0.8}
            style={{
              borderWidth: 3,
              borderColor: theme.colors.text.high,
              borderRadius: 20,
              padding: 32,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              backgroundColor: theme.colors.surface,
            }}
          >
            <ImageIcon size={36} color={theme.colors.primary} strokeWidth={1.5} />
            <Text
              variant="body"
              weight="bold"
              color={theme.colors.text.high}
              style={{ marginTop: 12, textTransform: 'uppercase', fontStyle: 'italic' }}
            >
              Upload from Device
            </Text>
            <Text
              variant="caption"
              weight="bold"
              color={theme.colors.primary}
              style={{ marginTop: 4, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' }}
            >
              NO LIMIT ON PHOTOS
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <CreatePhotoGrid photos={photos} onRemovePhoto={onRemovePhoto} />

        <View style={{ height: 250 }} />
      </ScrollView>
    </Animated.View>
  );
}
