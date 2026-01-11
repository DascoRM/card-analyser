'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GradeResultCard } from '@/components/mobile';
import { LoadingSpinner, ErrorMessage } from '@/components/shared';
import { GradeResult } from '@/lib/types';
import { getSessionResults, ApiError } from '@/lib/api';

const ANONYMOUS_USER_ID = 1;

export default function MobileResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [result, setResult] = useState<GradeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <p className="text-gray-600 mt-1">
            Voici la note de votre carte
          </p>
        </div>

        {/* Result Card */}
        {result && <GradeResultCard result={result} />}

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
    </main>
  );
}
