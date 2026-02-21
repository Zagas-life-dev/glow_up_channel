"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Download, Share } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Arrow pointing down to Safari's bottom bar (Share icon). */
function ShareArrowPointer() {
  return (
    <div className="relative flex flex-col items-center">
      <p className="text-sm font-medium text-foreground mb-1">Tap here in Safari</p>
      <svg
        width="48"
        height="56"
        viewBox="0 0 48 56"
        fill="none"
        className="text-primary shrink-0"
        aria-hidden
      >
        <path
          d="M24 0 L24 44 M14 34 L24 44 L34 34"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-muted/80 px-4 py-3 border border-border/60">
        <Share className="h-8 w-8 text-foreground shrink-0" aria-hidden />
        <span className="text-sm font-medium text-foreground">Share icon</span>
      </div>
    </div>
  )
}

const STORAGE_KEY = "glowup-pwa-install-dismissed"
const DISMISS_DAYS = 7

function getDismissedUntil(): number | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const t = parseInt(raw, 10)
    return Number.isNaN(t) ? null : t
  } catch {
    return null
  }
}

function setDismissedUntil() {
  try {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000
    localStorage.setItem(STORAGE_KEY, String(until))
  } catch {
    // ignore
  }
}

export const PWA_PROMPT_EVENT = "glowup-show-pwa-prompt"
export function showPwaInstallPrompt() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(PWA_PROMPT_EVENT))
  } catch {
    // ignore
  }
}

function isStandalone() {
  if (typeof window === "undefined") return false
  return (
    (window as Window & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos() {
  if (typeof window === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showCenterPrompt, setShowCenterPrompt] = useState(false)
  const [showIosSteps, setShowIosSteps] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  const canShow = useCallback(() => {
    if (isStandalone() || isInstalled) return false
    const until = getDismissedUntil()
    if (until != null && Date.now() < until) return false
    return true
  }, [isInstalled])

  useEffect(() => {
    if (isStandalone()) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      const ev = e as BeforeInstallPromptEvent
      ev.preventDefault()
      setDeferredPrompt(ev)
      if (canShow()) setShowCenterPrompt(true)
    }

    const handleShowPrompt = () => {
      if (canShow()) setShowCenterPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener)
    window.addEventListener(PWA_PROMPT_EVENT, handleShowPrompt)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener)
      window.removeEventListener(PWA_PROMPT_EVENT, handleShowPrompt)
    }
  }, [canShow])

  // On iOS (no beforeinstallprompt), show centered prompt so user can tap to see instructions
  useEffect(() => {
    if (!isIos() || isStandalone() || !canShow()) return
    setShowCenterPrompt(true)
  }, [canShow])

  const handleInstall = async () => {
    if (isIos()) {
      // Pseudo-install: show tooltip with arrow pointing to Safari Share icon (no beforeinstallprompt on iOS)
      setShowIosSteps(true)
      return
    }
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setIsInstalled(true)
      setShowCenterPrompt(false)
      const startUrl = typeof window !== "undefined" ? `${window.location.origin}/` : "/"
      window.location.href = startUrl
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowCenterPrompt(false)
    setShowIosSteps(false)
    setDismissedUntil()
  }

  if (!showCenterPrompt || !canShow()) return null

  // Centered popup: one main "Download app" button, user-initiated install
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden
        onClick={handleDismiss}
      />
      {/* Card at center */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md p-6 shadow-xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="pwa-install-title"
        aria-describedby="pwa-install-desc"
      >
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-3 top-3 h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 ring-2 ring-primary/20">
            <img
              src="/images/logo-icon-transparent.svg"
              alt=""
              className="h-10 w-10"
            />
          </div>
          <h2 id="pwa-install-title" className="mt-4 text-xl font-bold text-foreground">
            Get the GlowUp app
          </h2>
          <p id="pwa-install-desc" className="mt-1 text-sm text-muted-foreground">
            {isIos()
              ? "Add to your home screen for quick access."
              : "Download to your device and use it like an app."}
          </p>

          {showIosSteps ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Look at the <strong className="text-foreground">bottom of Safari</strong> and follow the arrow:
              </p>
              <div className="mt-4 w-full flex justify-center">
                <ShareArrowPointer />
              </div>
              <ol className="mt-4 w-full list-decimal list-inside space-y-1 rounded-xl border border-border/60 bg-muted/50 p-4 text-left text-sm text-muted-foreground">
                <li>Tap the <strong className="text-foreground">Share</strong> icon (shown above)</li>
                <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                <li>Tap &quot;Add&quot; in the top right</li>
              </ol>
              <Button
                size="lg"
                variant="outline"
                className="mt-4 w-full rounded-xl"
                onClick={handleDismiss}
              >
                Got it
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              onClick={handleInstall}
              className="mt-6 w-full gap-2 rounded-xl bg-primary hover:bg-primary/90 font-semibold"
            >
              <Download className="h-5 w-5" />
              {isIos() ? "Add to Home Screen" : "Download app"}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  )
}
