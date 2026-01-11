'use client';

import { useState } from 'react';
import { SessionImage, CardSide } from '@/lib/types';
import { uploadImage, ApiError } from '@/lib/api';

// userId anonyme pour le MVP (pas d'auth)
const ANONYMOUS_USER_ID = 1;

export function useImageUpload(sessionId: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (
    file: File,
    side: CardSide
  ): Promise<SessionImage | null> => {
    try {
      setIsUploading(true);
      setError(null);

      const uploadedImage = await uploadImage(
        sessionId,
        ANONYMOUS_USER_ID,
        file,
        side
      );

      return uploadedImage;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Erreur lors de l'upload");
      }
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const clearError = () => setError(null);

  return { upload, isUploading, error, clearError };
}
