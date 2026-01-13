'use client';

interface GradeCriteriaBarProps {
  label: string;
  icon: string;
  value: number;
  max?: number;
}

export function GradeCriteriaBar({
  label,
  icon,
  value,
  max = 10,
}: GradeCriteriaBarProps) {
  const percentage = (value / max) * 100;

  const getColorClass = (val: number): string => {
    if (val >= 9) return 'from-green-400 to-emerald-500';
    if (val >= 7) return 'from-blue-400 to-blue-500';
    if (val >= 5) return 'from-orange-400 to-orange-500';
    return 'from-red-400 to-red-500';
  };

  const getTextColor = (val: number): string => {
    if (val >= 9) return 'text-green-600';
    if (val >= 7) return 'text-blue-600';
    if (val >= 5) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className={`text-lg font-bold ${getTextColor(value)}`}>
          {value % 1 === 0 ? value.toString() : value.toFixed(1)}
        </span>
      </div>

      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        {/* Paliers visuels */}
        <div className="absolute inset-0 flex">
          <div className="flex-1 border-r border-white/30" />
          <div className="flex-1 border-r border-white/30" />
          <div className="flex-1 border-r border-white/30" />
          <div className="flex-1" />
        </div>

        {/* Barre de progression */}
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getColorClass(value)} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Labels des paliers */}
      <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
        <span>Faible</span>
        <span>Moyen</span>
        <span>Bon</span>
        <span>Excellent</span>
      </div>
    </div>
  );
}
