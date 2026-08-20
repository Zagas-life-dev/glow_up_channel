"use client"

import { useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { RiLineChartLine, RiTableLine } from "react-icons/ri"
import { AdminCard } from "@/components/admin/ui"
import { cn } from "@/lib/utils"

/**
 * Daily active users and visitors over time.
 *
 * Both series are counts of people, so they share one axis — a second y-scale would invent a
 * correlation that is not in the data. Series colours were validated with the dataviz palette
 * checker against the light page, the light card, and the dark page surfaces: every check
 * (lightness band, chroma floor, CVD separation, normal-vision floor, contrast) passes in both
 * modes, so the same pair is used throughout rather than flipped per theme.
 */

export interface ActivityPoint {
  date: string
  activeUsers: number
  visitors: number
}

/** Fixed slot order — colour follows the series, never its current rank. */
const SERIES = [
  { key: "visitors" as const, label: "Visitors", color: "#3b82f6" },
  { key: "activeUsers" as const, label: "Active users", color: "#d95f00" },
]

function formatDay(date: string) {
  const d = new Date(`${date}T00:00:00Z`)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="mb-1.5 text-xs font-medium text-foreground">{formatDay(label)}</p>
      <div className="space-y-1">
        {SERIES.map((series) => {
          const row = payload.find((p: any) => p.dataKey === series.key)
          if (!row) return null
          return (
            <div key={series.key} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: series.color }} />
              <span className="text-muted-foreground">{series.label}</span>
              <span className="ml-auto font-medium tabular-nums text-foreground">
                {row.value?.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ActivityChart({
  data,
  title = "Activity over time",
  description,
  loading = false,
}: {
  data: ActivityPoint[]
  title?: string
  description?: string
  loading?: boolean
}) {
  const [view, setView] = useState<"chart" | "table">("chart")

  const latest = data.length ? data[data.length - 1] : null
  // Thin the x-axis so labels never collide on a 90- or 365-day window.
  const tickInterval = data.length > 60 ? Math.floor(data.length / 8) : data.length > 21 ? 6 : 2

  return (
    <AdminCard>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setView("chart")}
            aria-pressed={view === "chart"}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
              view === "chart" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <RiLineChartLine className="h-3.5 w-3.5" />
            Chart
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
              view === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <RiTableLine className="h-3.5 w-3.5" />
            Table
          </button>
        </div>
      </div>

      {/* Legend is always present for two series, so identity is never colour-alone. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 pt-4 sm:px-5">
        {SERIES.map((series) => (
          <div key={series.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: series.color }} />
            <span className="text-xs text-muted-foreground">{series.label}</span>
            {latest ? (
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {latest[series.key].toLocaleString()}
              </span>
            ) : null}
          </div>
        ))}
        {latest ? <span className="text-xs text-muted-foreground">on {formatDay(latest.date)}</span> : null}
      </div>

      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="h-[288px] animate-pulse rounded-lg bg-muted/60" />
        ) : data.length === 0 ? (
          <div className="flex h-[288px] items-center justify-center text-sm text-muted-foreground">
            No activity recorded yet.
          </div>
        ) : view === "table" ? (
          <div className="max-h-[288px] overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                <tr className="text-left">
                  <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Visitors</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Active users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...data].reverse().map((row) => (
                  <tr key={row.date}>
                    <td className="px-3 py-1.5 text-xs text-foreground">{formatDay(row.date)}</td>
                    <td className="px-3 py-1.5 text-right text-xs tabular-nums text-foreground">
                      {row.visitors.toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-right text-xs tabular-nums text-foreground">
                      {row.activeUsers.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Height covers plot + x-axis band, so the card never grows a nested scrollbar.
          <ResponsiveContainer width="100%" height={288}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid
                vertical={false}
                stroke="hsl(var(--border))"
                strokeWidth={1}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDay}
                interval={tickInterval}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                dy={4}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={48}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeOpacity: 0.4 }}
              />
              {SERIES.map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </AdminCard>
  )
}
