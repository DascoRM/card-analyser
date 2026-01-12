'use client';

import { useState } from 'react';
import { GradeResult, SubmitFeedbackDto } from '@/lib/types';
import { GradeCriteriaSlider } from './GradeCriteriaSlider';

interface FeedbackModalProps {
  result: GradeResult;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: SubmitFeedbackDto) => Promise<void>;
  isSubmitting: boolean;
}

export function FeedbackModal({
  result,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: FeedbackModalProps) {
  const [centering, setCentering] = useState(result.centering);
  const [corners, setCorners] = useState(result.corners);
  const [edges, setEdges] = useState(result.edges);
  const [surface, setSurface] = useState(result.surface);
  const [printQuality, setPrintQuality] = useState(result.printQuality);
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    await onSubmit({
      centering,
      corners,
      edges,
      surface,
      printQuality,
      comment: comment.trim() || undefined,
    });
  };

  const hasChanges =
    centering !== result.centering ||
    corners !== result.corners ||
    edges !== result.edges ||
    surface !== result.surface ||
    printQuality !== result.printQuality;

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
          <h2 className="text-lg font-bold">Corriger les notes</h2>
          <p className="text-sm opacity-80">
            Ajustez les scores selon votre evaluation
          </p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <GradeCriteriaSlider
            label="Centrage"
            icon="🎯"
            value={centering}
            originalValue={result.centering}
            onChange={setCentering}
          />

          <GradeCriteriaSlider
            label="Coins"
            icon="📐"
            value={corners}
            originalValue={result.corners}
            onChange={setCorners}
          />

          <GradeCriteriaSlider
            label="Bords"
            icon="📏"
            value={edges}
            originalValue={result.edges}
            onChange={setEdges}
          />

          <GradeCriteriaSlider
            label="Surface"
            icon="✨"
            value={surface}
            originalValue={result.surface}
            onChange={setSurface}
          />

          <GradeCriteriaSlider
            label="Impression"
            icon="🖨️"
            value={printQuality}
            originalValue={result.printQuality}
            onChange={setPrintQuality}
          />

          {/* Comment */}
          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commentaire (optionnel)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Expliquez vos corrections..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">
              {comment.length}/500
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasChanges}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
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
                Envoi...
              </span>
            ) : (
              'Valider'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
