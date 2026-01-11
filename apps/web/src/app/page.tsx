'use client';

import { useCreateSession } from '@/hooks';
import { QRCodeDisplay, SessionInfo } from '@/components/desktop';
import { LoadingSpinner, ErrorMessage } from '@/components/shared';

export default function HomePage() {
  const { session, isLoading, error, retry } = useCreateSession();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Card Grading
          </h1>
          <p className="text-lg text-gray-600">
            Certification automatique de cartes a collectionner
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center gap-8">
          {isLoading ? (
            <div className="py-12">
              <LoadingSpinner size="lg" text="Creation de la session..." />
            </div>
          ) : error ? (
            <div className="w-full max-w-md">
              <ErrorMessage
                title="Erreur de connexion"
                message={error}
                onRetry={retry}
              />
              <p className="text-center text-sm text-gray-500 mt-4">
                Verifiez que l&apos;API est en cours d&apos;execution sur{' '}
                <code className="bg-gray-100 px-1 rounded">localhost:3000</code>
              </p>
            </div>
          ) : session ? (
            <>
              {/* QR Code */}
              <QRCodeDisplay sessionId={session.id} />

              {/* Instructions */}
              <div className="bg-white rounded-xl shadow-sm p-6 max-w-md">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📱</span>
                  Comment ca marche ?
                </h2>
                <ol className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                      1
                    </span>
                    <span>Scannez le QR code avec votre telephone</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                      2
                    </span>
                    <span>Prenez une photo de la face avant de la carte</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                      3
                    </span>
                    <span>Prenez une photo de la face arriere</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                      4
                    </span>
                    <span>Lancez l&apos;analyse et decouvrez la note!</span>
                  </li>
                </ol>
              </div>

              {/* Session Info */}
              <SessionInfo session={session} />

              {/* New Session Button */}
              <button
                onClick={retry}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Nouvelle session
              </button>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
