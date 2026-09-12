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
  const showing = Boolean(announced) && !giftWaiting

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
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-announcement-title"
      onClick={handleDismiss}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl duration-300 animate-in slide-in-from-bottom sm:rounded-3xl sm:zoom-in-95 sm:slide-in-from-bottom-0 sm:fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur transition hover:bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <RiCloseLine className="h-5 w-5" />
        </button>

        {/* Cover art, or a gradient placeholder. */}
        <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-brand-orange/25 via-primary/20 to-violet-500/25 sm:h-48">
          {campaign.image ? (
            <img
              src={campaign.image}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <RiMegaphoneFill className="h-16 w-16 text-primary drop-shadow" aria-hidden />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
        </div>

        <div className="px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
          <div className="mb-3 flex items-center gap-2">
            {/* The disclosure. Above the title, not beneath it: this is a paid
                placement and the reader should know that before they read the
                pitch, not after. */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <RiMegaphoneFill className="h-3.5 w-3.5" aria-hidden />
              Sponsored
            </span>
            <span className="rounded-full bg-primary/12 px-2.5 py-1 text-xs font-medium capitalize text-primary">
              {campaign.contentType}
            </span>
          </div>

          <h2
            id="promo-announcement-title"
            className="text-xl font-bold leading-tight text-foreground sm:text-2xl"
          >
            {campaign.title}
          </h2>
          {campaign.description && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {campaign.description}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={handleView}
              className="h-11 flex-1 rounded-xl text-sm font-semibold"
            >
              Take a look
              <RiArrowRightLine className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDismiss}
              className="h-11 flex-1 rounded-xl text-sm font-semibold"
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
