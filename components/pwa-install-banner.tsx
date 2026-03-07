"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Download, Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

const AUTH_DELAY_MS = 5 * 60 * 1000 // 5 minutes
export const PWA_DISMISSED_EVENT = "glowup-pwa-dismissed"

const BROWSER_LABELS: Record<PwaBrowserKind, string> = {
  safari_ios: "Safari",
  chrome_ios: "Chrome",
  firefox_ios: "Firefox",
  edge_ios: "Edge",
  samsung_ios: "Samsung Internet",
  other_ios: "your browser",
  chrome_android: "Chrome",
  samsung_android: "Samsung Internet",
  other_android: "your browser",
  desktop: "your browser",
}

/** Arrow pointing to where the Share icon is: bottom (Safari) or top right (Chrome). */
function ShareArrowPointer({
  browserKind,
  position,
}: {
  browserKind: PwaBrowserKind
  position: "bottom" | "topRight"
}) {
  const label = BROWSER_LABELS[browserKind]
  const isBottom = position === "bottom"
  return (
    <div className="relative flex flex-col items-center">
      <p className="text-sm font-medium text-foreground mb-1 text-center">
        {isBottom
          ? `In ${label}, the Share icon is at the bottom of the screen`
          : `In ${label}, the Share icon is in the top right of the screen`}
      </p>
      {isBottom ? (
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
      ) : (
        <svg
          width="56"
          height="48"
          viewBox="0 0 56 48"
          fill="none"
          className="text-primary shrink-0"
          aria-hidden
        >
          <path
            d="M12 24 L44 24 M34 14 L44 24 L34 34"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
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
    sessionStorage.setItem("glowup-pwa-prompt-dismissed", "true")
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(PWA_DISMISSED_EVENT))
    }
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

export type PwaBrowserKind =
  | "safari_ios"
  | "chrome_ios"
  | "firefox_ios"
  | "edge_ios"
  | "samsung_ios"
  | "other_ios"
  | "chrome_android"
  | "samsung_android"
  | "other_android"
  | "desktop"

function getBrowserKind(): PwaBrowserKind {
  if (typeof window === "undefined" || !navigator?.userAgent) return "desktop"
  const ua = navigator.userAgent
  const isIpad = /iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const isIphone = /iPhone|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)

  if (isIpad || isIphone) {
    if (/Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|SamsungBrowser/.test(ua)) return "safari_ios"
    if (/CriOS|Chrome/.test(ua)) return "chrome_ios"
    if (/FxiOS|Firefox/.test(ua)) return "firefox_ios"
    if (/EdgiOS|Edge/.test(ua)) return "edge_ios"
    if (/SamsungBrowser/.test(ua)) return "samsung_ios"
    return "other_ios"
  }

  if (isAndroid) {
    if (/SamsungBrowser/.test(ua)) return "samsung_android"
    if (/Chrome/.test(ua)) return "chrome_android"
    return "other_android"
  }

  return "desktop"
}

/** Returns browser-specific install steps (for manual Add to Home Screen). */
function getInstallSteps(browserKind: PwaBrowserKind): { intro: string; steps: string[] } {
  const label = BROWSER_LABELS[browserKind]
  switch (browserKind) {
    case "safari_ios":
      return {
        intro: "In Safari, the Share icon is at the bottom of the screen. Follow the arrow:",
        steps: [
          "Tap the Share icon at the bottom of Safari",
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" in the top right',
        ],
      }
    case "chrome_ios":
      return {
        intro: "In Chrome, the Share icon is in the top right of the screen. Follow the arrow:",
        steps: [
          "Tap the Share icon in the top right of Chrome",
          'Tap "Add to Home Screen" (or "Add to Home screen")',
          'Tap "Add"',
        ],
      }
    case "firefox_ios":
    case "edge_ios":
    case "samsung_ios":
      return {
        intro: `In ${label}, look for the Share button:`,
        steps: [
          "Look for the Share button (often at the bottom or in the menu bar)",
          'Tap it, then find and tap "Add to Home Screen" or "Add page to"',
          'Tap "Add" to confirm',
        ],
      }
    case "other_ios":
      return {
        intro: `In ${label}, look for the Share button:`,
        steps: [
          "Look for the Share or menu button (often at the bottom or top of the screen)",
          'Tap it, then find "Add to Home Screen" or "Add to Home screen"',
          'Tap "Add" to confirm',
        ],
      }
    case "chrome_android":
    case "samsung_android":
    case "other_android":
      return {
        intro: `In ${label}:`,
        steps: [
          "Tap the menu (⋮) in the top right",
          'Tap "Add to Home screen" or "Install app"',
          "Confirm if prompted",
        ],
      }
    default:
      return {
        intro: "To install this app:",
        steps: [
          "Use your browser's menu (e.g. ⋮ or File) and look for the Share or Install option",
          'Find "Install GlowUp", "Add to Home screen", or "Create shortcut"',
          "Follow the prompts to add the app",
        ],
      }
  }
}

/** Safari: Share at bottom. Chrome iOS: Share top right. Others: no arrow. */
function getSharePointerPosition(kind: PwaBrowserKind): "bottom" | "topRight" | null {
  if (kind === "safari_ios") return "bottom"
  if (kind === "chrome_ios") return "topRight"
  return null
}

export default function PwaInstallBanner() {
  const { isAuthenticated } = useAuth()
  const [allowShowAfterDelay, setAllowShowAfterDelay] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showCenterPrompt, setShowCenterPrompt] = useState(false)
  const [showIosSteps, setShowIosSteps] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [browserKind, setBrowserKind] = useState<PwaBrowserKind>("desktop")

  const canShow = useCallback(() => {
    if (!isAuthenticated || !allowShowAfterDelay) return false
    if (isStandalone() || isInstalled) return false
    const until = getDismissedUntil()
    if (until != null && Date.now() < until) return false
    return true
  }, [isInstalled, isAuthenticated, allowShowAfterDelay])

  // Only allow PWA prompt 5 min after user is authenticated
  useEffect(() => {
    if (!isAuthenticated) return
    const t = setTimeout(() => setAllowShowAfterDelay(true), AUTH_DELAY_MS)
    return () => clearTimeout(t)
  }, [isAuthenticated])

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

  // Detect browser once on client (avoids hydration mismatch)
  useEffect(() => {
    setBrowserKind(getBrowserKind())
  }, [])

  // On iOS (no beforeinstallprompt), show centered prompt after delay when authenticated
  useEffect(() => {
    if (!isIos() || isStandalone() || !canShow()) return
    setShowCenterPrompt(true)
  }, [canShow])

  const handleInstall = async () => {
    if (isIos()) {
      // Pseudo-install: show tooltip with arrow pointing to Share icon (no beforeinstallprompt on iOS)
      setShowIosSteps(true)
      return
    }
    if (!deferredPrompt) {
      // No native prompt (e.g. desktop Safari): show browser-specific manual steps
      setShowIosSteps(true)
      return
    }
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

  if (!isAuthenticated || !showCenterPrompt || !canShow()) return null

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
        className="relative w-full max-w-sm glass-surface p-6 animate-in zoom-in-95 duration-200"
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
              src="/images/Yellow and Black Modern Media Company Logo (14).png"
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

          {showIosSteps ? (() => {
              const steps = getInstallSteps(browserKind)
              const sharePosition = getSharePointerPosition(browserKind)
              return (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {steps.intro}
              </p>
              {sharePosition !== null && (
                <div className="mt-4 w-full flex justify-center">
                  <ShareArrowPointer
                    browserKind={browserKind}
                    position={sharePosition}
                  />
                </div>
              )}
              <ol className="mt-4 w-full list-decimal list-inside space-y-1 rounded-xl border border-border/60 bg-muted/50 p-4 text-left text-sm text-muted-foreground">
                {steps.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
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
              );
            })() : (
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
