"use client"

/**
 * Admin: how Stories is doing.
 *
 * Three questions, in the order they matter:
 *   1. Do stories add engagement, or only move it from the feed? Stories users
 *      against the 10% holdout, every surface counted.
 *   2. Per listing a reader sees, which gets more done: a story slide or a
 *      feed card?
 *   3. Do people tap through? Opens, engaged opens (2+ slides), completion.
 */

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { AdminShell } from "@/components/admin/admin-shell"
import { AnalyticsTabs } from "@/components/admin/analytics-tabs"
import { AdminSection, AdminSkeletonStats, AdminStat, AdminStatGrid } from "@/components/admin/ui"
import { fetchStoryResults, type StoryResults } from "@/lib/stories/api"
import { cn } from "@/lib/utils"

const WINDOWS = [7, 28, 90]

function fmtPct(n: number | null | undefined) {
  if (n === null || n === undefined) return "—"
  return `${n > 0 ? "+" : ""}${n}%`
}

const SURFACE_NAMES: Record<string, string> = {
  feed: "Home feed",
  story: "Stories",
  detail: "Detail page (direct)",
  playlist: "Playlists",
  search: "Search",
  push: "Push / email",
  tracker: "Tracker",
  digest: "Digest",
  other: "Other",
  unknown: "Before tracking (no surface)",
}

export default function StoriesAnalyticsPage() {
  const [days, setDays] = useState(28)
  const [data, setData] = useState<StoryResults | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await fetchStoryResults(days))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load results")
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  const surfaces = data
    ? Object.entries(data.surfaces).sort((a, b) => (b[1].seen || 0) - (a[1].seen || 0) || b[1].save - a[1].save)
    : []
  const until = data ? new Date(data.holdoutUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""

  return (
    <AdminShell
      title="Stories"
      description="Do stories add engagement, and do they beat the feed per listing seen?"
      onRefresh={load}
      refreshing={loading}
      width="wide"
    >
      <div className="space-y-5">
        <AnalyticsTabs />

        <div className="flex gap-1" role="group" aria-label="Window">
          {WINDOWS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                "h-9 rounded-lg px-3 text-sm font-medium",
                d === days ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              Last {d} days
            </button>
          ))}
        </div>

        {loading && !data ? <AdminSkeletonStats /> : null}

        {data ? (
          <>
            <AdminSection
              title="1. Stories vs holdout"
              description={`${data.groups.holdout.toLocaleString()} people get no stories until ${until}; ${data.groups.stories.toLocaleString()} do. Per person, every surface counted. A lift here is engagement stories added, not moved.`}
            >
              <AdminStatGrid>
                {(["save", "apply", "tracker", "content_view"] as const).map((k) => (
                  <AdminStat
                    key={k}
                    label={{ save: "Saves", apply: "Apply clicks", tracker: "Tracker adds", content_view: "Listings opened" }[k]}
                    value={fmtPct(data.holdout.liftPct[k])}
                    hint={`${data.holdout.perUser.stories[k] ?? 0} vs ${data.holdout.perUser.holdout[k] ?? 0} per person`}
                    emphasis={(data.holdout.liftPct[k] ?? 0) > 0 ? "positive" : "none"}
                  />
                ))}
              </AdminStatGrid>
            </AdminSection>

            <AdminSection
              title="2. Per listing seen"
              description="Saves, applies and playlist adds per 100 listings on screen. A story slide is one listing; a feed card counts once it is half on screen for a second."
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Where</th>
                      <th className="py-2 pr-3 text-right font-medium">Seen</th>
                      <th className="py-2 pr-3 text-right font-medium">Saves</th>
                      <th className="py-2 pr-3 text-right font-medium">Applies</th>
                      <th className="py-2 pr-3 text-right font-medium">Playlist adds</th>
                      <th className="py-2 text-right font-medium">Actions / 100 seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surfaces.map(([key, s]) => (
                      <tr key={key} className="border-b border-border/60 last:border-0">
                        <td className="py-2.5 pr-3 font-medium text-foreground">{SURFACE_NAMES[key] || key}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{s.seen ? s.seen.toLocaleString() : "—"}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{s.save.toLocaleString()}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{s.apply.toLocaleString()}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{s.playlist_add.toLocaleString()}</td>
                        <td className="py-2.5 text-right font-semibold tabular-nums">{s.actionsPer100Seen ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminSection>

            <AdminSection
              title="3. Do people tap through?"
              description="An engaged open goes past the first slide — the bar for counting as active. Complete means they reached the end card."
            >
              <AdminStatGrid>
                <AdminStat label="Saw the rings" value={data.funnel.usersSawRing.toLocaleString()} hint="people" />
                <AdminStat label="Opened a story" value={data.funnel.usersOpened.toLocaleString()} hint="people" />
                <AdminStat label="Engaged opens" value={`${data.funnel.engagedRate}%`} hint={`${data.funnel.engagedSessions} of ${data.funnel.sessions} opens`} emphasis="positive" />
                <AdminStat label="Reached the end" value={`${data.funnel.completeRate}%`} hint={`${data.funnel.framesPerSession} slides per open`} />
              </AdminStatGrid>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Story type</th>
                      <th className="py-2 pr-3 text-right font-medium">Opens</th>
                      <th className="py-2 pr-3 text-right font-medium">Engaged</th>
                      <th className="py-2 pr-3 text-right font-medium">Completed</th>
                      <th className="py-2 text-right font-medium">Slides / open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.funnel.byKind).map(([kind, k]) => (
                      <tr key={kind} className="border-b border-border/60 last:border-0">
                        <td className="py-2.5 pr-3 font-medium capitalize text-foreground">{kind}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{k.sessions}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{k.sessions ? Math.round((k.engaged / k.sessions) * 100) : 0}%</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{k.sessions ? Math.round((k.complete / k.sessions) * 100) : 0}%</td>
                        <td className="py-2.5 text-right tabular-nums">{k.sessions ? (k.frames / k.sessions).toFixed(1) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Monday pop-up: {data.funnel.events.popup_shown ?? 0} shown, {data.funnel.events.popup_view ?? 0} viewed,{" "}
                {data.funnel.events.popup_dismiss ?? 0} dismissed.
              </p>
            </AdminSection>
          </>
        ) : null}
      </div>
    </AdminShell>
  )
}
