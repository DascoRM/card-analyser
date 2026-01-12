'use client';

import { GradeResult } from '@/lib/types';
import { MethodBadge } from './MethodBadge';
import { GradeCriteriaBar } from './GradeCriteriaBar';

interface GradeResultCardProps {
  result: GradeResult;
}

const gradeColors: Record<number, string> = {
  10: 'from-yellow-400 to-amber-500',
  9: 'from-green-400 to-emerald-500',
  8: 'from-blue-400 to-blue-500',
  7: 'from-cyan-400 to-cyan-500',
  6: 'from-purple-400 to-purple-500',
  5: 'from-orange-400 to-orange-500',
  4: 'from-red-300 to-red-400',
  3: 'from-red-400 to-red-500',
  2: 'from-red-500 to-red-600',
  1: 'from-gray-400 to-gray-500',
};

export function GradeResultCard({ result }: GradeResultCardProps) {
  const gradeInt = Math.floor(result.finalGrade);
  const gradientClass = gradeColors[gradeInt] || gradeColors[5];

  const criteria = [
    { label: 'Centrage', value: result.centering, icon: '🎯' },
    { label: 'Coins', value: result.corners, icon: '📐' },
    { label: 'Bords', value: result.edges, icon: '📏' },
    { label: 'Surface', value: result.surface, icon: '✨' },
    { label: 'Impression', value: result.printQuality, icon: '🖨️' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header avec note finale */}
      <div className={`bg-gradient-to-r ${gradientClass} p-6 text-white`}>
        <div className="text-center">
          <p className="text-sm uppercase tracking-wide opacity-90">
            Note finale
          </p>
          <p className="text-6xl font-bold mt-1">
            {result.finalGrade.toFixed(1)}
          </p>
          <p className="text-xl font-semibold mt-1">{result.gradeLabel}</p>
          <p className="text-sm mt-2 opacity-80">Echelle {result.scale}</p>
        </div>
      </div>

      {/* Badge methode d'analyse */}
      <MethodBadge method={result.method} modelVersion={result.modelVersion} />

      {/* Details des criteres */}
      <div className="p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Details par critere
        </h3>

        <div className="space-y-4">
          {criteria.map((criterion) => (
            <GradeCriteriaBar
              key={criterion.label}
              label={criterion.label}
              icon={criterion.icon}
              value={criterion.value}
            />
          ))}
        </div>
      </div>

      {/* Section confiance et metadonnees */}
      <div className="px-6 pb-6">
        <div className="pt-4 border-t border-gray-100 space-y-3">
          {/* Barre de confiance */}
          {result.confidence !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <span>🎯</span> Niveau de confiance
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {(result.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${result.confidence * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Date d'analyse */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
            <span>Analyse le</span>
            <span className="font-medium">
              {new Date(result.createdAt).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
