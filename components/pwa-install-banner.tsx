"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Download, Share } from "lucide-react"
import { Button } from "@/components/ui/button"

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

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [showIosHint, setShowIosHint] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  const isStandalone = () => {
    if (typeof window === "undefined") return false
    return (
      (window as Window & { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  }

  const isIos = () => {
    if (typeof window === "undefined") return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  }

  const shouldShow = useCallback(() => {
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
      if (shouldShow()) setShowBanner(true)
    }

    const handleShowPrompt = () => {
      if (deferredPrompt) setShowBanner(true)
      if (isIos()) setShowIosHint(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener)
    window.addEventListener(PWA_PROMPT_EVENT, handleShowPrompt)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener)
      window.removeEventListener(PWA_PROMPT_EVENT, handleShowPrompt)
    }
  }, [shouldShow, deferredPrompt])

  // Show iOS "Add to Home Screen" hint when on iOS and not standalone
  useEffect(() => {
    if (!isIos() || isStandalone() || !shouldShow()) return
    setShowIosHint(true)
  }, [shouldShow])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setIsInstalled(true)
      setShowBanner(false)
      // Open the app immediately in this tab (and on some browsers the PWA may open in standalone)
      const startUrl = typeof window !== "undefined" ? `${window.location.origin}/` : "/"
      window.location.href = startUrl
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setShowIosHint(false)
    setDismissedUntil()
  }

  const openIosInstructions = () => {
    setShowIosHint(true)
  }

  if (!showBanner && !showIosHint) return null

  // Android / desktop Chrome: install button + dismiss
  if (showBanner && deferredPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm animate-in slide-in-from-bottom-4 duration-300">
        <div className="rounded-xl border border-border bg-card p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <img
                src="/images/logo-icon-transparent.png"
                alt=""
                className="h-8 w-8"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">Install GlowUp</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Add to your home screen for quick access and a better experience.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={handleInstall} className="gap-1.5">
                  <Download className="h-4 w-4" />
                  Install app
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  Not now
                </Button>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={handleDismiss}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // iOS: show instructions (Share → Add to Home Screen)
  if (showIosHint) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm animate-in slide-in-from-bottom-4 duration-300">
        <div className="rounded-xl border border-border bg-card p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <img
                src="/images/logo-icon-transparent.png"
                alt=""
                className="h-8 w-8"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">Add GlowUp to Home Screen</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Tap <Share className="inline h-3.5 w-3.5" /> Share, then &quot;Add to Home Screen&quot; to install the app.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleDismiss}>
                  Got it
                </Button>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={handleDismiss}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
