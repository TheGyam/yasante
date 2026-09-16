import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '@/shared/ui/Text';
import { useTheme } from '@/shared/hooks/useTheme';

interface BottomActionBarProps {
  onNext?: () => void;
  onSubmit?: () => void;
  isPending?: boolean;
  step: number;
  onDiscard?: () => void;
}

export function BottomActionBar({ onNext, onSubmit, isPending, step, onDiscard }: BottomActionBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();

  const handleDiscard = () => {
    Alert.alert('Discard Board?', 'You will lose all progress.', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Discard', 
        style: 'destructive', 
        onPress: () => {
          if (onDiscard) onDiscard();
          router.back();
        }
      },
    ]);
  };

  return (
    <View style={{
      position: 'absolute', bottom: insets.bottom + 90, right: 20,
      flexDirection: 'row', gap: 12, zIndex: 10,
    }}>
      <TouchableOpacity onPress={handleDiscard} activeOpacity={0.7}
        style={{
          borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16,
          alignItems: 'center', backgroundColor: theme.colors.surface,
          borderWidth: 2, borderColor: theme.colors.text.high,
        }}>
        <Text variant="body" weight="bold" color={theme.colors.text.high} style={{ fontSize: 13, textTransform: 'uppercase', fontStyle: 'italic' }}>
          Discard
        </Text>
      </TouchableOpacity>

      {step === 1 ? (
        <TouchableOpacity onPress={onNext} activeOpacity={0.85}
          style={{
            backgroundColor: theme.colors.primary, borderWidth: 4, borderColor: theme.colors.text.high,
            borderRadius: 16, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center',
            shadowColor: theme.colors.text.high, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8,
          }}>
          <Text variant="body" weight="bold" color={theme.colors.surface} style={{ fontSize: 16, textTransform: 'uppercase', fontStyle: 'italic' }}>
            Next Step
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={onSubmit} activeOpacity={0.85} disabled={isPending}
          style={{
            backgroundColor: theme.colors.accent, borderWidth: 4, borderColor: theme.colors.text.high,
            borderRadius: 16, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center',
            opacity: isPending ? 0.6 : 1,
            shadowColor: theme.colors.text.high, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8,
          }}>
          <Text variant="body" weight="bold" color={theme.colors.surface} style={{ fontSize: 16, textTransform: 'uppercase', fontStyle: 'italic' }}>
            {isPending ? 'Saving...' : 'Save Board'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
