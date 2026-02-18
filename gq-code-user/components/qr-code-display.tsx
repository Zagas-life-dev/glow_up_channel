"use client";

import type React from "react";
import { Download, Share2, Copy, Check, Maximize2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  qrCodeUrl: string;
  userId: string;
}

function CircularQRCode({ value, size, logoSrc }: { value: string; size: number; logoSrc: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const renderQR = async () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const qrData = await QRCode.create(value, { errorCorrectionLevel: "H" });
      const modules = qrData.modules;
      const moduleCount = modules.size;
      const cellSize = size / moduleCount;
      const dotRadius = cellSize * 0.5;

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#f97316";

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

      const logoSize = size * 0.28;
      const logoX = (size - logoSize) / 2;
      const logoY = (size - logoSize) / 2;
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, logoSize / 2 + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, logoSize / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();

      const logo = new Image();
      logo.crossOrigin = "anonymous";
      logo.onload = () => {
        const padding = logoSize * 0.15;
        ctx.drawImage(logo, logoX + padding, logoY + padding, logoSize - padding * 2, logoSize - padding * 2);
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
      className="rounded-2xl"
    />
  );
}

export function QRCodeDisplay({ qrCodeUrl, userId }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const canvas = document.getElementById("qrcode-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `qrcode-${userId}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My QR Code",
          text: "Scan to view my contact",
          url: qrCodeUrl,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error copying:", err);
    }
  };

  const handleFullscreen = () => {
    window.open(`/fullscreen-qr?value=${encodeURIComponent(qrCodeUrl)}`, "_blank", "noopener,noreferrer");
  };

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const actions: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void }[] = [
    { label: "Download", icon: Download, onClick: handleDownload },
    { label: "Copy link", icon: copied ? Check : Copy, onClick: handleCopy },
    ...(canShare ? [{ label: "Share", icon: Share2, onClick: handleShare }] : []),
    { label: "Full screen", icon: Maximize2, onClick: handleFullscreen },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="absolute -inset-4 rounded-[2rem] bg-orange-500/20 blur-2xl pointer-events-none" />
        <div className="relative rounded-3xl bg-qr-surface border border-qr-border p-5 shadow-2xl">
          <CircularQRCode value={qrCodeUrl} size={240} logoSrc="/logo-icon-transparent.svg" />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-6">
        {actions.map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-qr-surface border border-qr-border text-qr-muted hover:text-qr-text hover:bg-qr-surface-hover hover:border-orange-500/30 transition-colors"
            title={label}
            aria-label={label}
          >
            <Icon className={`w-5 h-5 ${copied && label === "Copy link" ? "text-emerald-400" : ""}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
