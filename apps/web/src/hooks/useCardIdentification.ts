'use client';

import { useState } from 'react';
import { identifyCard, updateSessionCardInfo } from '@/lib/api';
import { CardIdentification, UpdateCardInfoDto } from '@/lib/types';

interface UseCardIdentificationReturn {
  identification: CardIdentification | null;
  isIdentifying: boolean;
  error: string | null;
  identify: () => Promise<CardIdentification>;
  updateCardInfo: (info: UpdateCardInfoDto) => Promise<void>;
  reset: () => void;
}

export function useCardIdentification(
  sessionId: string,
  userId: number = 1
): UseCardIdentificationReturn {
  const [identification, setIdentification] =
    useState<CardIdentification | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identify = async (): Promise<CardIdentification> => {
    setIsIdentifying(true);
    setError(null);

    try {
      const result = await identifyCard(sessionId, userId);
      setIdentification(result);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur identification';
      setError(message);
      throw err;
    } finally {
      setIsIdentifying(false);
    }
  };

  const updateCardInfo = async (info: UpdateCardInfoDto): Promise<void> => {
    setError(null);

    try {
      await updateSessionCardInfo(sessionId, userId, info);
      // Update local state
      if (identification) {
        setIdentification({
          ...identification,
          cardName: info.cardName || identification.cardName,
          cardSet: info.cardSet,
          cardYear: info.cardYear,
          cardType: info.cardType,
          confidence: 1, // Manual correction = high confidence
          method: 'manual',
        });
      } else {
        setIdentification({
          cardName: info.cardName || 'Unknown',
          cardSet: info.cardSet,
          cardYear: info.cardYear,
          cardType: info.cardType,
          confidence: 1,
          method: 'manual',
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur mise à jour';
      setError(message);
      throw err;
    }
  };

  const reset = () => {
    setIdentification(null);
    setError(null);
  };

  return {
    identification,
    isIdentifying,
    error,
    identify,
    updateCardInfo,
    reset,
  };
}
