'use client';

import { GradeResult } from '@/lib/types';

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
          <p className="text-sm mt-2 opacity-80">
            Echelle {result.scale}
          </p>
        </div>
      </div>

      {/* Details des criteres */}
      <div className="p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Details par critere
        </h3>

        <div className="space-y-3">
          {criteria.map((criterion) => (
            <div key={criterion.label} className="flex items-center gap-3">
              <span className="text-xl">{criterion.icon}</span>
              <span className="flex-1 text-gray-700">{criterion.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${gradientClass} rounded-full`}
                    style={{ width: `${criterion.value * 10}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-8">
                  {criterion.value.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Confiance du modele */}
        {result.confidence && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Confiance du modele</span>
              <span className="font-medium text-gray-700">
                {(result.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
