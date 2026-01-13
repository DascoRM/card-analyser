'use client';

import { CardIdentification } from '@/lib/types';
import { LoadingSpinner } from '@/components/shared';

interface CardIdentificationBannerProps {
  identification: CardIdentification | null;
  isIdentifying: boolean;
  onEdit: () => void;
}

type ConfidenceLevel = 'high' | 'medium' | 'low';

function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.3) return 'medium';
  return 'low';
}

export function CardIdentificationBanner({
  identification,
  isIdentifying,
  onEdit,
}: CardIdentificationBannerProps) {
  // Loading state
  if (isIdentifying) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-center gap-3">
          <LoadingSpinner size="sm" />
          <p className="text-blue-700">Identification de la carte en cours...</p>
        </div>
      </div>
    );
  }

  // No identification yet
  if (!identification) {
    return null;
  }

  const level = getConfidenceLevel(identification.confidence);

  // High confidence
  if (level === 'high') {
    return (
      <div className="p-4 bg-green-50 border-2 border-green-300 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="font-semibold text-green-800">Carte detectee</p>
              <p className="text-sm text-green-700">
                {identification.cardName}
                {identification.cardSet && ` - ${identification.cardSet}`}
                {identification.cardYear && ` (${identification.cardYear})`}
              </p>
            </div>
          </div>
          <button
            onClick={onEdit}
            className="text-green-700 underline text-sm hover:text-green-800"
          >
            Modifier
          </button>
        </div>
        {identification.cardImageUrl && (
          <div className="mt-3 flex justify-center">
            <img
              src={identification.cardImageUrl}
              alt={identification.cardName}
              className="w-20 h-28 object-cover rounded shadow-md"
            />
          </div>
        )}
      </div>
    );
  }

  // Medium confidence
  if (level === 'medium') {
    return (
      <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold text-yellow-800">
              Carte detectee (incertaine)
            </p>
            <p className="text-sm text-yellow-700">
              {identification.cardName}
              {identification.cardSet && ` - ${identification.cardSet}`}
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Veuillez verifier les informations ci-dessus
            </p>
          </div>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
          >
            Verifier
          </button>
        </div>
      </div>
    );
  }

  // Low confidence (failed)
  return (
    <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl">
      <div className="flex items-center gap-3">
        <span className="text-2xl">❌</span>
        <div className="flex-1">
          <p className="font-semibold text-red-800">
            Impossible d&apos;identifier la carte
          </p>
          <p className="text-sm text-red-700">
            Cliquez pour rechercher manuellement
          </p>
        </div>
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
        >
          Rechercher
        </button>
      </div>
    </div>
  );
}
