'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, useImageUpload, useCardIdentification } from '@/hooks';
import {
  ImageUploader,
  AnalyzeButton,
  CardIdentificationBanner,
  CardInfoEditor,
} from '@/components/mobile';
import { LoadingSpinner, ErrorMessage } from '@/components/shared';
import { SessionImage, CardSide, UpdateCardInfoDto } from '@/lib/types';
import { analyzeSession, ApiError } from '@/lib/api';

const ANONYMOUS_USER_ID = 1;

export default function MobileUploadPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const { session, isLoading, error, refetch } = useSession(sessionId);
  const { upload, isUploading, error: uploadError, clearError } = useImageUpload(sessionId);
  const {
    identification,
    isIdentifying,
    error: identifyError,
    identify,
    updateCardInfo,
  } = useCardIdentification(sessionId, ANONYMOUS_USER_ID);

  const [frontImage, setFrontImage] = useState<SessionImage | null>(null);
  const [backImage, setBackImage] = useState<SessionImage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [isSavingCardInfo, setIsSavingCardInfo] = useState(false);
  const [identificationAttempted, setIdentificationAttempted] = useState(false);

  // Charger les images existantes
  useEffect(() => {
    if (session?.images) {
      const front = session.images.find((img) => img.side === 'FRONT');
      const back = session.images.find((img) => img.side === 'BACK');
      if (front) setFrontImage(front);
      if (back) setBackImage(back);
    }
  }, [session]);

  // Redirect si session deja completee
  useEffect(() => {
    if (session?.status === 'COMPLETED') {
      router.push(`/mobile/${sessionId}/results`);
    }
  }, [session, sessionId, router]);

  // Auto-identify card when both images are uploaded (only once)
  useEffect(() => {
    const shouldIdentify =
      frontImage &&
      backImage &&
      !identification &&
      !isIdentifying &&
      !identificationAttempted &&
      !session?.cardName; // Don't re-identify if already has card info

    if (shouldIdentify) {
      setIdentificationAttempted(true);
      identify().catch((err) => {
        console.error('Auto-identification failed:', err);
        // Don't block UX on identification failure
      });
    }
  }, [frontImage, backImage, identification, isIdentifying, identificationAttempted, session?.cardName, identify]);

  const handleUpload = async (file: File, side: CardSide) => {
    clearError();
    setAnalyzeError(null);

    const uploadedImage = await upload(file, side);

    if (uploadedImage) {
      if (side === 'FRONT') {
        setFrontImage(uploadedImage);
      } else {
        setBackImage(uploadedImage);
      }
      refetch();
    }
  };

  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      setAnalyzeError(null);

      await analyzeSession(sessionId, ANONYMOUS_USER_ID, { scale: 'PCA' });

      router.push(`/mobile/${sessionId}/results`);
    } catch (err) {
      if (err instanceof ApiError) {
        setAnalyzeError(err.message);
      } else {
        setAnalyzeError("Erreur lors de l'analyse");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveCardInfo = async (info: UpdateCardInfoDto) => {
    try {
      setIsSavingCardInfo(true);
      await updateCardInfo(info);
      setShowCardEditor(false);
      refetch(); // Refresh session data
    } catch (err) {
      console.error('Failed to save card info:', err);
    } finally {
      setIsSavingCardInfo(false);
    }
  };

  const imagesCount = (frontImage ? 1 : 0) + (backImage ? 1 : 0);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Chargement..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto pt-12">
          <ErrorMessage title="Session introuvable" message={error} />
          <p className="text-center text-sm text-gray-500 mt-4">
            Ce lien n&apos;est plus valide. Scannez un nouveau QR code.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Photographiez votre carte
          </h1>
          <p className="text-gray-600 mt-1">
            Prenez une photo de chaque face
          </p>
        </div>

        {/* Upload Sections */}
        <div className="space-y-4 mb-6">
          <ImageUploader
            side="FRONT"
            existingImage={frontImage || undefined}
            onUpload={(file) => handleUpload(file, 'FRONT')}
            isUploading={isUploading}
            disabled={isAnalyzing}
          />

          <ImageUploader
            side="BACK"
            existingImage={backImage || undefined}
            onUpload={(file) => handleUpload(file, 'BACK')}
            isUploading={isUploading}
            disabled={isAnalyzing}
          />
        </div>

        {/* Card Identification Banner */}
        {frontImage && backImage && (
          <div className="mb-6">
            <CardIdentificationBanner
              identification={identification}
              isIdentifying={isIdentifying}
              onEdit={() => setShowCardEditor(true)}
            />
          </div>
        )}

        {/* Errors - Don't show identify errors as they shouldn't block the user */}
        {(uploadError || analyzeError) && (
          <div className="mb-6">
            <ErrorMessage
              message={uploadError || analyzeError || ''}
            />
          </div>
        )}

        {/* Analyze Button */}
        <AnalyzeButton
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          disabled={isUploading}
          imagesCount={imagesCount}
        />

        {/* Session ID */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Session: {sessionId.slice(0, 8)}...
        </p>
      </div>

      {/* Card Info Editor Modal */}
      <CardInfoEditor
        isOpen={showCardEditor}
        onClose={() => setShowCardEditor(false)}
        onSave={handleSaveCardInfo}
        initialData={{
          cardName: identification?.cardName || session?.cardName,
          cardSet: identification?.cardSet || session?.cardSet,
          cardYear: identification?.cardYear || session?.cardYear,
        }}
        isSaving={isSavingCardInfo}
      />
    </main>
  );
}
