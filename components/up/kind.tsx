import type { IconType } from "react-icons"
import { RiFocus3Line, RiBriefcaseLine, RiCalendarLine, RiBookLine, RiTimeLine } from "react-icons/ri"
import { cn } from "@/lib/utils"

/**
 * UP Design v1 content-type treatment (design_platform_up_v1/index.html).
 *
 * One chip per kind, told apart by fill rather than by four unrelated hues:
 * opportunity = orange tint, job = solid navy (cream on dark), event = lime
 * tint (the approved Events exception), resource = outlined card.
 */
export type UpKind = "opportunity" | "job" | "event" | "resource"

export const UP_KIND: Record<UpKind, { icon: IconType; label: string; chip: string }> = {
  opportunity: {
    icon: RiFocus3Line,
    label: "Opportunity",
    chip: "bg-up-orange-tint text-up-orange-ink",
  },
  job: {
    icon: RiBriefcaseLine,
    label: "Job",
    chip: "bg-up-solid text-up-on-solid",
  },
  event: {
    icon: RiCalendarLine,
    label: "Event",
    chip: "bg-up-lime-tint text-up-lime-ink",
  },
  resource: {
    icon: RiBookLine,
    label: "Resource",
    chip: "bg-card text-foreground shadow-[inset_0_0_0_1.5px_hsl(var(--border))] dark:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.22)]",
  },
}

export function toUpKind(type: string | undefined | null): UpKind {
  const t = (type || "").toLowerCase().replace(/s$/, "")
  if (t === "job" || t === "event" || t === "resource") return t
  return "opportunity"
}

/** Square icon tile for a content kind. `lg` is the 44px version used in lists and heroes. */
export function KindChip({
  kind,
  size = "md",
  className,
}: {
  kind: UpKind
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const meta = UP_KIND[kind]
  const Icon = meta.icon
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center",
        size === "sm" && "h-7 w-7 rounded-[10px] [&>svg]:h-3.5 [&>svg]:w-3.5",
        size === "md" && "h-[34px] w-[34px] rounded-up-sm [&>svg]:h-[18px] [&>svg]:w-[18px]",
        size === "lg" && "h-11 w-11 rounded-up-md [&>svg]:h-[22px] [&>svg]:w-[22px]",
        meta.chip,
        className,
      )}
    >
      <Icon />
    </span>
  )
}

export type DeadlineTone = "upcoming" | "soon" | "urgent" | "closed" | "ok"

/**
 * Deadline pill. Escalates by fill: neutral → orange tint → solid orange with
 * navy text. `ok` is the lime "done / applied" state.
 */
export function DeadlinePill({
  tone,
  children,
  className,
  icon = tone === "soon" || tone === "urgent",
}: {
  tone: DeadlineTone
  children: React.ReactNode
  className?: string
  icon?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-[5px] whitespace-nowrap rounded-full px-2.5 py-[5px] text-xs font-bold tabular-nums",
        (tone === "upcoming" || tone === "closed") && "bg-up-fill text-muted-foreground",
        tone === "soon" && "bg-up-orange-tint text-up-orange-ink",
        tone === "urgent" && "bg-up-orange text-up-navy",
        tone === "ok" && "bg-up-lime-tint text-foreground",
        className,
      )}
    >
      {icon ? <RiTimeLine className="h-3.5 w-3.5" aria-hidden /> : null}
      {children}
    </span>
  )
}

/** Paid-placement disclosure that sits above a promoted card. */
export function SponsoredLabel({ children = "Sponsored", className }: { children?: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "mb-1.5 flex items-center gap-2 pl-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-up-orange" aria-hidden />
      {children}
    </p>
  )
}

/** Small uppercase eyebrow in orange ink, used above page titles. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-bold uppercase tracking-[0.08em] text-up-orange-ink", className)}>{children}</p>
  )
}
