import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { apiClient } from '@/shared/lib/api/client';

export interface ImagePickerResult {
  uri: string;
  width: number;
  height: number;
  type?: string;
}

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Pick image from library
 */
export async function pickImageFromLibrary(): Promise<ImagePickerResult | null> {
  const hasPermission = await requestMediaLibraryPermissions();
  if (!hasPermission) {
    throw new Error('Media library permission not granted');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    type: asset.type ?? undefined,
  };
}

/**
 * Pick several images at once, for a portfolio someone fills in one sitting.
 * No cropping: choosing twenty photos and cropping each is nobody's afternoon.
 */
export async function pickImagesFromLibrary(limit = 20): Promise<ImagePickerResult[]> {
  const hasPermission = await requestMediaLibraryPermissions();
  if (!hasPermission) {
    throw new Error('Media library permission not granted');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 0.8,
  });

  if (result.canceled) return [];

  return result.assets.map(asset => ({
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    type: asset.type ?? undefined,
  }));
}

/**
 * Take photo with camera
 */
export async function takePhoto(): Promise<ImagePickerResult | null> {
  const hasPermission = await requestCameraPermissions();
  if (!hasPermission) {
    throw new Error('Camera permission not granted');
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    type: asset.type ?? undefined,
  };
}

/**
 * Compress and resize image
 */
export async function compressImage(
  uri: string,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<string> {
  try {
    // Width only: giving both would stretch every photo into a square.
    const manipulated = await manipulateAsync(uri, [{ resize: { width: maxWidth } }], {
      compress: quality,
      format: SaveFormat.JPEG,
    });
    return manipulated.uri;
  } catch (error) {
    console.error('Error compressing image:', error);
    return uri; // Return original if compression fails
  }
}

export interface UploadedPhoto {
  uri: string;
  /** A ~400px-wide copy for grids. */
  thumbUri?: string;
  /** A 1080-wide copy for feeds; the full size is for the photo's own page. */
  feedUri?: string;
  /** Width ÷ height, so tiles are sized before the photo loads. */
  photoAspect?: number;
}

/**
 * Send a photo picked on this device to the server and get back where it lives.
 * A photo that's already online (a portfolio photo, a seeded look) is returned as
 * it is. With the mock backend there is nowhere to send it, so the local copy stands.
 */
export async function uploadImage(
  uri: string,
  /** What it's for: a proof-of-work photo is kept private; looks and portfolio are checked for copies. */
  kind?: 'look' | 'portfolio' | 'avatar' | 'proof'
): Promise<UploadedPhoto> {
  if (/^https?:\/\//.test(uri) || process.env.EXPO_PUBLIC_API_MOCKS === 'true') return { uri };
  const form = new FormData();
  if (Platform.OS === 'web') {
    // On the web a picked photo is a blob: or data: URL; send the bytes themselves.
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, 'photo.jpg');
  } else {
    form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  if (kind) form.append('kind', kind);
  const response = await apiClient.post<UploadedPhoto>('/api/uploads/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
  });
  return response.data;
}
