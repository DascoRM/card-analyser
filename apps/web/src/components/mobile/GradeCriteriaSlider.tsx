'use client';

interface GradeCriteriaSliderProps {
  label: string;
  icon: string;
  value: number;
  originalValue: number;
  onChange: (value: number) => void;
}

export function GradeCriteriaSlider({
  label,
  icon,
  value,
  originalValue,
  onChange,
}: GradeCriteriaSliderProps) {
  const diff = value - originalValue;
  const diffColor =
    Math.abs(diff) < 0.5
      ? 'text-green-600'
      : Math.abs(diff) <= 1
        ? 'text-orange-500'
        : 'text-red-500';

  const getSliderColor = (val: number): string => {
    if (val >= 9) return 'accent-green-500';
    if (val >= 7) return 'accent-blue-500';
    if (val >= 5) return 'accent-orange-500';
    return 'accent-red-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Original: {originalValue.toFixed(1)}
          </span>
          <span className={`text-sm font-bold ${diffColor}`}>
            {value.toFixed(1)}
            {diff !== 0 && (
              <span className="ml-1 text-xs">
                ({diff > 0 ? '+' : ''}
                {diff.toFixed(1)})
              </span>
            )}
          </span>
        </div>
      </div>

      <input
        type="range"
        min="1"
        max="10"
        step="0.5"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${getSliderColor(value)}`}
      />

      <div className="flex justify-between text-[10px] text-gray-400">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}
