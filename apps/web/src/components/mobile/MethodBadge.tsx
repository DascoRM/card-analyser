'use client';

interface MethodBadgeProps {
  method?: string;
  modelVersion?: string;
}

export function MethodBadge({ method, modelVersion }: MethodBadgeProps) {
  if (!method) return null;

  const isRuleBased = method === 'rule_based';

  return (
    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">
          Methode d&apos;analyse
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              isRuleBased
                ? 'bg-blue-100 text-blue-800'
                : 'bg-purple-100 text-purple-800'
            }`}
          >
            <span>{isRuleBased ? '📐' : '🤖'}</span>
            {isRuleBased ? 'Regles metier' : 'IA predictive'}
          </span>
          {modelVersion && (
            <code className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-[10px] font-mono">
              {modelVersion}
            </code>
          )}
        </div>
      </div>
    </div>
  );
}
