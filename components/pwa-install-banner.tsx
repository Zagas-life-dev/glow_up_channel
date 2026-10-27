"use client"

import { useState, useEffect } from "react"
import { X, Download, Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import { claimInterruption } from "@/lib/interruptions"
import { isPromptDue, snoozePrompt } from "@/lib/prompt-cadence"

export const PWA_DISMISSED_EVENT = "glowup-pwa-dismissed"
/** The install prompt is done with this visit: shown and closed, or not showing. */
export const PWA_SETTLED_EVENT = "glowup-pwa-settled"
export const PWA_SETTLED_KEY = "glowup-pwa-settled"

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
      <p className="mb-1 text-center text-[13px] font-semibold text-foreground">
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
          className="shrink-0 text-up-orange"
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
          className="shrink-0 text-up-orange"
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
      <div className="mt-2 flex items-center justify-center gap-2 rounded-up-md bg-up-fill px-4 py-2.5">
        <Share className="h-6 w-6 shrink-0 text-foreground" aria-hidden />
        <span className="text-sm font-medium text-foreground">Share icon</span>
      </div>
    </div>
  )
}

/** Lets the notification prompt, which waits its turn, follow on this visit. */
function announceSettled() {
  try {
    sessionStorage.setItem(PWA_SETTLED_KEY, "true")
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(PWA_SETTLED_EVENT))
}

/** "Later" snoozes it (next day, next day, then every other day) and frees the visit. */
function markDismissed() {
  snoozePrompt("install")
  try {
    sessionStorage.setItem("glowup-pwa-prompt-dismissed", "true")
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(PWA_DISMISSED_EVENT))
  announceSettled()
}

export const PWA_PROMPT_EVENT = "glowup-show-pwa-prompt"
export function showPwaInstallPrompt() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(PWA_PROMPT_EVENT))
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
function getInstallSteps(browserKind: PwaBrowserKind): { steps: string[] } {
  switch (browserKind) {
    case "safari_ios":
      return {
        steps: [
          "Tap the Share icon at the bottom of Safari",
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" in the top right',
        ],
      }
    case "chrome_ios":
      return {
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
        steps: [
          "Look for the Share button (often at the bottom or in the menu bar)",
          'Tap it, then find and tap "Add to Home Screen" or "Add page to"',
          'Tap "Add" to confirm',
        ],
      }
    case "other_ios":
      return {
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
        steps: [
          "Tap the menu (⋮) in the top right",
          'Tap "Add to Home screen" or "Install app"',
          "Confirm if prompted",
        ],
      }
    default:
      return {
        steps: [
          "Use your browser's menu (e.g. ⋮ or File) and look for the Share or Install option",
          'Find "Install UP", "Add to Home screen", or "Create shortcut"',
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

/** Lets the gift and the extreme announcement, fetched on load, claim the
 *  visit's one interruption first (lib/interruptions.ts). */
const SETTLE_MS = 8000

/**
 * What the sheet is showing:
 *   install    — the install offer;
 *   installed  — just installed on a phone. Android installs and leaves the
 *                reader in this browser tab (it does not jump to the app), so
 *                this says where the app now is;
 *   open-app   — UP is already installed on this device but they came back in
 *                the browser, so point them at the app instead of offering it again.
 */
type SheetMode = "install" | "installed" | "open-app"

/** Chromium on Android can tell whether this site's app is installed (manifest related_applications). */
async function appInstalledElsewhere(): Promise<boolean> {
  try {
    const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> }
    if (!nav.getInstalledRelatedApps) return false
    const apps = await nav.getInstalledRelatedApps()
    return Array.isArray(apps) && apps.length > 0
  } catch {
    return false
  }
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [open, setOpen] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [browserKind, setBrowserKind] = useState<PwaBrowserKind>("desktop")
  const [ios, setIos] = useState(false)
  /** Not snoozed (lib/prompt-cadence.ts) and settle delay passed, so the prompt may open by itself. */
  const [eligible, setEligible] = useState(false)
  const [mode, setMode] = useState<SheetMode>("install")
  /** UP is installed on this device, but this is the browser. */
  const [installedElsewhere, setInstalledElsewhere] = useState(false)

  useEffect(() => {
    setBrowserKind(getBrowserKind())
    setIos(isIos())
    if (isStandalone()) {
      setIsInstalled(true)
      announceSettled()
      return
    }
    void appInstalledElsewhere().then(setInstalledElsewhere)
    if (!isPromptDue("install")) {
      announceSettled()
      return
    }
    const t = setTimeout(() => setEligible(true), SETTLE_MS)
    return () => clearTimeout(t)
  }, [])

  // The browser's own install offer, and the reader's explicit request from the
  // sidebar. The request skips every gate: they asked.
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      const ev = e as BeforeInstallPromptEvent
      ev.preventDefault()
      setDeferredPrompt(ev)
    }
    const handleInstalled = () => {
      setDeferredPrompt(null)
      // Desktop Chrome and Edge open the installed app window themselves.
      // Phones stay in this tab, so say where the app went.
      if (getBrowserKind() === "desktop") {
        setIsInstalled(true)
        setOpen(false)
        announceSettled()
        return
      }
      setMode("installed")
      setOpen(true)
    }
    const handleShowPrompt = () => {
      if (!isStandalone()) {
        setMode("install")
        setOpen(true)
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener)
    window.addEventListener("appinstalled", handleInstalled)
    window.addEventListener(PWA_PROMPT_EVENT, handleShowPrompt)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener)
      window.removeEventListener("appinstalled", handleInstalled)
      window.removeEventListener(PWA_PROMPT_EVENT, handleShowPrompt)
    }
  }, [])

  // Opening by itself: on a due open, only where installing is actually possible
  // (a native prompt, or iOS's Add to Home Screen), and only if no other prompt
  // already has this visit. Anything that keeps it shut settles the visit, so
  // the notification prompt is not left waiting behind it.
  // Opening (or losing the slot) uses up `eligible`: install already holds the
  // slot after it opens, so without this, closing it re-ran this effect, the
  // claim succeeded again, and the sheet popped straight back up.
  useEffect(() => {
    if (!eligible || isInstalled || open) return
    if (installedElsewhere) {
      setEligible(false)
      if (claimInterruption("install")) {
        setMode("open-app")
        setOpen(true)
      } else announceSettled()
      return
    }
    if (!deferredPrompt && !ios) {
      announceSettled()
      return
    }
    setEligible(false)
    if (claimInterruption("install")) {
      setMode("install")
      setOpen(true)
    } else announceSettled()
  }, [eligible, isInstalled, open, deferredPrompt, ios, installedElsewhere])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    // The prompt is single-use either way. On accept the appinstalled event
    // takes over (it shows where the app went on phones).
    setDeferredPrompt(null)
    if (outcome !== "accepted") {
      setOpen(false)
      markDismissed()
    }
  }

  /** Done with the "installed" / "open the app" sheet: no snooze, nothing left to ask. */
  const handleDone = () => {
    setOpen(false)
    if (mode === "installed") setIsInstalled(true)
    announceSettled()
  }

  const handleDismiss = () => {
    setOpen(false)
    markDismissed()
  }

  if (!open || isInstalled) return null

  if (mode === "installed" || mode === "open-app") {
    const justInstalled = mode === "installed"
    return (
      <div className="fixed inset-0 z-[100] flex items-end justify-center duration-200 animate-in fade-in-0 sm:pointer-events-none sm:inset-auto sm:bottom-6 sm:right-6">
        <div className="absolute inset-0 bg-up-scrim sm:hidden" aria-hidden onClick={justInstalled ? handleDone : handleDismiss} />
        <div
          className="pointer-events-auto relative w-full overflow-hidden rounded-t-[28px] bg-card pb-[max(1.5rem,env(safe-area-inset-bottom))] text-card-foreground shadow-up-pop duration-300 animate-in slide-in-from-bottom sm:w-[360px] sm:rounded-up-xl sm:pb-0 sm:slide-in-from-bottom-4"
          role="dialog"
          aria-labelledby="pwa-open-title"
          aria-describedby="pwa-open-desc"
        >
          <div aria-hidden className="mx-auto mb-1 mt-2.5 h-[5px] w-10 rounded-full bg-up-sep sm:hidden" />
          <div className="px-5 pb-1 pt-4 sm:p-5">
            <div className="flex items-center gap-3">
              <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-up-md" />
              <div className="min-w-0">
                <h2 id="pwa-open-title" className="font-display text-lg font-bold leading-tight text-foreground">
                  {justInstalled ? "UP is installed" : "You have the UP app"}
                </h2>
                <p id="pwa-open-desc" className="mt-0.5 text-[13px] text-muted-foreground">
                  {justInstalled
                    ? "Open it from your home screen or app list. Reminders and notifications work best there."
                    : "You're in the browser. Open UP from your home screen for reminders and a faster app."}
                </p>
              </div>
            </div>
            <ol className="mt-4 space-y-2.5">
              {["Go to your home screen or app list", 'Tap the UP icon', "Sign in once if asked"].map((step, i) => (
                <li key={step} className="flex items-center gap-3 text-sm font-semibold text-foreground">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-up-solid font-display text-xs font-bold text-up-on-solid">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {!justInstalled && (
                <Button variant="ghost" className="h-11 sm:h-10" onClick={handleDismiss}>
                  Later
                </Button>
              )}
              <Button onClick={handleDone} className="h-11 px-5 sm:h-10">
                Got it
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // One orange "Install" when the browser can do it for them; otherwise the
  // steps are the whole card.
  const native = deferredPrompt !== null
  const steps = getInstallSteps(browserKind)
  const sharePosition = getSharePointerPosition(browserKind)

  // Installing is never urgent: a corner card on desktop (no scrim), a sheet on phones.
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center duration-200 animate-in fade-in-0 sm:pointer-events-none sm:inset-auto sm:bottom-6 sm:right-6">
      <div className="absolute inset-0 bg-up-scrim sm:hidden" aria-hidden onClick={handleDismiss} />
      <div
        className="pointer-events-auto relative w-full overflow-hidden rounded-t-[28px] bg-card pb-[max(1.5rem,env(safe-area-inset-bottom))] text-card-foreground shadow-up-pop duration-300 animate-in slide-in-from-bottom sm:w-[360px] sm:rounded-up-xl sm:pb-0 sm:slide-in-from-bottom-4"
        role="dialog"
        aria-labelledby="pwa-install-title"
        aria-describedby="pwa-install-desc"
      >
        <div aria-hidden className="mx-auto mb-1 mt-2.5 h-[5px] w-10 rounded-full bg-up-sep sm:hidden" />
        <button
          type="button"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-up-fill text-muted-foreground transition-colors hover:text-foreground"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-5 pb-1 pt-4 sm:p-5">
          <div className="flex items-center gap-3 pr-10">
            {/* The manifest icon rather than the in-app logo, so the preview here
                is literally what lands on the home screen. */}
            <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-up-md" />
            <div className="min-w-0">
              <h2 id="pwa-install-title" className="font-display text-lg font-bold leading-tight text-foreground">
                {native ? "Install UP" : "Add UP to your home screen"}
              </h2>
              <p id="pwa-install-desc" className="mt-0.5 text-[13px] text-muted-foreground">
                {native ? "Download to your device and use it like an app." : "Add to your home screen for quick access."}
              </p>
            </div>
          </div>

          {native ? (
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" className="h-11 sm:h-10" onClick={handleDismiss}>
                Later
              </Button>
              <Button onClick={handleInstall} className="h-11 px-5 sm:h-10">
                <Download className="h-4 w-4" />
                Install
              </Button>
            </div>
          ) : (
            <>
              {sharePosition !== null && (
                <div className="mt-4 flex w-full justify-center">
                  <ShareArrowPointer browserKind={browserKind} position={sharePosition} />
                </div>
              )}
              <ol className="mt-4 space-y-2.5">
                {steps.steps.map((step, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-semibold text-foreground">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-up-solid font-display text-xs font-bold text-up-on-solid">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex justify-center sm:justify-end">
                <Button variant="ghost" className="h-10" onClick={handleDismiss}>
                  Later
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
