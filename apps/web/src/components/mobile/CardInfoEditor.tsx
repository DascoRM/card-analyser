'use client';

import { useState, useEffect } from 'react';
import { UpdateCardInfoDto, CardSearchResult } from '@/lib/types';
import { CardAutoCompleteInput } from './CardAutoCompleteInput';

interface CardInfoEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (info: UpdateCardInfoDto) => Promise<void>;
  initialData?: Partial<UpdateCardInfoDto>;
  isSaving: boolean;
}

export function CardInfoEditor({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
}: CardInfoEditorProps) {
  const [cardName, setCardName] = useState(initialData?.cardName || '');
  const [cardSet, setCardSet] = useState(initialData?.cardSet || '');
  const [cardYear, setCardYear] = useState<number | undefined>(
    initialData?.cardYear
  );
  const [selectedCard, setSelectedCard] = useState<CardSearchResult | null>(
    null
  );

  // Reset form when modal opens with new initial data
  useEffect(() => {
    if (isOpen) {
      setCardName(initialData?.cardName || '');
      setCardSet(initialData?.cardSet || '');
      setCardYear(initialData?.cardYear);
      setSelectedCard(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleCardSelect = (card: CardSearchResult) => {
    setSelectedCard(card);
    setCardName(card.name);
    setCardSet(card.set);
    if (card.releaseDate) {
      const year = parseInt(card.releaseDate.substring(0, 4), 10);
      if (!isNaN(year)) {
        setCardYear(year);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      cardName: cardName || undefined,
      cardSet: cardSet || undefined,
      cardYear,
    });
  };

  const canSave = cardName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
          <h2 className="text-lg font-bold">Informations de la carte</h2>
          <p className="text-sm opacity-80">
            Recherchez ou saisissez les details manuellement
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* Card name with auto-complete */}
          <CardAutoCompleteInput
            label="Nom de la carte"
            placeholder="Ex: Pikachu, Charizard..."
            value={cardName}
            onChange={setCardName}
            onSelect={handleCardSelect}
          />

          {/* Card set */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Set / Extension
            </label>
            <input
              type="text"
              value={cardSet}
              onChange={(e) => setCardSet(e.target.value)}
              placeholder="Ex: Base Set, Scarlet & Violet..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Card year */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Annee
            </label>
            <input
              type="number"
              value={cardYear || ''}
              onChange={(e) =>
                setCardYear(e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="Ex: 1999, 2023..."
              min="1996"
              max={new Date().getFullYear() + 1}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Selected card preview */}
          {selectedCard && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">Carte selectionnee:</p>
              <div className="flex items-center gap-3">
                {selectedCard.imageUrl && (
                  <img
                    src={selectedCard.imageUrl}
                    alt={selectedCard.name}
                    className="w-16 h-22 object-cover rounded shadow"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900">{selectedCard.name}</p>
                  <p className="text-sm text-gray-500">{selectedCard.set}</p>
                  {selectedCard.number && (
                    <p className="text-xs text-gray-400">#{selectedCard.number}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving || !canSave}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Enregistrement...
                </span>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
