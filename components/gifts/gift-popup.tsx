"use client"

/**
 * The gift announcement.
 *
 * Centered modal on desktop, bottom sheet on mobile — same component, the
 * layout switches on breakpoint rather than swapping in a Drawer, so the
 * confetti origin and focus trap behave identically on both.
 *
 * Three exits, all of which retire the announcement:
 *   View        — opens the gift itself
 *   View others — opens the shared gift list on the profile page
 *   X           — closes, keeping the gift in the list with its NEW badge
 */

import { useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import confetti from "canvas-confetti"
import { RiCloseLine, RiGiftFill, RiArrowRightLine, RiListCheck2 } from "react-icons/ri"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useOptionalGifts } from "@/contexts/gift-context"
import { useLocale } from "@/lib/i18n/context"
import { giftsHref } from "@/lib/gifts/routes"

/** Brand-ish confetti; falls back silently if the canvas is unavailable. */
function celebrate() {
  try {
    confetti({
      particleCount: 140,
      spread: 78,
      origin: { y: 0.32 },
      startVelocity: 42,
      ticks: 220,
      colors: ["#ff6700", "#ffd166", "#8b5cf6", "#22d3ee", "#ffffff"],
      disableForReducedMotion: true,
    })
  } catch {
    // Celebration is decoration — never let it break the popup.
  }
}

export default function GiftPopup() {
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useLocale()
  const gifts = useOptionalGifts()
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const celebratedFor = useRef<string | null>(null)

  const announced = gifts?.announced ?? null
  const newCount = gifts?.newCount ?? 0
  const dismiss = gifts?.dismiss

  // One burst per gift, not per render.
  useEffect(() => {
    if (!announced) return
    if (celebratedFor.current === announced._id) return
    celebratedFor.current = announced._id
    celebrate()
    closeRef.current?.focus()
  }, [announced])

  // Escape closes, matching the X.
  useEffect(() => {
    if (!announced || !dismiss) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [announced, dismiss])

  // Hold the page still while the popup owns the screen.
  useEffect(() => {
    if (!announced) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [announced])

  const handleView = useCallback(() => {
    if (!announced) return
    const id = announced._id
    dismiss?.()
    router.push(`/gifts/${id}`)
  }, [announced, dismiss, router])

  const listHref = giftsHref(user?._id)

  const handleViewOthers = useCallback(() => {
    if (!listHref) return
    dismiss?.()
    router.push(listHref)
  }, [dismiss, listHref, router])

  if (!announced || !dismiss) return null

  const extraCount = Math.max(0, newCount - 1)

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gift-popup-title"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl duration-300 animate-in slide-in-from-bottom sm:rounded-3xl sm:zoom-in-95 sm:slide-in-from-bottom-0 sm:fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          aria-label={t("gifts.close")}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur transition hover:bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <RiCloseLine className="h-5 w-5" />
        </button>

        {/* Cover art, or a gradient placeholder carrying the gift mark. */}
        <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-primary/25 via-brand-orange/20 to-violet-500/25 sm:h-48">
          {announced.image ? (
            <img
              src={announced.image}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <RiGiftFill className="h-16 w-16 text-primary drop-shadow" aria-hidden />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
        </div>

        <div className="px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
              <RiGiftFill className="h-3.5 w-3.5" aria-hidden />
              {t("gifts.badge")}
            </span>
            {announced.category && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                {announced.category}
              </span>
            )}
          </div>

          <h2 id="gift-popup-title" className="text-xl font-bold leading-tight text-foreground sm:text-2xl">
            {t("gifts.popupTitle")}
          </h2>
          <p className="mt-1 text-base font-semibold text-foreground">{announced.title}</p>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {announced.description}
          </p>

          {extraCount > 0 && (
            <p className="mt-3 text-xs font-medium text-primary">
              {extraCount === 1 ? t("gifts.oneMore") : t("gifts.moreWaiting", { count: extraCount })}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={handleView}
              className="h-11 flex-1 rounded-xl text-sm font-semibold"
            >
              {t("gifts.view")}
              <RiArrowRightLine className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
            {listHref && (
              <Button
                type="button"
                variant="outline"
                onClick={handleViewOthers}
                className="h-11 flex-1 rounded-xl text-sm font-semibold"
              >
                <RiListCheck2 className="mr-1.5 h-4 w-4" aria-hidden />
                {t("gifts.viewOthers")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
