"use client"

/**
 * The poster-style hero every content detail page opens with.
 *
 * Deliberately dark in both themes — it is the one element on the page that
 * does not follow the theme, because the layout reads as a poster and a poster
 * needs a constant ground to sit on.
 */

import { RiArrowLeftLine } from "react-icons/ri"
import { useRouter } from "next/navigation"
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

const EYEBROW_CLASS: Record<DetailAccent, string> = {
  orange: "text-orange-500",
  emerald: "text-emerald-400",
  violet: "text-violet-400",
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
  const router = useRouter()

  return (
    <header className="bg-slate-950 text-white lg:rounded-[2rem]">
      {/* The app shell already applies the top safe-area inset, so this only
          needs its own breathing room. */}
      <div className="mx-auto max-w-[680px] px-5 pb-8 pt-3 lg:max-w-none lg:px-10 lg:pb-10 lg:pt-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="-ml-2 rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Go back"
          >
            <RiArrowLeftLine className="h-5 w-5" aria-hidden />
          </button>
          {onShare && (
            <button
              onClick={onShare}
              className="rounded-full px-3 py-1.5 text-[15px] text-sky-300 transition-colors hover:bg-white/5 hover:text-sky-200"
            >
              Share
            </button>
          )}
        </div>

        <div className="mt-6 lg:mt-8 lg:max-w-3xl">
          {eyebrow && (
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.16em]",
                EYEBROW_CLASS[accent],
              )}
            >
              {eyebrow}
            </p>
          )}
          <h1 className="mt-2.5 text-[28px] font-bold leading-[1.14] tracking-[-0.02em] lg:text-[40px] lg:leading-[1.08]">
            {title}
          </h1>
          {subtitle && <p className="mt-2.5 text-[15px] text-slate-400 lg:text-base">{subtitle}</p>}
        </div>

        {tiles.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-3 lg:mt-8 lg:max-w-xl">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className={cn(
                  "rounded-2xl px-4 py-3.5",
                  tile.urgent ? "bg-orange-500/[0.14]" : "bg-white/[0.05]",
                )}
              >
                <p
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.14em]",
                    tile.urgent ? "text-orange-400" : "text-slate-400",
                  )}
                >
                  {tile.label}
                </p>
                <p className="mt-1.5 truncate text-[22px] font-bold leading-none text-white">
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
