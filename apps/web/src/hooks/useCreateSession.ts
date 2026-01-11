'use client';

import { useState, useEffect } from 'react';
import { Session } from '@/lib/types';
import { createSession, ApiError } from '@/lib/api';

// userId anonyme pour le MVP (pas d'auth)
const ANONYMOUS_USER_ID = 1;

export function useCreateSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const newSession = await createSession({
        userId: ANONYMOUS_USER_ID,
      });

      setSession(newSession);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Erreur ${err.status}: ${err.message}`);
      } else {
        setError('Impossible de creer la session');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    create();
  }, []);

  return { session, isLoading, error, retry: create };
}
