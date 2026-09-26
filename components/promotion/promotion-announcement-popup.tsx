"use client"

/**
 * The extreme tier's announcement.
 *
 * Deliberately the same shape as the gift popup — centered modal on desktop, a
 * bottom sheet on mobile, one component switching on breakpoint — because a
 * reader should not have to learn two different full-screen interruptions. What
 * it does *not* borrow is the celebration: no confetti, no "you got something"
 * framing. This is a paid placement and it says so, in a label that sits above
 * the title rather than in the small print.
 *
 * **The gift always wins.** If a gift is waiting when an announcement is due,
 * this renders nothing and the announcement is left undismissed, so it comes
 * back on the reader's next eligible day. Gifts are the goodwill moment in this
 * product; an advertisement does not get to pre-empt one.
 */

import { useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { RiCloseLine, RiArrowRightLine, RiMegaphoneFill } from "react-icons/ri"

import { Button } from "@/components/ui/button"
import { KindChip, SponsoredLabel, toUpKind } from "@/components/up/kind"
import { useInterruption } from "@/lib/interruptions"
import { useOptionalGifts } from "@/contexts/gift-context"
import { useOptionalPromotionAnnouncement } from "@/contexts/promotion-announcement-context"
import { ApiClient } from "@/lib/api-client"

/** Detail route for a listing, by kind. */
const DETAIL_PATH = {
  opportunity: "/opportunities",
  job: "/jobs",
  event: "/events",
  resource: "/resources",
} as const

export default function PromotionAnnouncementPopup() {
  const router = useRouter()
  const gifts = useOptionalGifts()
  const promo = useOptionalPromotionAnnouncement()
  const closeRef = useRef<HTMLButtonElement | null>(null)

  const announced = promo?.announced ?? null
  const dismiss = promo?.dismiss
  const giftWaiting = Boolean(gifts?.announced)
  // One unrequested pop-up per visit. Deferred, not dismissed: an announcement
  // that loses the slot comes back on the reader's next eligible visit.
  const showing = useInterruption("extreme", Boolean(announced) && !giftWaiting)

  /** The campaign an impression has already been counted for. */
  const countedFor = useRef<string | null>(null)

  /**
   * Closing without opening — the X, Escape, the backdrop, or "Not now".
   *
   * Declared ahead of the effects that use it, not merely for tidiness: a
   * `useCallback` referenced from an earlier effect's dependency array is read
   * during render, before the const is initialised.
   *
   * The dismissal is counted here rather than inside the context's `dismiss`,
   * because `handleView` calls that too — counting there would file every
   * opened announcement as a dismissal as well, and the ratio between the two
   * is the only signal saying whether these popups are worth showing.
   */
  const handleDismiss = useCallback(() => {
    if (announced) {
      void ApiClient.recordAnnouncementEvent(announced.campaign._id, "popup_dismiss")
    }
    dismiss?.()
  }, [announced, dismiss])

  // Focus the dismissal first, so the interruption is escapable by keyboard
  // the moment it appears.
  useEffect(() => {
    if (!showing) return
    closeRef.current?.focus()
  }, [showing])

  /**
   * Count the impression once the popup is actually on screen.
   *
   * Keyed on the promotion rather than on `showing`, so a re-render cannot
   * count it twice — and gated behind `showing`, which is false while a gift is
   * waiting. An announcement that deferred to a gift was never seen, and
   * counting it would inflate the one number that says how much reach the tier
   * actually bought.
   */
  useEffect(() => {
    if (!showing || !announced) return
    const promotionId = announced.campaign._id
    if (countedFor.current === promotionId) return
    countedFor.current = promotionId
    void ApiClient.recordAnnouncementEvent(promotionId, "popup_impression")
  }, [showing, announced])

  // Escape closes, matching the X.
  useEffect(() => {
    if (!showing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [showing, handleDismiss])

  // Hold the page still while the popup owns the screen.
  useEffect(() => {
    if (!showing) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [showing])

  const handleView = useCallback(() => {
    if (!announced) return
    const { _id: promotionId, contentId, contentType } = announced.campaign

    // Two counters, because they answer different questions. The first is the
    // ordinary "promoted content was clicked" the rest of the product records;
    // the second is what separates a click that came from the announcement
    // from one that came from the feed. Fire-and-forget: a failed count must
    // never stand between the reader and the listing they asked for.
    void ApiClient.recordPromotionClick(contentId, contentType, "view").catch(() => {})
    void ApiClient.recordAnnouncementEvent(promotionId, "popup_click")

    dismiss?.()
    router.push(`${DETAIL_PATH[contentType] ?? "/opportunities"}/${contentId}`)
  }, [announced, dismiss, router])

  if (!showing || !announced || !dismiss) return null

  const { campaign } = announced

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-up-scrim duration-200 animate-in fade-in-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-announcement-title"
      onClick={handleDismiss}
    >
      {/* Keeps its own look: the same navy and tile stack as the extreme feed
          card, so the pop-up and the card read as one campaign. */}
      <div
        className="relative w-full max-w-[440px] overflow-hidden rounded-t-[28px] bg-up-navy pb-[env(safe-area-inset-bottom)] text-up-on-navy shadow-up-pop duration-300 animate-in slide-in-from-bottom dark:bg-up-lead sm:rounded-up-2xl sm:pb-0 sm:zoom-in-95 sm:slide-in-from-bottom-0 sm:fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden className="absolute -right-10 -top-12 h-[140px] w-[190px] -rotate-[8deg] rounded-[24px] bg-up-orange" />
        <span aria-hidden className="absolute -top-6 right-14 h-[76px] w-[100px] rotate-[7deg] rounded-[18px] bg-up-lime" />

        {/* Close is a quiet ✕ on the navy; no second button competes. */}
        <button
          ref={closeRef}
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute right-3.5 top-3.5 z-10 grid h-9 w-9 place-items-center rounded-full bg-[rgba(11,18,51,0.55)] text-up-on-navy transition-colors hover:bg-[rgba(11,18,51,0.75)] focus:outline-none focus-visible:ring-2 focus-visible:ring-up-on-navy"
        >
          <RiCloseLine className="h-5 w-5" />
        </button>

        {/* The campaign image fades into the navy instead of sitting in a box. */}
        {campaign.image ? (
          <div className="relative h-44 w-full overflow-hidden sm:h-48">
            <img src={campaign.image} alt="" className="h-full w-full object-cover" draggable={false} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-up-navy to-transparent to-70% dark:from-up-lead" />
          </div>
        ) : (
          <div className="relative h-24 sm:h-28">
            <span className="absolute bottom-0 left-5 grid h-14 w-14 place-items-center rounded-[18px] bg-up-orange text-up-navy sm:left-6">
              <RiMegaphoneFill className="h-7 w-7" aria-hidden />
            </span>
          </div>
        )}

        <div className="relative px-5 pb-6 pt-4 sm:px-6">
          {/* The disclosure. Above the title, not beneath it: this is a paid
              placement and the reader should know that before they read the
              pitch, not after. */}
          <div className="mb-3 flex items-center gap-2">
            <SponsoredLabel className="mb-0 pl-0 text-up-on-navy-muted" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-up-navy-subtle py-0.5 pl-0.5 pr-2.5 text-xs font-semibold capitalize text-up-on-navy-muted shadow-[inset_0_0_0_1px_var(--up-border-on-navy)]">
              <KindChip kind={toUpKind(campaign.contentType)} size="sm" className="h-6 w-6 rounded-full" />
              {campaign.contentType}
            </span>
          </div>

          <h2 id="promo-announcement-title" className="font-display text-xl font-bold leading-tight sm:text-2xl">
            {campaign.title}
          </h2>
          {campaign.description && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-up-orange">{campaign.description}</p>
          )}

          <Button type="button" onClick={handleView} className="mt-5 h-11 w-full text-sm sm:w-auto sm:px-6">
            Take a look
            <RiArrowRightLine className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}
