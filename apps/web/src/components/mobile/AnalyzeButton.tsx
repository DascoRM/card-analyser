'use client';

interface AnalyzeButtonProps {
  onAnalyze: () => void;
  isAnalyzing: boolean;
  disabled: boolean;
  imagesCount: number;
}

export function AnalyzeButton({
  onAnalyze,
  isAnalyzing,
  disabled,
  imagesCount,
}: AnalyzeButtonProps) {
  const canAnalyze = imagesCount === 2 && !disabled;

  return (
    <div className="w-full">
      <button
        onClick={onAnalyze}
        disabled={!canAnalyze || isAnalyzing}
        className={`
          w-full py-4 px-6 rounded-xl font-semibold text-lg
          transition-all duration-200
          ${
            canAnalyze && !isAnalyzing
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {isAnalyzing ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Analyse en cours...
          </span>
        ) : (
          'Analyser la carte'
        )}
      </button>

      {imagesCount < 2 && (
        <p className="text-center text-sm text-gray-500 mt-2">
          {imagesCount === 0
            ? 'Ajoutez les photos avant et arriere'
            : 'Ajoutez la photo arriere'}
        </p>
      )}
    </div>
  );
}
