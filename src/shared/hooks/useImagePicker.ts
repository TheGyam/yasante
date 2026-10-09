import { useState } from 'react';
import {
  pickImageFromLibrary,
  pickImagesFromLibrary,
  takePhoto,
  compressImage,
  ImagePickerResult,
} from '@/shared/lib/imageService';

/** A photo that couldn't be had, in words: permission, or anything else. */
function pickerMessage(err: unknown) {
  return /permission/i.test(String((err as Error)?.message))
    ? 'Allow access to your photos in Settings, then try again.'
    : 'That photo couldn’t be added. Please try another.';
}

export function useImagePicker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFromLibrary = async (compress = true, square = false): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await pickImageFromLibrary(square);
      if (!result) return null;

      if (compress) {
        const compressedUri = await compressImage(result.uri);
        return compressedUri;
      }
      return result.uri;
    } catch (err: any) {
      // Said out loud by the caller: "no access" silently doing nothing reads as broken.
      setError(pickerMessage(err));
      throw err;
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
      setError(pickerMessage(err));
      return [];
    } finally {
      setLoading(false);
    }
  };

  const takePicture = async (compress = true, square = false): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await takePhoto(square);
      if (!result) return null;

      if (compress) {
        const compressedUri = await compressImage(result.uri);
        return compressedUri;
      }
      return result.uri;
    } catch (err: any) {
      // Said out loud by the caller: "no access" silently doing nothing reads as broken.
      setError(pickerMessage(err));
      throw err;
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
