"use client"

/**
 * Extreme promotions: the control room.
 *
 * Three things live here, and each exists because the tier is unusual in a way
 * the ordinary promotions screen does not cover.
 *
 * **The kill switch.** Extreme campaigns are granted by hand and cost nothing,
 * so no budget runs out and nothing self-limits. If the feed goes wrong at
 * three in the morning, this is the one control that stops it — feed placement,
 * popup, push and email together — without a deploy.
 *
 * **The delivery counters.** A bought package can be judged against its
 * invoice; a granted one cannot. Views and clicks alone cannot separate reach
 * the feed earned from reach bought by interrupting people twice, so the
 * announcement channels are counted separately and shown here.
 *
 * **The top-ten preview.** The caps are the only thing standing between several
 * live campaigns and a first screen that is mostly advertising, and they are
 * invisible until they fire. This runs the *real* pipeline — the same
 * `applyVarietyOrder` and `enforcePromotedCaps` the feed runs, over the real
 * anonymous feed — and shows what the top of it actually looks like right now.
 * A simulation that reimplemented the ordering would be worth nothing; this one
 * is the ordering.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  RiArrowLeftLine,
  RiMegaphoneLine,
  RiNotification3Line,
  RiMailSendLine,
  RiEyeLine,
  RiCursorLine,
  RiAlertLine,
} from "react-icons/ri"

import { AdminShell } from "@/components/admin/admin-shell"
import { AdminStat, AdminStatGrid } from "@/components/admin/ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { normalizeUnifiedFeedItem } from "@/lib/feed-content-type"
import { applyVarietyOrder } from "@/lib/feed-variety-order"
import { isExtremePromotion, isPromoted } from "@/lib/promotion-boost"
import {
  MAX_EXTREME_IN_FEED_TOP,
  MAX_PROMOTED_IN_FEED_TOP,
  TOP_SLOTS,
  enforcePromotedCaps,
} from "@/lib/promotion-placement"
import { cn } from "@/lib/utils"

const API = process.env.NEXT_PUBLIC_BACKEND_URL

type Analytics = {
  views?: number
  clicks?: number
  popupImpressions?: number
  popupDismissals?: number
  popupClicks?: number
  pushSent?: number
  emailImpressions?: number
  announcementClicks?: number
}

type ExtremeCampaign = {
  _id: string
  contentType: string
  status: string
  startDate: string
  endDate: string
  analytics?: Analytics
  content?: { title?: string } | null
  provider?: { firstName?: string; lastName?: string; email?: string } | null
}

type PreviewSlot = {
  _id: string
  title: string
  kind: "extreme" | "promoted" | "organic"
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const sum = (rows: ExtremeCampaign[], key: keyof Analytics) =>
  rows.reduce((total, row) => total + (row.analytics?.[key] ?? 0), 0)

/** Whole percent, or an em dash when the denominator is zero. */
function rate(numerator: number, denominator: number): string {
  if (!denominator) return "—"
  return `${Math.round((numerator / denominator) * 100)}%`
}

export default function ExtremePromotionsPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [switching, setSwitching] = useState(false)
  const [campaigns, setCampaigns] = useState<ExtremeCampaign[]>([])
  const [preview, setPreview] = useState<PreviewSlot[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadSwitch = useCallback(async () => {
    if (!API) return
    try {
      const res = await fetch(`${API}/api/admin/promotions/extreme-switch`, {
        headers: authHeaders(),
      })
      const data = await res.json()
      if (data?.success) setEnabled(data.data.enabled !== false)
    } catch {
      // The card renders an unknown state rather than an error page.
    }
  }, [])

  const loadCampaigns = useCallback(async () => {
    if (!API) return
    try {
      const res = await fetch(
        `${API}/api/admin/promotions?packageType=extreme&limit=50`,
        { headers: authHeaders() },
      )
      const data = await res.json()
      if (data?.success) setCampaigns(data.data.promotions || [])
    } catch {
      toast.error("Could not load extreme campaigns")
    }
  }, [])

  /**
   * Build the preview by running the production pipeline over the real feed.
   *
   * The anonymous feed is used because it is the one feed that is identical for
   * everybody — a personalised one would show what the top ten looks like for
   * whichever admin happened to be logged in, which answers a question nobody
   * asked. The cap behaviour being inspected here is the same either way.
   */
  const loadPreview = useCallback(async () => {
    if (!API) return
    try {
      const res = await fetch(`${API}/api/feed/anonymous`)
      const data = await res.json()
      const feed = Array.isArray(data?.data?.feed) ? data.data.feed : []
      if (feed.length === 0) {
        setPreview([])
        return
      }

      const normalized = feed.map((row: Record<string, unknown>) =>
        normalizeUnifiedFeedItem(row),
      )
      const ordered = enforcePromotedCaps(
        applyVarietyOrder(normalized as Parameters<typeof applyVarietyOrder>[0]),
        {
          isPromoted,
          isExtreme: isExtremePromotion,
          maxExtreme: MAX_EXTREME_IN_FEED_TOP,
          maxPromoted: MAX_PROMOTED_IN_FEED_TOP,
        },
      )

      setPreview(
        ordered.slice(0, TOP_SLOTS).map((item) => {
          const row = item as Record<string, unknown>
          return {
            _id: String(row._id ?? ""),
            title: typeof row.title === "string" ? row.title : "Untitled",
            kind: isExtremePromotion(row)
              ? "extreme"
              : isPromoted(row)
                ? "promoted"
                : "organic",
          }
        }),
      )
    } catch {
      setPreview([])
    }
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadSwitch(), loadCampaigns(), loadPreview()])
    setRefreshing(false)
  }, [loadSwitch, loadCampaigns, loadPreview])

  useEffect(() => {
    // Guarded rather than called bare, matching the contexts: the three fetches
    // behind `refresh` all set state, and an admin who navigates away mid-load
    // should not have them land on an unmounted page.
    let cancelled = false

    const run = () => {
      if (cancelled) return
      void refresh()
    }

    run()
    return () => {
      cancelled = true
    }
  }, [refresh])

  const toggle = async (next: boolean) => {
    if (!API) return
    setSwitching(true)
    // Optimistic, because the switch is reached for in a hurry and a spinner
    // that might be a failed request is worse than a value that snaps back.
    setEnabled(next)
    try {
      const res = await fetch(`${API}/api/admin/promotions/extreme-switch`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      })
      const data = await res.json()
      if (!data?.success) throw new Error(data?.message || "Failed")
      toast.success(data.message)
      void loadPreview()
    } catch (error) {
      setEnabled(!next)
      toast.error(error instanceof Error ? error.message : "Could not change the switch")
    } finally {
      setSwitching(false)
    }
  }

  const live = useMemo(
    () => campaigns.filter((c) => c.status === "active"),
    [campaigns],
  )

  const popupImpressions = sum(campaigns, "popupImpressions")
  const popupClicks = sum(campaigns, "popupClicks")
  const popupDismissals = sum(campaigns, "popupDismissals")
  const pushSent = sum(campaigns, "pushSent")
  const emailImpressions = sum(campaigns, "emailImpressions")
  const announcementClicks = sum(campaigns, "announcementClicks")

  const extremeInTop = preview?.filter((s) => s.kind === "extreme").length ?? 0
  const paidInTop = preview?.filter((s) => s.kind !== "organic").length ?? 0

  return (
    <AdminShell
      title="Extreme promotions"
      description="The two-sided tier: feed placement, announcements, push and email."
      width="wide"
      requireSuperAdmin
      onRefresh={refresh}
      refreshing={refreshing}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/admin/promotions">
            <RiArrowLeftLine className="mr-1.5 h-4 w-4" />
            All promotions
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* The kill switch. */}
        <Card className={cn(enabled === false && "border-destructive")}>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                {enabled === false && (
                  <RiAlertLine className="h-4 w-4 text-destructive" aria-hidden />
                )}
                Delivery
              </CardTitle>
              <CardDescription className="mt-1">
                {enabled === false
                  ? "Suspended. No extreme campaign is placed in the feed, announced, pushed or emailed. Campaign dates and delivery history are untouched — turning this back on restores everything exactly as it was."
                  : "Live. Extreme campaigns are placed, announced, pushed and emailed."}
              </CardDescription>
            </div>
            <Switch
              checked={enabled ?? false}
              disabled={enabled === null || switching}
              onCheckedChange={toggle}
              aria-label="Extreme promotion delivery"
            />
          </CardHeader>
        </Card>

        <AdminStatGrid>
          <AdminStat
            label="Live campaigns"
            value={live.length}
            hint={`${campaigns.length} total`}
            icon={RiMegaphoneLine}
          />
          <AdminStat
            label="Popup impressions"
            value={popupImpressions.toLocaleString()}
            hint={`${rate(popupClicks, popupImpressions)} opened · ${rate(popupDismissals, popupImpressions)} dismissed`}
            icon={RiEyeLine}
          />
          <AdminStat
            label="Pushes sent"
            value={pushSent.toLocaleString()}
            hint="One per reader per announcement day"
            icon={RiNotification3Line}
          />
          <AdminStat
            label="Email slots"
            value={emailImpressions.toLocaleString()}
            hint={`${announcementClicks.toLocaleString()} clicks from push or email`}
            icon={RiMailSendLine}
          />
        </AdminStatGrid>

        {/* The preview. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top {TOP_SLOTS} right now</CardTitle>
            <CardDescription>
              The real ordering, run over the live anonymous feed — not a simulation.
              Caps allow at most {MAX_EXTREME_IN_FEED_TOP} extreme and{" "}
              {MAX_PROMOTED_IN_FEED_TOP} paid placements in these {TOP_SLOTS} slots.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preview === null ? (
              <p className="py-6 text-sm text-muted-foreground">Loading the feed…</p>
            ) : preview.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                The anonymous feed returned nothing to order.
              </p>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap gap-2 text-xs">
                  <Badge variant={extremeInTop > MAX_EXTREME_IN_FEED_TOP ? "destructive" : "secondary"}>
                    {extremeInTop} / {MAX_EXTREME_IN_FEED_TOP} extreme
                  </Badge>
                  <Badge variant={paidInTop > MAX_PROMOTED_IN_FEED_TOP ? "destructive" : "secondary"}>
                    {paidInTop} / {MAX_PROMOTED_IN_FEED_TOP} paid in total
                  </Badge>
                  <Badge variant="outline">{preview.length - paidInTop} organic</Badge>
                </div>

                <ol className="divide-y divide-border">
                  {preview.map((slot, index) => (
                    <li key={`${slot._id}-${index}`} className="flex items-center gap-3 py-2.5">
                      <span className="w-6 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {slot.title}
                      </span>
                      {slot.kind === "extreme" ? (
                        <Badge className="shrink-0">Extreme</Badge>
                      ) : slot.kind === "promoted" ? (
                        <Badge variant="secondary" className="shrink-0">
                          Promoted
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0 text-muted-foreground">
                          Organic
                        </Badge>
                      )}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </CardContent>
        </Card>

        {/* Per-campaign delivery. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaigns</CardTitle>
            <CardDescription>
              What each campaign has delivered through the announcement channels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No extreme campaigns have been granted yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Listing</th>
                      <th className="pb-2 px-3 font-medium">Status</th>
                      <th className="pb-2 px-3 text-right font-medium">Popups</th>
                      <th className="pb-2 px-3 text-right font-medium">Opened</th>
                      <th className="pb-2 px-3 text-right font-medium">Pushes</th>
                      <th className="pb-2 px-3 text-right font-medium">Emails</th>
                      <th className="pb-2 pl-3 text-right font-medium">Ends</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {campaigns.map((campaign) => {
                      const a = campaign.analytics ?? {}
                      return (
                        <tr key={campaign._id}>
                          <td className="max-w-[240px] truncate py-2.5 pr-3 text-foreground">
                            {campaign.content?.title || "Listing removed"}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant={campaign.status === "active" ? "secondary" : "outline"}
                              className="capitalize"
                            >
                              {campaign.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {(a.popupImpressions ?? 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                            {rate(a.popupClicks ?? 0, a.popupImpressions ?? 0)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {(a.pushSent ?? 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {(a.emailImpressions ?? 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 pl-3 text-right text-muted-foreground">
                            {campaign.endDate
                              ? new Date(campaign.endDate).toLocaleDateString()
                              : "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RiCursorLine className="h-3.5 w-3.5" aria-hidden />
          Clicks from a push or an email are counted together, since the delivery
          columns above already separate the two channels.
        </p>
      </div>
    </AdminShell>
  )
}
