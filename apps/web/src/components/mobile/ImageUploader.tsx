'use client';

import { useRef, useState } from 'react';
import { CardSide, SessionImage } from '@/lib/types';

interface ImageUploaderProps {
  side: CardSide;
  existingImage?: SessionImage;
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  disabled?: boolean;
}

export function ImageUploader({
  side,
  existingImage,
  onUpload,
  isUploading,
  disabled,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const label = side === 'FRONT' ? 'Face avant' : 'Face arriere';
  const icon = side === 'FRONT' ? '🎴' : '🔙';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    await onUpload(file);
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  };

  const hasImage = existingImage || preview;

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {icon} {label}
      </label>

      <div
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-xl p-4
          transition-all duration-200 cursor-pointer
          ${hasImage ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-blue-50'}
          ${isUploading ? 'animate-pulse' : ''}
        `}
      >
        {hasImage ? (
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
              {preview ? (
                <img
                  src={preview}
                  alt={label}
                  className="w-full h-full object-cover"
                />
              ) : existingImage ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${existingImage.url}`}
                  alt={label}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-700">
                Image chargee
              </p>
              <p className="text-xs text-gray-500">
                Appuyez pour remplacer
              </p>
            </div>
            <svg
              className="w-6 h-6 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        ) : (
          <div className="text-center py-4">
            <svg
              className="mx-auto h-10 w-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              {isUploading ? 'Upload en cours...' : 'Appuyez pour prendre une photo'}
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="hidden"
        />
      </div>
    </div>
  );
}
