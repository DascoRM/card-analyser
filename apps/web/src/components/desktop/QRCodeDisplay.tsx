'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  sessionId: string;
}

export function QRCodeDisplay({ sessionId }: QRCodeDisplayProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const mobileUrl = `${appUrl}/mobile/${sessionId}`;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <QRCodeSVG
          value={mobileUrl}
          size={256}
          level="H"
          includeMargin
          className="rounded-lg"
        />
      </div>

      <div className="text-center">
        <p className="text-gray-600 text-sm mb-2">
          Scannez ce QR code avec votre telephone
        </p>
        <p className="text-gray-400 text-xs break-all max-w-xs">
          {mobileUrl}
        </p>
      </div>
    </div>
  );
}
