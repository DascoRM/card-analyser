'use client';

import { useState } from 'react';
import { submitFeedback } from '@/lib/api';
import { SubmitFeedbackDto, GradeFeedback } from '@/lib/types';

interface UseFeedbackReturn {
  submit: (feedback: SubmitFeedbackDto) => Promise<GradeFeedback>;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}

export function useFeedback(
  sessionId: string,
  resultId: string,
  userId: number
): UseFeedbackReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (feedback: SubmitFeedbackDto): Promise<GradeFeedback> => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await submitFeedback(sessionId, resultId, userId, feedback);
      setSuccess(true);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
  };

  return {
    submit,
    isSubmitting,
    error,
    success,
    reset,
  };
}
