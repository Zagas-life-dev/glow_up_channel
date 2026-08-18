"use client"

import { RiPlayList2Fill } from "react-icons/ri"
import { cn } from "@/lib/utils"

/**
 * Generated cover art — the one loud element on the playlist pages.
 *
 * Every playlist gets its own mesh gradient, deterministic from its id so it never changes,
 * hue-anchored on the content types it holds. Colours stay inside the brand arc (orange
 * #ff6700 through coral/magenta down to the logo blue #0b1222), so a wall of covers reads
 * as one product rather than a swatch book.
 *
 * Size comes entirely from `className` — the same component works at 64px in a row and
 * 176px in a page header.
 */

const ITEM_TYPES = ["opportunity", "job", "event", "resource"] as const
type ItemType = (typeof ITEM_TYPES)[number]

/** Warm brand hues per type; resource pulls toward the logo blue for contrast in a mixed list. */
const TYPE_HUE: Record<ItemType, number> = {
  opportunity: 24,
  job: 8,
  event: 42,
  resource: 258,
}

/** Used when a playlist's items aren't loaded — keeps a list of covers visibly distinct. */
const FALLBACK_HUES = [24, 8, 42, 350, 258, 14, 336, 32]

/** The logo blue, used as every cover's deep anchor. */
const BRAND_BLUE = 222

function seedHash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function isItemType(value: unknown): value is ItemType {
  return ITEM_TYPES.includes(value as ItemType)
}

export interface PlaylistArt {
  /** Ready-to-use CSS `background` shorthand for the cover. */
  background: string
  /** Dominant hue, so a page can tint its ambient wash to match the art. */
  hue: number
}

/**
 * Three seeded colour blooms over a diagonal base. Positions and hues both vary with the
 * seed, so two playlists holding the same content types still look different.
 */
export function playlistArt(seed: string, types: (string | undefined)[] = []): PlaylistArt {
  const h = seedHash(seed)

  const present: ItemType[] = []
  for (const type of types) {
    const resolved = isItemType(type) ? type : "opportunity"
    if (!present.includes(resolved)) present.push(resolved)
    if (present.length === ITEM_TYPES.length) break
  }

  const hueA = present.length
    ? (TYPE_HUE[present[0]] + (h % 21) - 10 + 360) % 360
    : FALLBACK_HUES[h % FALLBACK_HUES.length]
  // Second bloom rotates backwards into coral/magenta rather than forwards into green.
  const hueB = (hueA - 10 - ((h >> 5) % 30) + 360) % 360
  const hueC = BRAND_BLUE + ((h >> 9) % 21) - 10

  const at = (shift: number, min: number, span: number) => min + ((h >> shift) % span)

  return {
    hue: hueA,
    background: [
      `radial-gradient(circle at ${at(2, 12, 32)}% ${at(6, 10, 30)}%, hsl(${hueA} 100% 60%) 0%, transparent 58%)`,
      `radial-gradient(circle at ${at(10, 56, 34)}% ${at(14, 16, 32)}%, hsl(${hueB} 96% 54%) 0%, transparent 55%)`,
      `radial-gradient(circle at ${at(18, 22, 50)}% ${at(22, 66, 30)}%, hsl(${hueC} 72% 32%) 0%, transparent 62%)`,
      `linear-gradient(${at(26, 115, 80)}deg, hsl(${hueA} 88% 46%), hsl(${hueC} 68% 15%))`,
    ].join(", "),
  }
}

interface PlaylistCoverProps {
  /** Stable value (playlist id) so a given playlist always renders the same art. */
  seed: string
  /** Content types of the playlist's items; pass what you have, order is respected. */
  types?: (string | undefined)[]
  /** Renders the neutral placeholder instead of art — for playlists with nothing in them. */
  empty?: boolean
  className?: string
  rounded?: string
}

export function PlaylistCover({
  seed,
  types = [],
  empty = false,
  className,
  rounded = "rounded-2xl",
}: PlaylistCoverProps) {
  const art = playlistArt(seed, types)

  if (empty) {
    return (
      <div
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center border border-dashed border-border bg-muted/40",
          rounded,
          className,
        )}
      >
        <RiPlayList2Fill className="h-[34%] w-[34%] text-muted-foreground/50" />
      </div>
    )
  }

  return (
    <div
      aria-hidden
      className={cn("relative shrink-0 overflow-hidden", rounded, className)}
      style={{ background: art.background }}
    >
      {/* Gloss + inner edge — gives the art a physical, pressed-glass feel. */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(155deg, rgba(255,255,255,0.28), transparent 46%)" }}
      />
      <div className={cn("absolute inset-0 ring-1 ring-inset ring-white/15", rounded)} />
    </div>
  )
}
