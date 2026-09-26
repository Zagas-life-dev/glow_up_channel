"use client"

/**
 * The poster-style hero every content detail page opens with.
 *
 * A navy "place" in both themes (UP Design v1): the one element on the page
 * that does not follow the theme, with the orange/lime card-stack tiles off
 * its top-right corner. The closing-date tile turns solid orange when the
 * deadline is three days away or less.
 */

import { RiArrowLeftLine } from "react-icons/ri"
import { useGoBack } from "@/lib/navigation/in-app-history"
import { cn } from "@/lib/utils"
import type { StatTile } from "@/lib/content-detail/format"

/**
 * The per-type accent, applied to the eyebrow only.
 *
 * Urgency is never an accent: a closing deadline is orange on every type,
 * because it means the same thing everywhere. Written as whole class strings
 * because Tailwind cannot see a name assembled at runtime.
 */
export type DetailAccent = "orange" | "emerald" | "violet"

// The type now lives in the chip colour elsewhere; on the navy hero every
// eyebrow is orange, so the accent no longer changes the colour.
const EYEBROW_CLASS: Record<DetailAccent, string> = {
  orange: "text-up-orange",
  emerald: "text-up-orange",
  violet: "text-up-orange",
}

export interface DetailHeroProps {
  /** Small uppercase line above the title, e.g. "Grant · Deadline 12 Sep". */
  eyebrow?: string | null
  title: string
  /** Organisation and place, e.g. "Vital Impacts · Lagos, Nigeria". */
  subtitle?: string | null
  tiles?: StatTile[]
  accent?: DetailAccent
  onShare?: () => void
}

export function DetailHero({
  eyebrow,
  title,
  subtitle,
  tiles = [],
  accent = "orange",
  onShare,
}: DetailHeroProps) {
  const goBack = useGoBack()

  return (
    <header className="relative overflow-hidden bg-up-lead text-up-on-navy lg:rounded-[28px] dark:lg:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
      {/* Card-stack motif */}
      <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-[130px] w-[180px] -rotate-[8deg] rounded-up-xl bg-up-orange lg:-right-[30px] lg:-top-10 lg:h-[170px] lg:w-[240px] lg:rounded-[24px]" />
      <span aria-hidden className="pointer-events-none absolute -top-8 right-10 z-[1] h-[70px] w-[90px] rotate-[7deg] rounded-up-lg bg-up-lime lg:right-20 lg:h-[90px] lg:w-[120px] lg:rounded-up-xl" />

      {/* The app shell already applies the top safe-area inset, so this only
          needs its own breathing room. */}
      <div className="relative z-[2] mx-auto max-w-[680px] px-5 pb-8 pt-3 lg:max-w-none lg:px-9 lg:pb-[34px] lg:pt-7">
        <div className="flex items-center justify-between gap-3 pr-[150px] lg:pr-[260px]">
          <button
            onClick={goBack}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.08] text-up-on-navy transition-colors hover:bg-white/[0.14]"
            aria-label="Go back"
          >
            <RiArrowLeftLine className="h-5 w-5" aria-hidden />
          </button>
          {onShare && (
            <button
              onClick={onShare}
              className="h-10 rounded-full bg-white/[0.08] px-4 text-sm font-bold text-up-on-navy transition-colors hover:bg-white/[0.14]"
            >
              Share
            </button>
          )}
        </div>

        <div className="mt-6 lg:mt-[26px] lg:max-w-3xl">
          {eyebrow && (
            <p
              className={cn(
                "text-xs font-bold uppercase tracking-[0.1em]",
                EYEBROW_CLASS[accent],
              )}
            >
              {eyebrow}
            </p>
          )}
          <h1 className="mt-2.5 font-display text-[26px] font-bold leading-[1.15] lg:text-[36px]">
            {title}
          </h1>
          {subtitle && <p className="mt-2.5 text-[15px] text-up-orange">{subtitle}</p>}
        </div>

        {tiles.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-3 lg:mt-[26px] lg:max-w-[600px]">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className={cn(
                  "rounded-up-lg px-3.5 py-3.5 lg:px-4",
                  tile.urgent
                    ? "bg-up-orange"
                    : "bg-up-navy-subtle shadow-[inset_0_0_0_1px_var(--up-border-on-navy)]",
                )}
              >
                <p
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.1em] lg:text-[11px]",
                    tile.urgent ? "text-up-navy" : "text-up-orange",
                  )}
                >
                  {tile.label}
                </p>
                <p className={cn(
                  "mt-1.5 truncate font-display text-lg font-bold leading-none lg:text-[22px]",
                  tile.urgent ? "text-up-navy" : "text-up-on-navy",
                )}>
                  {tile.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}

export default DetailHero
