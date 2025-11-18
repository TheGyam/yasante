import { useState } from 'react';
import { pickImageFromLibrary, takePhoto, compressImage, ImagePickerResult } from '@/services/imageService';

export function useImagePicker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFromLibrary = async (compress: boolean = true): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await pickImageFromLibrary();
      if (!result) return null;

      if (compress) {
        const compressedUri = await compressImage(result.uri);
        return compressedUri;
      }
      return result.uri;
    } catch (err: any) {
      setError(err.message || 'Failed to pick image');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const takePicture = async (compress: boolean = true): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await takePhoto();
      if (!result) return null;

      if (compress) {
        const compressedUri = await compressImage(result.uri);
        return compressedUri;
      }
      return result.uri;
    } catch (err: any) {
      setError(err.message || 'Failed to take photo');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    pickFromLibrary,
    takePicture,
    loading,
    error,
  };
}

