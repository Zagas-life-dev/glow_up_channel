'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, Suspense } from 'react';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';

// Circular-dot QR with GlowUp orange on dark, center logo well
function CircularQRCode({ value, size, logoSrc }: { value: string; size: number; logoSrc: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const renderQR = async () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const qrData = await QRCode.create(value, { errorCorrectionLevel: 'H' });
      const modules = qrData.modules;
      const moduleCount = modules.size;
      const cellSize = size / moduleCount;
      const dotRadius = cellSize * 0.48;

      // Background
      ctx.fillStyle = '#0f0f0f';
      ctx.fillRect(0, 0, size, size);

      // Dots – GlowUp orange
      ctx.fillStyle = '#f97316';

      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (modules.get(row, col)) {
            const x = col * cellSize + cellSize / 2;
            const y = row * cellSize + cellSize / 2;
            const centerX = size / 2;
            const centerY = size / 2;
            const logoRadius = size * 0.18;
            const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

            if (distance > logoRadius + dotRadius) {
              ctx.beginPath();
              ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Logo well
      const logoSize = size * 0.28;
      const logoX = (size - logoSize) / 2;
      const logoY = (size - logoSize) / 2;

      ctx.fillStyle = '#0f0f0f';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, logoSize / 2 + 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, logoSize / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();

      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      logo.onload = () => {
        const padding = logoSize * 0.15;
        ctx.drawImage(
          logo,
          logoX + padding,
          logoY + padding,
          logoSize - padding * 2,
          logoSize - padding * 2
        );
      };
      logo.src = logoSrc;
    };

    renderQR();
  }, [value, size, logoSrc]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-3xl w-full h-auto max-w-full"
      style={{ boxShadow: '0 0 0 1px rgba(249, 115, 22, 0.15), 0 25px 50px -12px rgba(0,0,0,0.4)' }}
    />
  );
}

function FullscreenQRContent() {
  const searchParams = useSearchParams();
  const value = searchParams.get('value') || '';

  if (!value) {
    return (
      <div className="min-h-screen profile-page-wrap flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-3xl profile-card-bg border profile-border shadow-xl p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl profile-surface border profile-border flex items-center justify-center mx-auto">
            <QrCode className="w-8 h-8 profile-accent-icon" />
          </div>
          <div>
            <h1 className="text-lg font-semibold profile-text-primary">No QR code data</h1>
            <p className="text-sm profile-text-muted mt-2">
              Open your QR dashboard from the main GlowUp app and tap “Full screen” to display this page.
            </p>
          </div>
          <p className="text-xs profile-text-muted">Powered by GlowUp</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen profile-page-wrap flex flex-col items-center justify-center px-4 py-8">
      {/* Glow behind QR */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden
      >
        <div
          className="w-[min(90vw,420px)] h-[min(90vw,420px)] rounded-full opacity-30 dark:opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Label */}
        <p className="text-xs font-semibold uppercase tracking-[0.2em] profile-text-muted mb-1">
          GlowUp QR
        </p>
        <h1 className="text-xl font-bold profile-text-primary mb-8">
          Scan to save contact
        </h1>

        {/* QR container */}
        <div className="relative w-full aspect-square max-w-[320px] flex items-center justify-center">
          <div className="rounded-3xl p-4 profile-card-bg border profile-border shadow-2xl">
            <CircularQRCode
              value={value}
              size={280}
              logoSrc="/logo-icon-transparent.svg"
            />
          </div>
        </div>

        {/* Footer */}
        <p className="mt-10 text-xs profile-text-muted">
          Powered by <span className="font-semibold profile-accent-icon">GlowUp</span>
        </p>
      </div>
    </div>
  );
}

export default function FullscreenQRPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen profile-page-wrap flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl profile-card-bg border profile-border flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <FullscreenQRContent />
    </Suspense>
  );
}
