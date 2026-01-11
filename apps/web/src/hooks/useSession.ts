'use client';

import { useState, useEffect, useCallback } from 'react';
import { Session } from '@/lib/types';
import { getSession, ApiError } from '@/lib/api';

// userId anonyme pour le MVP (pas d'auth)
const ANONYMOUS_USER_ID = 1;

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await getSession(sessionId, ANONYMOUS_USER_ID);
      setSession(data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('Session introuvable');
        } else {
          setError(`Erreur ${err.status}: ${err.message}`);
        }
      } else {
        setError('Erreur de connexion');
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return { session, isLoading, error, refetch: fetchSession };
}
