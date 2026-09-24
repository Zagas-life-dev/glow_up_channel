"use client"

import { RiPlayList2Fill } from "react-icons/ri"
import { cn } from "@/lib/utils"

/**
 * Generated cover art — the card-stack motif from UP Design v1.
 *
 * A navy tile with three rotated cards, each coloured by a content type the
 * playlist holds: opportunity = orange, job = cream, event = lime, resource =
 * a muted blue. So a cover says what's inside at a glance, and a wall of covers
 * reads as one product rather than a swatch book. The tilt of the stack is
 * seeded from the playlist id, so two lists with the same mix still differ.
 *
 * Size comes entirely from `className` — the same component works at 64px in a
 * row and 176px in a page header.
 */

const ITEM_TYPES = ["opportunity", "job", "event", "resource"] as const
type ItemType = (typeof ITEM_TYPES)[number]

const TYPE_FILL: Record<ItemType, string> = {
  opportunity: "#FF6A00",
  job: "#FBFAF7",
  event: "#D6FF3F",
  resource: "#5B6BA8",
}

/** Hue used for a page's ambient wash, keyed to the first type present. */
const TYPE_HUE: Record<ItemType, number> = {
  opportunity: 25,
  job: 45,
  event: 73,
  resource: 229,
}

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

/** The three card colours, in stack order. Falls back to a seeded mix when types aren't loaded. */
function stackFills(seed: string, types: (string | undefined)[]): string[] {
  const present: ItemType[] = []
  for (const type of types) {
    const resolved = isItemType(type) ? type : "opportunity"
    if (!present.includes(resolved)) present.push(resolved)
    if (present.length === 3) break
  }
  if (present.length === 0) {
    const h = seedHash(seed)
    const start = h % ITEM_TYPES.length
    for (let i = 0; i < 3; i++) present.push(ITEM_TYPES[(start + i) % ITEM_TYPES.length])
  }
  while (present.length < 3) present.push(present[present.length - 1])
  return present.map((t) => TYPE_FILL[t])
}

export interface PlaylistArt {
  /** Ready-to-use CSS `background` shorthand for the cover ground. */
  background: string
  /** Dominant hue, so a page can tint its ambient wash to match the art. */
  hue: number
}

export function playlistArt(seed: string, types: (string | undefined)[] = []): PlaylistArt {
  const first = types.find(isItemType) as ItemType | undefined
  return {
    background: "#0B1233",
    hue: first ? TYPE_HUE[first] : TYPE_HUE.opportunity,
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
  /**
   * An uploaded cover. Wins over the generated art — and over `empty`, since a
   * creator who set a cover on a new list wants to see it before it has items.
   */
  imageUrl?: string | null
}

export function PlaylistCover({
  seed,
  types = [],
  empty = false,
  className,
  rounded = "rounded-up-lg",
  imageUrl,
}: PlaylistCoverProps) {
  if (imageUrl) {
    return (
      <div aria-hidden className={cn("relative shrink-0 overflow-hidden bg-up-navy", rounded, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary already sizes and formats it */}
        <img src={imageUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        <div className={cn("absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10", rounded)} />
      </div>
    )
  }

  if (empty) {
    return (
      <div
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center border border-dashed border-border bg-up-fill",
          rounded,
          className,
        )}
      >
        <RiPlayList2Fill className="h-[34%] w-[34%] text-muted-foreground" />
      </div>
    )
  }

  const fills = stackFills(seed, types)
  const tilt = (seedHash(seed) % 5) - 2

  return (
    <div
      aria-hidden
      className={cn("relative shrink-0 overflow-hidden bg-up-navy dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]", rounded, className)}
    >
      <i
        className="absolute left-[10%] top-[14%] h-[48%] w-[62%] rounded-[18%]"
        style={{ background: fills[0], transform: `rotate(${-8 + tilt}deg)` }}
      />
      <i
        className="absolute left-[34%] top-[34%] h-[44%] w-[58%] rounded-[18%]"
        style={{ background: fills[1], transform: `rotate(${6 - tilt}deg)` }}
      />
      <i
        className="absolute left-[16%] top-[62%] h-[30%] w-[40%] rounded-[18%]"
        style={{ background: fills[2], transform: `rotate(${-3 + tilt}deg)` }}
      />
    </div>
  )
}
