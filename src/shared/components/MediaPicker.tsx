import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import { useImagePicker } from '@/shared/hooks/useImagePicker';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { Card } from '@/shared/ui/Card';
import type { Theme } from '@/shared/theme/ThemeProvider';

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: flex-end;
`;

const ModalContent = styled(Card)`
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[5]}px;
`;

const OptionButton = styled(Button)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

export interface MediaPickerProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (uri: string) => void;
  testID?: string;
}

export function MediaPicker({ visible, onClose, onImageSelected, testID }: MediaPickerProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { pickFromLibrary, takePicture, loading, error } = useImagePicker();

  const handlePickFromLibrary = async () => {
    const uri = await pickFromLibrary();
    if (uri) {
      onImageSelected(uri);
      onClose();
    } else if (error) {
      Alert.alert('Error', error);
    }
  };

  const handleTakePicture = async () => {
    const uri = await takePicture();
    if (uri) {
      onImageSelected(uri);
      onClose();
    } else if (error) {
      Alert.alert('Error', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <ModalOverlay>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <ModalContent
          style={{ paddingBottom: Math.max(theme.spacing[5], insets.bottom + theme.spacing[2]) }}
        >
          <Text variant="h3" weight="semibold" style={{ marginBottom: theme.spacing[4] }}>
            Select Photo
          </Text>
          <OptionButton
            variant="primary"
            onPress={handleTakePicture}
            loading={loading}
            fullWidth
            testID={testID ? `${testID}-camera` : undefined}
          >
            Take Photo
          </OptionButton>
          <OptionButton
            variant="secondary"
            onPress={handlePickFromLibrary}
            loading={loading}
            fullWidth
            testID={testID ? `${testID}-library` : undefined}
          >
            Choose from Library
          </OptionButton>
          <Button variant="ghost" onPress={onClose} fullWidth>
            Cancel
          </Button>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
}
