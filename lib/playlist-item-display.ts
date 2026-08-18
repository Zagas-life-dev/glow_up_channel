import { RiFocus3Line, RiBriefcaseLine, RiCalendarLine, RiBookLine } from "react-icons/ri"
import { cn } from "@/lib/utils"

/**
 * How a playlist item is presented per content type — icon, label, and the route its
 * detail page lives on. Shared by the playlist detail page and the profile's Saved
 * tab so a saved item looks the same wherever it is listed.
 */
export const typeConfig = {
  opportunity: { icon: RiFocus3Line, color: "orange", label: "Opportunity", path: "opportunities", gradient: "from-orange-500/20 to-orange-600/10" },
  job: { icon: RiBriefcaseLine, color: "primary", label: "Job", path: "jobs", gradient: "from-primary/20 to-primary/10" },
  event: { icon: RiCalendarLine, color: "emerald", label: "Event", path: "events", gradient: "from-emerald-500/20 to-emerald-600/10" },
  resource: { icon: RiBookLine, color: "slate", label: "Resource", path: "resources", gradient: "from-slate-500/15 to-slate-600/8" },
} as const

export type TypeColor = (typeof typeConfig)[keyof typeof typeConfig]["color"]

/** Unknown/missing content types fall back to opportunity rather than rendering nothing. */
export function typeConfigFor(contentType?: string) {
  return typeConfig[contentType as keyof typeof typeConfig] || typeConfig.opportunity
}

/**
 * Detail route for a playlist item. `contentId` is the id of the underlying content;
 * `_id` is the row inside the playlist, used only as a fallback for older rows saved
 * before contentId was written.
 */
export function playlistItemHref(item: { contentId?: string; _id?: string; contentType?: string }): string {
  return `/${typeConfigFor(item.contentType).path}/${item.contentId || item._id}`
}

export function typeIconClass(color: TypeColor) {
  return cn(
    color === "orange" && "text-orange-400",
    color === "primary" && "text-primary",
    color === "emerald" && "text-emerald-400",
    color === "slate" && "text-slate-500 dark:text-slate-400",
  )
}

export function typeBadgeClass(color: TypeColor) {
  return cn(
    "text-xs font-medium backdrop-blur-sm",
    color === "orange" && "border-orange-500/30 text-orange-400 bg-primary/10",
    color === "primary" && "border-primary/30 text-primary bg-primary/10",
    color === "emerald" && "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
    color === "slate" && "border-slate-500/30 text-slate-600 bg-slate-500/10 dark:text-slate-300",
  )
}

export function typeBadgeSmallClass(color: TypeColor) {
  return cn(
    "text-[10px] font-semibold px-2 py-0.5",
    color === "orange" && "border-orange-500/40 text-orange-400 bg-primary/10",
    color === "primary" && "border-primary/30 text-primary bg-primary/10",
    color === "emerald" && "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    color === "slate" && "border-slate-500/40 text-slate-600 bg-slate-500/10 dark:text-slate-300",
  )
}
