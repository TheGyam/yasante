import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
// Temporarily disabled - expo-image-picker may require dev build
// import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/theme';
import { responsive } from '@/utils/responsive';
import { ScaleInView } from '../animations/ScaleIn';

interface PhotoUploadProps {
  onImageSelected?: (uri: string) => void;
  imageUri?: string;
  label?: string;
  maxWidth?: number;
  maxHeight?: number;
  aspect?: [number, number];
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onImageSelected,
  imageUri,
  label = 'Upload Photo',
  maxWidth = 800,
  maxHeight = 800,
  aspect,
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  
  // Ensure loading is always a boolean
  const loadingBool = Boolean(loading);

  // Temporarily disabled - expo-image-picker may require dev build
  const requestPermissions = async () => {
    Alert.alert('Info', 'Image picker temporarily disabled');
    return false;
  };

  const handleImagePicker = async () => {
    Alert.alert('Info', 'Image picker temporarily disabled');
  };

  const handleCamera = async () => {
    Alert.alert('Info', 'Camera temporarily disabled');
  };

  const showImageOptions = () => {
    Alert.alert(
      'Select Photo',
      'Choose an option',
      [
        { text: 'Camera', onPress: handleCamera },
        { text: 'Gallery', onPress: handleImagePicker },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  if (imageUri) {
    return (
      <View style={{ marginBottom: theme.spacing[4] }}>
        {label && (
          <Text
            style={{
              fontSize: responsive.fontScale(theme.typography.fontSize.sm),
              fontFamily: theme.typography.fontFamily.medium,
              color: theme.colors.text,
              marginBottom: theme.spacing[2],
            }}
          >
            {label}
          </Text>
        )}
        <ScaleInView>
          <View
            style={{
              borderRadius: theme.sizes.borderRadius.lg,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Image
              source={{ uri: imageUri }}
              style={{
                width: '100%',
                height: 200,
                backgroundColor: theme.colors.surfaceVariant,
              }}
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={showImageOptions}
              style={{
                position: 'absolute',
                top: theme.spacing[2],
                right: theme.spacing[2],
                backgroundColor: theme.colors.overlay,
                borderRadius: theme.sizes.borderRadius.full,
                padding: theme.spacing[2],
              }}
            >
              <Text style={{ color: theme.colors.background, fontSize: 12 }}>
                Change
              </Text>
            </TouchableOpacity>
          </View>
        </ScaleInView>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: theme.spacing[4] }}>
      {label && (
        <Text
          style={{
            fontSize: responsive.fontScale(theme.typography.fontSize.sm),
            fontFamily: theme.typography.fontFamily.medium,
            color: theme.colors.text,
            marginBottom: theme.spacing[2],
          }}
        >
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={showImageOptions}
        disabled={loadingBool}
        style={{
          height: 150,
          borderRadius: theme.sizes.borderRadius.lg,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceVariant,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loadingBool ? 0.6 : 1,
        }}
      >
        {loadingBool ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : (
          <>
            <Text
              style={{
                fontSize: responsive.fontScale(theme.typography.fontSize.lg),
                color: theme.colors.primary,
                marginBottom: theme.spacing[1],
              }}
            >
              📷
            </Text>
            <Text
              style={{
                fontSize: responsive.fontScale(theme.typography.fontSize.sm),
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.fontFamily.medium,
              }}
            >
              Tap to upload
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

