"use client"

/**
 * The digest A/B test results in plain words, for the admin page.
 *
 * Reads top to bottom: the verdict so far, the one number that decides it
 * (tracker adds per 100 people per week, A against B), whether group A actually
 * saw the digest, then week by week. Takes digestExperimentService.results().
 */

import { AdminCard, AdminEmpty, AdminSection } from "@/components/admin/ui"
import { cn } from "@/lib/utils"
import type { DigestResults, DigestWeekResult } from "@/lib/digest/api"

const A_COLOUR = "#d95f00"
const B_COLOUR = "#64748b"
const A_NAME = "Got the digest"
const B_NAME = "No digest"
export const DIGEST_GROUP_NAMES = { A: A_NAME, B: B_NAME }

/** Below this many tracker adds across both groups, any gap is mostly chance. */
const MIN_ADDS = 100
/** A gap smaller than this (either way) counts as no real difference. */
const MIN_LIFT = 10

export const fmtDay = (day: string, plusDays = 0) => {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + plusDays)
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}

/** Per-user rates read badly (0.016); per 100 people reads as a count (1.6). */
const per100 = (perUser: number) => Math.round(perUser * 1000) / 10

type Tone = "neutral" | "positive" | "danger"

function verdict(data: DigestResults): {
  tone: Tone
  headline: string
  detail: string
} {
  const weeks = data.byWeek ?? []
  const done = weeks.filter((w) => !w.partial).length
  const adds = weeks.reduce((s, w) => s + w.trackerAdds.A + w.trackerAdds.B, 0)
  const lift = data.overall?.liftPct ?? null
  const final = done === data.weeks.length

  if (weeks.length === 0) {
    return {
      tone: "neutral",
      headline: "Not started yet",
      detail: `The test starts on Monday ${fmtDay(data.weeks[0])}.`,
    }
  }
  if (!final && (adds < MIN_ADDS || done < 2)) {
    return {
      tone: "neutral",
      headline: "Too early to tell",
      detail: `Only ${adds} tracker ${adds === 1 ? "add" : "adds"} so far across both groups${
        done === 0 ? " and no full week yet" : done === 1 ? " and one full week" : ""
      }. A gap this small can be chance. Check back after ${fmtDay(data.weeks[1], 6)}.`,
    }
  }
  const prefix = final ? "Final result: " : "So far: "
  if (lift === null) {
    return {
      tone: "neutral",
      headline: `${prefix}no comparison yet`,
      detail: "The no-digest group has no tracker adds to compare against.",
    }
  }
  if (lift >= MIN_LIFT) {
    return {
      tone: "positive",
      headline: `${prefix}the digest is helping`,
      detail: `People who got the digest added ${lift}% more items to their tracker than people who didn't.`,
    }
  }
  if (lift <= -MIN_LIFT) {
    return {
      tone: "danger",
      headline: `${prefix}the digest is not helping`,
      detail: `People who got the digest added ${Math.abs(lift)}% fewer items to their tracker than people who didn't.`,
    }
  }
  return {
    tone: "neutral",
    headline: `${prefix}no real difference`,
    detail: `The two groups add to their tracker at about the same rate (${lift > 0 ? "+" : ""}${lift}%).`,
  }
}

const TONE_CLASS: Record<Tone, string> = {
  neutral: "border-border bg-muted/40",
  positive: "border-emerald-500/30 bg-emerald-500/10",
  danger: "border-red-500/30 bg-red-500/10",
}

function BigNumber({ name, colour, value, users }: { name: string; colour: string; value: number; users: number }) {
  return (
    <div className="flex-1 rounded-xl border border-border p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: colour }} />
        {name}
      </p>
      <p className="mt-2 text-4xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">tracker adds per 100 people, per week · {users} people</p>
    </div>
  )
}

/** "<1%" rather than a misleading 0% when a few people did it. */
const share = (n: number, of: number) => (n > 0 && n / of < 0.01 ? "<1%" : `${Math.round((n / of) * 100)}%`)

/** Group A's digest, as "X of 500 did this" steps. */
function SeenSteps({ w, groupA, pushOn }: { w: DigestWeekResult; groupA: number; pushOn: number }) {
  const f = w.funnel
  const steps: [string, number, number][] = [
    ["got the Monday push", f.pushSent, groupA],
    ["opened the push", f.pushOpened, Math.max(f.pushSent, 1)],
    ["saw the digest popup", f.shown, groupA],
    ["tapped an item in it", f.clicked, Math.max(f.shown, 1)],
    ['pressed "Track all"', f.trackedAll, Math.max(f.shown, 1)],
    ['pressed "Save digest"', f.saved, Math.max(f.shown, 1)],
  ]
  return (
    <div className="space-y-3">
      {steps.map(([label, n, of]) => (
        <div key={label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-foreground">
              <span className="font-semibold tabular-nums">{n.toLocaleString()}</span> {label}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">{share(n, of)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (n / of) * 100)}%`,
                background: A_COLOUR,
              }}
            />
          </div>
        </div>
      ))}
      <p className="pt-1 text-xs text-muted-foreground">
        Only {pushOn} of {groupA} people in this group have push turned on, so most will only see the digest when they next open
        the app. Percentages for the push are out of pushes sent; for the buttons, out of people who saw the popup.
      </p>
    </div>
  )
}

export function DigestResultsView({ data }: { data: DigestResults }) {
  const g = data.groups
  const overall = data.overall
  const weeks = data.byWeek ?? []
  const latest = weeks[weeks.length - 1]
  const v = verdict(data)
  if (!g || !overall) return null

  return (
    <>
      <AdminCard className={cn("p-5", TONE_CLASS[v.tone])}>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Week {weeks.length} of {data.weeks.length}
          {latest?.partial ? " (in progress)" : ""} · ends {fmtDay(data.weeks[data.weeks.length - 1], 6)}
        </p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{v.headline}</p>
        <p className="mt-1 text-sm text-muted-foreground">{v.detail}</p>
      </AdminCard>

      <AdminSection
        title="The number that decides it"
        description="How many items people add to their tracker. Higher means more people are planning to apply."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <BigNumber name={A_NAME} colour={A_COLOUR} value={per100(overall.trackerAddsPerUserWeek.A)} users={g.A.users} />
          <BigNumber name={B_NAME} colour={B_COLOUR} value={per100(overall.trackerAddsPerUserWeek.B)} users={g.B.users} />
        </div>
      </AdminSection>

      {latest ? (
        <AdminSection
          title={`Did people see the digest? (week of ${fmtDay(latest.week)})`}
          description={`Out of the ${g.A.users} people who get it.`}
        >
          <SeenSteps w={latest} groupA={g.A.users} pushOn={g.A.pushOn} />
        </AdminSection>
      ) : (
        <AdminEmpty title="No test weeks yet" description={`Results start on Monday ${fmtDay(data.weeks[0])}.`} />
      )}

      {weeks.length > 0 ? (
        <AdminSection title="Week by week" description="Tracker adds per 100 people. Weeks run Monday to Sunday, Lagos time.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Week of</th>
                  <th className="py-2 pr-4 font-medium">{A_NAME}</th>
                  <th className="py-2 pr-4 font-medium">{B_NAME}</th>
                  <th className="py-2 pr-4 font-medium">From the “Track all” button</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.week} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-4 text-foreground">
                      {fmtDay(w.week)}
                      {w.partial ? <span className="text-xs text-muted-foreground"> · in progress</span> : null}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-foreground">
                      {per100(w.trackerAddsPerUser.A)}{" "}
                      <span className="text-xs text-muted-foreground">({w.trackerAdds.A} adds)</span>
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-foreground">
                      {per100(w.trackerAddsPerUser.B)}{" "}
                      <span className="text-xs text-muted-foreground">({w.trackerAdds.B} adds)</span>
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-foreground">{w.trackerAddsFromDigest}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-muted-foreground">Other numbers</summary>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {weeks.map((w) => (
                <li key={w.week}>
                  Week of {fmtDay(w.week)}: used the app {w.activeRate.A}% vs {w.activeRate.B}% · saves per 100 people{" "}
                  {per100(w.savesPerUser.A)} vs {per100(w.savesPerUser.B)} · {w.funnel.itemClicks} item taps in the digest
                </li>
              ))}
            </ul>
          </details>
        </AdminSection>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Groups were fixed on assignment and don&apos;t change. Both groups still get the usual Sunday email, so it doesn&apos;t
        affect the comparison.
      </p>
    </>
  )
}
