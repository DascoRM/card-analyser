'use client';

import { Session } from '@/lib/types';

interface SessionInfoProps {
  session: Session;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  UPLOADING: { label: 'Upload en cours', color: 'bg-blue-100 text-blue-800' },
  ANALYZING: { label: 'Analyse en cours', color: 'bg-purple-100 text-purple-800' },
  COMPLETED: { label: 'Termine', color: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Echec', color: 'bg-red-100 text-red-800' },
  ARCHIVED: { label: 'Archive', color: 'bg-gray-100 text-gray-800' },
};

export function SessionInfo({ session }: SessionInfoProps) {
  const status = statusLabels[session.status] || statusLabels.PENDING;

  return (
    <div className="bg-white rounded-lg shadow p-4 w-full max-w-sm">
      <h3 className="text-sm font-medium text-gray-500 mb-3">
        Informations de session
      </h3>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">ID:</span>
          <span className="text-gray-900 text-sm font-mono">
            {session.id.slice(0, 8)}...
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">Statut:</span>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${status.color}`}
          >
            {status.label}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">Images:</span>
          <span className="text-gray-900 text-sm">
            {session.images?.length || 0} / 2
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">Cree le:</span>
          <span className="text-gray-900 text-sm">
            {new Date(session.createdAt).toLocaleTimeString('fr-FR')}
          </span>
        </div>
      </div>
    </div>
  );
}
