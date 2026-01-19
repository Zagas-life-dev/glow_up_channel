'use client';

import { Download, Share2, Copy, Check, Maximize2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  qrCodeUrl: string;
  userId: string;
}

// Custom circular dot QR code renderer
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
      const dotRadius = cellSize * 0.5; // Dot radius (slightly smaller than cell for spacing)

      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, size, size);

      // Draw QR code with circular dots
      ctx.fillStyle = '#f97316'; // Orange color

      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (modules.get(row, col)) {
            const x = col * cellSize + cellSize / 2;
            const y = row * cellSize + cellSize / 2;

            // Check if this dot is in the center area (for logo)
            const centerX = size / 2;
            const centerY = size / 2;
            const logoRadius = size * 0.18; // Logo area radius
            const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

            if (distance > logoRadius + dotRadius) {
              // Draw circular dot
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
      ctx.lineWidth = 3;
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
      id="qrcode-canvas"
      className="rounded-lg"
    />
  );
}

export function QRCodeDisplay({ qrCodeUrl, userId }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const canvas = document.getElementById('qrcode-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const pngFile = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.download = `qrcode-${userId}.png`;
    downloadLink.href = pngFile;
    downloadLink.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My QR Code',
          text: 'Scan this QR code to view my profile',
          url: qrCodeUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying:', err);
    }
  };

  const handleFullscreen = () => {
    const url = `/fullscreen-qr?value=${encodeURIComponent(qrCodeUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative bg-black p-4 rounded-2xl">
          <CircularQRCode
            value={qrCodeUrl}
            size={256}
            logoSrc="/logo-icon-transparent.svg"
          />
        </div>
        
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <input
              type="text"
              value={qrCodeUrl}
              readOnly
              className="flex-1 bg-transparent text-sm text-foreground outline-none"
            />
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-background rounded transition-colors"
              title="Copy URL"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-full font-medium hover:border-orange-500 hover:text-orange-600 transition-all duration-300"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            )}
            <button
              onClick={handleFullscreen}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-full font-medium hover:bg-gray-900 transition-all duration-300"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Display QR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
