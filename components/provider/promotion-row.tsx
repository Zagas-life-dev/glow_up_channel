"use client"

/**
 * One promotion, with the controls to change it.
 *
 * Until now a campaign was write-once: you chose a length when you started it
 * and the only way out was to cancel and start again — which throws away the
 * delivery history and, for an extreme campaign, re-rolls the announcement
 * schedule. Extending and trimming are the two things providers actually ask
 * for, and both are one operation on the end date.
 *
 * The control is expressed as **total days from the start**, not "add N more",
 * because that is the number the campaign is described by everywhere else on
 * the page. "30 days" means the campaign is thirty days long, whether it was
 * started yesterday or a fortnight ago; the "ends on" preview underneath makes
 * the consequence concrete before anything is saved.
 *
 * Trimming below what has already elapsed is a legitimate way to stop early
 * while keeping the record, so it is allowed and the button says what it will
 * do rather than silently completing the campaign.
 */

import { useState } from "react"
import { toast } from "sonner"
import {
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  Clock,
  Loader2,
  Megaphone,
  Settings2,
  Target,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ApiClient from "@/lib/api-client"
import { announcementCount } from "@/lib/promotions/announcement"
import { cn } from "@/lib/utils"
import { statusToneClass } from "@/components/provider/provider-ui"

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_DURATION = 365

/** Total-length presets. Not increments — see the header. */
const DURATION_PRESETS = [7, 14, 21, 30, 60, 90]

export interface PromotionRowData {
  _id: string
  contentId: string
  contentType: string
  packageType: string
  packageName?: string
  duration: number
  status: string
  createdAt: string
  startDate?: string
  endDate?: string
  remainingDays?: number
  /**
   * The span the extreme tier's announcement days are drawn from, pinned at
   * creation. Null on every other package, and absent on extreme campaigns
   * created before the field existed — `announcementCount` falls back to
   * `duration` for those, which is what they were already using.
   */
  announcementSpanDays?: number | null
  content?: { title?: string } | null
}

const CONTENT_ICONS: Record<string, typeof Target> = {
  event: Calendar,
  job: Briefcase,
  resource: BookOpen,
  opportunity: Target,
}

const isExtreme = (p: PromotionRowData) => p.packageType === "extreme"

/** Finished campaigns are a record, not something to edit. */
const isFinished = (p: PromotionRowData) =>
  ["completed", "cancelled", "expired"].includes(p.status)

function formatDate(value?: string | Date | null): string {
  if (!value) return "—"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString()
}

export function PromotionRow({
  promotion,
  now,
  onChanged,
}: {
  promotion: PromotionRowData
  /**
   * The clock, passed in rather than read here.
   *
   * Progress and the "ends on" preview both depend on the current time, and
   * reading it during render makes the component impure: the server and the
   * first client render would disagree about how far through a campaign is,
   * which is a hydration mismatch on every row. The page reads it once when it
   * loads its data, which is also the more honest number — this is progress as
   * of the data being fetched, not as of an arbitrary re-render.
   */
  now: number
  onChanged: () => void
}) {
  const Icon = CONTENT_ICONS[promotion.contentType] ?? Target
  const extreme = isExtreme(promotion)
  const finished = isFinished(promotion)

  /**
   * Read off the pinned span rather than the current duration, and that is the
   * point of the fallback order: extending a run below does not buy more
   * announcements, because the days — and now the count — are drawn from the
   * span frozen at creation. Showing the number the duration implies would
   * promise a provider something the schedule will not deliver.
   */
  const announcementDayCount = announcementCount(
    promotion.announcementSpanDays ?? promotion.duration,
  )

  const [managing, setManaging] = useState(false)
  const [days, setDays] = useState(promotion.duration || 7)
  const [saving, setSaving] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)

  const start = promotion.startDate ? new Date(promotion.startDate) : null
  const end = promotion.endDate ? new Date(promotion.endDate) : null

  // How far through the run we are. Only meaningful while it is running.
  const progress =
    start && end && end.getTime() > start.getTime()
      ? Math.min(1, Math.max(0, (now - start.getTime()) / (end.getTime() - start.getTime())))
      : 0

  const safeDays = Math.min(Math.max(1, days || 1), MAX_DURATION)
  const previewEnd = start ? new Date(start.getTime() + safeDays * DAY_MS) : null
  const previewEndsNow = previewEnd ? previewEnd.getTime() <= now : false
  const unchanged = safeDays === promotion.duration

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await ApiClient.updatePromotionDuration(promotion._id, safeDays)
      toast.success(
        result.ended
          ? "Promotion ended"
          : `Now runs for ${result.duration} days · ${result.remainingDays} left`,
      )
      setManaging(false)
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the promotion")
    } finally {
      setSaving(false)
    }
  }

  const handleStop = async () => {
    setStopping(true)
    try {
      await ApiClient.cancelPromotion(promotion._id)
      toast.success("Promotion stopped")
      setManaging(false)
      setConfirmStop(false)
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not stop the promotion")
    } finally {
      setStopping(false)
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/40 p-3 transition-colors",
        extreme ? "border-primary/30 bg-primary/[0.03]" : "border-border/50",
        !managing && "hover:border-primary/20 hover:bg-card/80",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
            extreme ? "border-primary/40 bg-primary/15" : "border-primary/25 bg-primary/10",
          )}
        >
          <Icon className="h-4 w-4 text-primary" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 truncate text-body-sm font-semibold text-foreground">
              {promotion.content?.title || "Listing removed"}
            </h3>
            {extreme && (
              <Badge className="shrink-0 rounded-md bg-primary px-1.5 py-0 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                Extreme
              </Badge>
            )}
            <Badge
              className={cn(
                "shrink-0 rounded-md px-1.5 py-0 text-[10px] font-semibold capitalize",
                statusToneClass(promotion.status),
              )}
            >
              {promotion.status}
            </Badge>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span className="capitalize">{promotion.contentType || "—"}</span>
            <span className="opacity-40">·</span>
            <span className="tabular-nums">{promotion.duration ?? 0} days</span>
            <span className="opacity-40">·</span>
            <span>
              {formatDate(promotion.startDate)} → {formatDate(promotion.endDate)}
            </span>
          </div>

          {/* Progress. A bar rather than a number, because "12 days remaining"
              says nothing about whether that is most of the run or the tail. */}
          {!finished && start && end && (
            <div className="mt-2.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock className="h-3 w-3" />
                  {typeof promotion.remainingDays === "number"
                    ? `${promotion.remainingDays} days left`
                    : "Running"}
                </span>
                <span className="tabular-nums">{Math.round(progress * 100)}%</span>
              </div>
            </div>
          )}

          {extreme && !finished && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <Megaphone className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden />
              Announced to each reader on {announcementDayCount}{" "}
              {announcementDayCount === 1 ? "day" : "separate days"} of this campaign,
              with a push notification and an email slot.
            </p>
          )}

          {!finished && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={managing ? "secondary" : "outline"}
                className="h-8"
                onClick={() => {
                  setManaging((v) => !v)
                  setConfirmStop(false)
                  setDays(promotion.duration || 7)
                }}
              >
                <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                {managing ? "Close" : "Manage"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Management panel. */}
      {managing && !finished && (
        <div className="mt-3 space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">
              Total length, counted from the day it started
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={safeDays === n ? "default" : "outline"}
                  className="h-8"
                  disabled={saving || stopping}
                  onClick={() => setDays(n)}
                >
                  {n}d
                </Button>
              ))}
              <Input
                type="number"
                min={1}
                max={MAX_DURATION}
                value={days}
                disabled={saving || stopping}
                onChange={(e) => setDays(parseInt(e.target.value, 10) || 1)}
                className="h-8 w-20"
                aria-label="Total days"
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              {previewEndsNow ? (
                <span className="text-amber-600 dark:text-amber-400">
                  That is shorter than this campaign has already run — saving will
                  end it now.
                </span>
              ) : (
                <>Ends {formatDate(previewEnd)}.</>
              )}
              {extreme && !previewEndsNow && (
                <> Announcement days stay where they were.</>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={saving || stopping || unchanged}
              onClick={handleSave}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : previewEndsNow ? (
                "End now"
              ) : (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Save length
                </>
              )}
            </Button>

            {confirmStop ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-8"
                  disabled={stopping}
                  onClick={handleStop}
                >
                  {stopping ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Stopping…
                    </>
                  ) : (
                    "Yes, stop it"
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  disabled={stopping}
                  onClick={() => setConfirmStop(false)}
                >
                  Keep running
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="ml-auto h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={saving || stopping}
                onClick={() => setConfirmStop(true)}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Stop promotion
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
