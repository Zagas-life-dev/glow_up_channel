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
import { RiCloseLine, RiGiftFill, RiArrowRightLine } from "react-icons/ri"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useOptionalGifts } from "@/contexts/gift-context"
import { useLocale } from "@/lib/i18n/context"
import { giftsHref } from "@/lib/gifts/routes"
import { GIFT_LISTING_LABELS } from "@/lib/gifts/types"
import { KindChip, toUpKind } from "@/components/up/kind"
import { useInterruption } from "@/lib/interruptions"

/** Brand-ish confetti; falls back silently if the canvas is unavailable. */
function celebrate() {
  try {
    confetti({
      particleCount: 140,
      spread: 78,
      origin: { y: 0.32 },
      startVelocity: 42,
      ticks: 220,
      colors: ["#FF6A00", "#D6FF3F", "#FBFAF7"],
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

  const waiting = gifts?.announced ?? null
  // One unrequested pop-up per visit; an unseen gift stays announced for the next.
  const allowed = useInterruption("gift", Boolean(waiting))
  const announced = allowed ? waiting : null
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
  const listing = announced.listing

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-up-scrim duration-200 animate-in fade-in-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gift-popup-title"
      onClick={dismiss}
    >
      {/* The one pop-up that is purely good news: navy hero, lime Gift badge. */}
      <div
        className="relative w-full max-w-[440px] overflow-hidden rounded-t-[28px] bg-up-navy pb-[env(safe-area-inset-bottom)] text-up-on-navy shadow-up-pop duration-300 animate-in slide-in-from-bottom dark:bg-up-lead sm:rounded-up-2xl sm:pb-0 sm:zoom-in-95 sm:slide-in-from-bottom-0 sm:fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden className="absolute -right-10 -top-12 h-[140px] w-[190px] -rotate-[8deg] rounded-[24px] bg-up-orange" />
        <span aria-hidden className="absolute -top-6 right-14 h-[76px] w-[100px] rotate-[7deg] rounded-[18px] bg-up-lime" />

        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          aria-label={t("gifts.close")}
          className="absolute right-3.5 top-3.5 z-10 grid h-9 w-9 place-items-center rounded-full bg-[rgba(11,18,51,0.55)] text-up-on-navy transition-colors hover:bg-[rgba(11,18,51,0.75)] focus:outline-none focus-visible:ring-2 focus-visible:ring-up-on-navy"
        >
          <RiCloseLine className="h-5 w-5" />
        </button>

        {/* The gift's image fades into the navy; without one, the gift mark on the tiles. */}
        {announced.image ? (
          <div className="relative h-44 w-full overflow-hidden sm:h-48">
            <img src={announced.image} alt="" className="h-full w-full object-cover" draggable={false} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-up-navy to-transparent to-70% dark:from-up-lead" />
          </div>
        ) : (
          <div className="relative h-24 sm:h-28">
            <span className="absolute bottom-0 left-5 grid h-14 w-14 place-items-center rounded-[18px] bg-up-orange text-up-navy sm:left-6">
              <RiGiftFill className="h-7 w-7" aria-hidden />
            </span>
          </div>
        )}

        <div className="relative px-5 pb-6 pt-4 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-up-lime px-2.5 py-[5px] text-xs font-bold text-up-navy">
              <RiGiftFill className="h-3.5 w-3.5" aria-hidden />
              {t("gifts.badge")}
            </span>
            {listing ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-up-navy-subtle py-0.5 pl-0.5 pr-2.5 text-xs font-semibold text-up-on-navy-muted shadow-[inset_0_0_0_1px_var(--up-border-on-navy)]">
                <KindChip kind={toUpKind(listing.type)} size="sm" className="h-6 w-6 rounded-full" />
                {GIFT_LISTING_LABELS[listing.type]}
              </span>
            ) : announced.category ? (
              <span className="rounded-full bg-up-navy-subtle px-2.5 py-[5px] text-xs font-semibold capitalize text-up-on-navy-muted shadow-[inset_0_0_0_1px_var(--up-border-on-navy)]">
                {announced.category}
              </span>
            ) : null}
          </div>

          <h2 id="gift-popup-title" className="font-display text-xl font-bold leading-tight sm:text-2xl">
            {t("gifts.popupTitle")}
          </h2>
          <p className="mt-1.5 text-base font-bold">{announced.title}</p>
          <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-up-orange">
            {announced.description}
          </p>
          {listing?.provider && (
            <p className="mt-2 text-xs font-semibold text-up-on-navy-muted">{listing.provider}</p>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="button" onClick={handleView} className="h-11 flex-1 text-sm">
              {t("gifts.view")}
              <RiArrowRightLine className="h-4 w-4" aria-hidden />
            </Button>
            {listHref && (
              <button
                type="button"
                onClick={handleViewOthers}
                className="inline-flex min-h-11 flex-1 flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full py-2 text-sm font-bold text-up-on-navy transition-colors hover:bg-up-navy-subtle"
              >
                {t("gifts.viewOthers")}
                {extraCount > 0 && (
                  <span className="rounded-full bg-up-lime-tint px-2 py-0.5 text-[11px] font-bold text-up-lime">
                    {extraCount === 1 ? t("gifts.oneMore") : t("gifts.moreWaiting", { count: extraCount })}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
