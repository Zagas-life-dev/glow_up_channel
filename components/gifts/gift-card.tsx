"use client"

/**
 * One gift in the shared list.
 *
 * The NEW badge is per-viewer, not per-gift: the list is identical for everyone,
 * but whether a given gift has been opened is tracked per user, so two people
 * looking at the same list see different badges.
 */

import Link from "next/link"
import { RiGiftFill, RiExternalLinkLine, RiFileTextLine, RiImageLine } from "react-icons/ri"
import { useLocale } from "@/lib/i18n/context"
import { giftHref } from "@/lib/gifts/routes"
import { formatGiftSize, type Gift } from "@/lib/gifts/types"

const DOC_FILE_TYPES = new Set(["pdf", "doc", "docx", "ppt", "pptx"])

function GiftTypeIcon({ gift }: { gift: Gift }) {
  if (gift.giftType === "link") return <RiExternalLinkLine className="h-4 w-4" aria-hidden />
  if (gift.fileType && DOC_FILE_TYPES.has(gift.fileType)) {
    return <RiFileTextLine className="h-4 w-4" aria-hidden />
  }
  return <RiImageLine className="h-4 w-4" aria-hidden />
}

export default function GiftCard({ gift }: { gift: Gift }) {
  const { t } = useLocale()
  const size = formatGiftSize(gift.fileSize)

  const meta = [
    gift.category,
    gift.pageCount ? `${gift.pageCount} ${gift.pageCount === 1 ? "page" : "pages"}` : null,
    size,
  ].filter(Boolean)

  return (
    <Link
      href={giftHref(gift._id)}
      className="group relative flex gap-3 overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-3 transition-all hover:border-primary/40 hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:gap-4 sm:p-4"
    >
      {/* Cover art, or the gift mark on a soft gradient. */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-brand-orange/15 to-violet-500/20 sm:h-24 sm:w-24">
        {gift.image ? (
          <img src={gift.image} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <RiGiftFill className="h-8 w-8 text-primary" aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-body-sm font-semibold leading-snug text-foreground sm:text-base">
            {gift.title}
          </h3>
          {gift.isNew && (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
              {t("gifts.isNew")}
            </span>
          )}
        </div>

        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {gift.description}
        </p>

        {meta.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-primary">
              <GiftTypeIcon gift={gift} />
            </span>
            {meta.map((entry, index) => (
              <span key={entry as string} className="capitalize">
                {index > 0 && <span className="mr-2 text-border">·</span>}
                {entry}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
