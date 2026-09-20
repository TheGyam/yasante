import { useState } from 'react';
import {
  pickImageFromLibrary,
  pickImagesFromLibrary,
  takePhoto,
  compressImage,
  ImagePickerResult,
} from '@/shared/lib/imageService';

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

  /** Several at once. Compressed one after another, which is slow but predictable. */
  const pickManyFromLibrary = async (limit?: number): Promise<string[]> => {
    try {
      setLoading(true);
      setError(null);
      const picked = await pickImagesFromLibrary(limit);
      const uris: string[] = [];
      for (const image of picked) uris.push(await compressImage(image.uri));
      return uris;
    } catch (err: any) {
      setError(err.message || 'Failed to pick images');
      return [];
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
    pickManyFromLibrary,
    takePicture,
    loading,
    error,
  };
}
