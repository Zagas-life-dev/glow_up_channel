'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

// Custom circular dot QR code renderer for fullscreen
function CircularQRCode({ value, size, logoSrc }: { value: string; size: number; logoSrc: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const renderQR = async () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Generate QR code data
      const qrData = await QRCode.create(value, { errorCorrectionLevel: 'H' });
      const modules = qrData.modules;
      const moduleCount = modules.size;
      
      // Calculate cell size
      const cellSize = size / moduleCount;
      const dotRadius = cellSize * 0.5;

      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, size, size);

      // Draw QR code with circular dots
      ctx.fillStyle = '#f97316';

      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (modules.get(row, col)) {
            const x = col * cellSize + cellSize / 2;
            const y = row * cellSize + cellSize / 2;

            // Check if this dot is in the center area (for logo)
            const centerX = size / 2;
            const centerY = size / 2;
            const logoRadius = size * 0.18;
            const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

            if (distance > logoRadius + dotRadius) {
              ctx.beginPath();
              ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Draw circular logo area
      const logoSize = size * 0.28;
      const logoX = (size - logoSize) / 2;
      const logoY = (size - logoSize) / 2;

      // Draw circular black background for logo
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, logoSize / 2 + 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw orange ring around logo
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, logoSize / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();

      // Load and draw logo
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
      className="rounded-lg"
    />
  );
}

export default function FullscreenQRPage() {
  const searchParams = useSearchParams();
  const value = searchParams.get('value') || '';

  if (!value) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-gray-300 text-lg">No QR code data provided.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <div className="mb-8">
        <div className="relative p-4 bg-black rounded-2xl">
          <CircularQRCode
            value={value}
            size={320}
            logoSrc="/logo-icon-transparent.svg"
          />
        </div>
      </div>

      <p className="text-sm text-gray-400 tracking-wide uppercase">
        Powered by <span className="font-semibold text-orange-400">Glow Up Channel</span>
      </p>
    </div>
  );
}
