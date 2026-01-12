'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GradeResultCard, FeedbackModal } from '@/components/mobile';
import { LoadingSpinner, ErrorMessage } from '@/components/shared';
import { GradeResult, SubmitFeedbackDto } from '@/lib/types';
import { getSessionResults, ApiError } from '@/lib/api';
import { useFeedback } from '@/hooks/useFeedback';

const ANONYMOUS_USER_ID = 1;

export default function MobileResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [result, setResult] = useState<GradeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const feedback = useFeedback(
    sessionId,
    result?.id || '',
    ANONYMOUS_USER_ID
  );

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const results = await getSessionResults(sessionId, ANONYMOUS_USER_ID);

        if (results && results.length > 0) {
          // Prendre le resultat le plus recent
          setResult(results[0]);
        } else {
          setError("Aucun resultat disponible. Lancez d'abord l'analyse.");
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setError('Session introuvable');
          } else {
            setError(err.message);
          }
        } else {
          setError('Erreur de connexion');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);

  const handleNewSession = () => {
    router.push('/');
  };

  const handleBackToUpload = () => {
    router.push(`/mobile/${sessionId}`);
  };

  const handleFeedbackSubmit = async (feedbackData: SubmitFeedbackDto) => {
    try {
      await feedback.submit(feedbackData);
      setShowFeedbackModal(false);
      setFeedbackSuccess(true);
    } catch {
      // Error is handled by the hook
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Chargement des resultats..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto pt-12">
          <ErrorMessage title="Resultats non disponibles" message={error} />
          <div className="flex flex-col gap-3 mt-6">
            <button
              onClick={handleBackToUpload}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Retour a l&apos;upload
            </button>
            <button
              onClick={handleNewSession}
              className="w-full py-3 px-4 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              Nouvelle session
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Resultat de l&apos;analyse
          </h1>
          <p className="text-gray-600 mt-1">Voici la note de votre carte</p>
        </div>

        {/* Result Card */}
        {result && <GradeResultCard result={result} />}

        {/* Feedback Success Message */}
        {feedbackSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-green-800">Merci pour votre retour !</p>
                <p className="text-sm text-green-600">
                  Vos corrections seront utilisees pour ameliorer le modele.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Button */}
        {result && !feedbackSuccess && (
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="mt-4 w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <span>🤔</span>
            Ces notes ne sont pas correctes ?
          </button>
        )}

        {/* Feedback Error */}
        {feedback.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {feedback.error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <button
            onClick={handleNewSession}
            className="w-full py-4 px-6 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            Analyser une autre carte
          </button>
        </div>

        {/* Session ID */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Session: {sessionId.slice(0, 8)}...
        </p>
      </div>

      {/* Feedback Modal */}
      {result && (
        <FeedbackModal
          result={result}
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={handleFeedbackSubmit}
          isSubmitting={feedback.isSubmitting}
        />
      )}
    </main>
  );
}
