"use client"

/**
 * Admin: the Monday digest A/B test, A against B week by week.
 *
 * The deciding number is tracker adds per user per week. Group A also gets its
 * digest funnel (push → shown → clicked / saved / tracked all), split by
 * whether they had push on. Mirrors digestExperimentService.results().
 */

import { useCallback, useEffect, useState } from "react"
import { RiFlaskLine, RiListCheck2, RiUserFollowLine, RiArrowUpLine } from "react-icons/ri"
import { toast } from "sonner"

import { AdminShell } from "@/components/admin/admin-shell"
import { AnalyticsTabs } from "@/components/admin/analytics-tabs"
import { AdminEmpty, AdminSection, AdminSkeletonStats, AdminStat, AdminStatGrid } from "@/components/admin/ui"
import { Button } from "@/components/ui/button"
import { assignDigestGroups, fetchDigestResults, type DigestResults, type DigestWeekResult } from "@/lib/digest/api"

const fmtWeek = (week: string) =>
  new Date(`${week}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })

function Pair({ label, a, b, unit = "" }: { label: string; a: number; b: number; unit?: string }) {
  const max = Math.max(a, b, 0.0001)
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      {(
        [
          ["A", a, "#d95f00"],
          ["B", b, "#64748b"],
        ] as const
      ).map(([g, v, colour]) => (
        <div key={g} className="mb-1 flex items-center gap-2">
          <span className="w-4 text-xs font-semibold text-foreground">{g}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: colour }} />
          </div>
          <span className="w-14 text-right text-xs tabular-nums text-foreground">
            {v}
            {unit}
          </span>
        </div>
      ))}
    </div>
  )
}

function Funnel({ w, groupA }: { w: DigestWeekResult; groupA: number }) {
  const f = w.funnel
  const steps: [string, number][] = [
    ["Push sent", f.pushSent],
    ["Push opened", f.pushOpened],
    ["Saw digest", f.shown],
    ["Opened an item", f.clicked],
    ["Saved digest", f.saved],
    ["Tracked all", f.trackedAll],
  ]
  return (
    <div className="space-y-2">
      {steps.map(([label, n]) => (
        <div key={label} className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="tabular-nums text-foreground">
            {n.toLocaleString()} <span className="text-xs text-muted-foreground">· {groupA ? Math.round((n / groupA) * 100) : 0}% of A</span>
          </span>
        </div>
      ))}
      <p className="pt-2 text-xs text-muted-foreground">
        Engagement {f.engagementRate}% of those who saw it (opened, saved or tracked) · {f.itemClicks} item clicks · saw it with push on{" "}
        {f.shownPushOn}, push off {f.shownPushOff}
      </p>
    </div>
  )
}

export default function DigestTestPage() {
  const [data, setData] = useState<DigestResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await fetchDigestResults())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load results")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const assign = async () => {
    if (!window.confirm("Pick the 1,000 most active users and split them 500 / 500? Groups are frozen once made.")) return
    setAssigning(true)
    try {
      const r = await assignDigestGroups()
      if (r.assigned) toast.success(`Assigned ${r.count}: ${r.A} in A, ${r.B} in B`)
      else toast.message(r.reason === "already_assigned" ? "Groups already exist" : "No active users found")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign groups")
    } finally {
      setAssigning(false)
    }
  }

  const g = data?.groups
  const overall = data?.overall
  const lift = overall?.liftPct

  return (
    <AdminShell
      title="Digest A/B test"
      description="Group A gets the Monday digest popup and push; group B is the baseline. Win metric: tracker adds per user per week."
      onRefresh={load}
      refreshing={loading}
      width="wide"
    >
      <div className="space-y-5">
        <AnalyticsTabs />

        {loading && !data ? <AdminSkeletonStats /> : null}

        {data && !data.assigned ? (
          <AdminEmpty
            icon={RiFlaskLine}
            title="Groups not assigned yet"
            description={`Pick the 1,000 most active users (30-day score) and split them 500 / 500, balanced by country and activity. Do this before Monday ${fmtWeek(data.weeks[0])}.`}
            action={
              <Button onClick={assign} disabled={assigning}>
                {assigning ? "Assigning…" : "Assign groups"}
              </Button>
            }
          />
        ) : null}

        {data?.assigned && g && overall ? (
          <>
            <AdminStatGrid>
              <AdminStat
                label="Tracker adds / user / week — A"
                value={overall.trackerAddsPerUserWeek.A}
                hint={`${g.A.users} users · ${g.A.pushOn} with push`}
                icon={RiListCheck2}
              />
              <AdminStat
                label="Tracker adds / user / week — B"
                value={overall.trackerAddsPerUserWeek.B}
                hint={`${g.B.users} users · ${g.B.pushOn} with push`}
                icon={RiListCheck2}
              />
              <AdminStat
                label="Lift, A over B"
                value={lift === null || lift === undefined ? "—" : `${lift > 0 ? "+" : ""}${lift}%`}
                hint={lift === null ? "B has no tracker adds yet" : "On the win metric"}
                icon={RiArrowUpLine}
                emphasis={lift !== null && lift !== undefined && lift > 0 ? "positive" : "none"}
              />
              <AdminStat
                label="Weeks in"
                value={`${data.byWeek?.length ?? 0} / ${data.weeks.length}`}
                hint={`From ${fmtWeek(data.weeks[0])}`}
                icon={RiUserFollowLine}
              />
            </AdminStatGrid>

            {(data.byWeek ?? []).length === 0 ? (
              <AdminEmpty title="No test weeks yet" description={`Results start on Monday ${fmtWeek(data.weeks[0])}.`} />
            ) : null}

            {[...(data.byWeek ?? [])].reverse().map((w) => (
              <AdminSection
                key={w.week}
                title={`Week of ${fmtWeek(w.week)}${w.partial ? " (in progress)" : ""}`}
                description={`${w.trackerAddsFromDigest} tracker adds came straight from the digest's Track all.`}
              >
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <Pair label="Tracker adds per user (win metric)" a={w.trackerAddsPerUser.A} b={w.trackerAddsPerUser.B} />
                    <Pair label="Active this week" a={w.activeRate.A} b={w.activeRate.B} unit="%" />
                    <Pair label="Saves per user" a={w.savesPerUser.A} b={w.savesPerUser.B} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Group A digest funnel (users)</p>
                    <Funnel w={w} groupA={g.A.users} />
                  </div>
                </div>
              </AdminSection>
            ))}

            <p className="text-xs text-muted-foreground">
              Weeks run Monday to Sunday, Lagos time. Groups were fixed when assigned and do not change. The weekly email goes to
              both groups on Sunday as usual, so it does not affect the comparison.
            </p>
          </>
        ) : null}
      </div>
    </AdminShell>
  )
}
