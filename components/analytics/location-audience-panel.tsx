"use client"

/**
 * Where a listing's audience is — views, clicks and applications by country,
 * state and city.
 *
 * One component for providers and monitors: the backend decides the scope from
 * the caller's role (a provider's own listings, a monitor's assignments), so
 * nothing here can widen it. Pass `listing` to narrow to one listing, or
 * `providerId` (admins only) to one provider.
 *
 * Places with fewer than `minCell` people arrive already folded into "Other" —
 * the page only labels them.
 */

import * as React from "react"
import { MapPin } from "lucide-react"

import { Panel, SegmentedTabs } from "@/components/provider/provider-ui"
import {
  fetchAudienceByLocation,
  type AudienceByLocation,
  type PlaceRow,
} from "@/lib/analytics/location-analytics"
import { useLocale } from "@/lib/i18n/context"

type Level = "countries" | "states" | "cities"
type Range = "7" | "30" | "90"

const METRICS = ["views", "clicks", "applications"] as const

export function PlaceTable({
  rows,
  metrics,
  labels,
  otherLabel,
  otherPlacesLabel,
}: {
  rows: PlaceRow[]
  metrics: readonly string[]
  labels: Record<string, string>
  otherLabel: string
  otherPlacesLabel: (count: number) => string
}) {
  const max = Math.max(1, ...rows.map((row) => row.total))
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-up-hairline text-left text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            <th className="py-2 pr-3 font-medium">{labels.place}</th>
            {metrics.map((metric) => (
              <th key={metric} className="py-2 pr-3 text-right font-medium">{labels[metric]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOther = row.key === "other"
            return (
              <tr key={row.key} className="border-b border-up-hairline last:border-0">
                <td className="py-2.5 pr-3">
                  <div className="font-medium text-foreground">
                    {isOther ? otherLabel : row.name}
                    {!isOther && row.name !== row.country && row.country ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">{row.country}</span>
                    ) : null}
                  </div>
                  {isOther && row.places ? (
                    <div className="text-xs text-muted-foreground">{otherPlacesLabel(row.places)}</div>
                  ) : (
                    <div className="mt-1 h-1.5 rounded-full bg-up-fill">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${Math.max(3, (row.total / max) * 100)}%` }}
                      />
                    </div>
                  )}
                </td>
                {metrics.map((metric) => (
                  <td key={metric} className="py-2.5 pr-3 text-right tabular-nums text-foreground">
                    {Number(row[metric] ?? 0).toLocaleString()}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function LocationAudiencePanel({
  listing,
  providerId,
  monitorId,
  className,
}: {
  listing?: { contentType: string; contentId: string }
  /** Admin only: one provider's listings. */
  providerId?: string
  /** Admin only: one monitor's assigned listings. */
  monitorId?: string
  className?: string
}) {
  const { t } = useLocale()
  const [range, setRange] = React.useState<Range>("30")
  const [level, setLevel] = React.useState<Level>("countries")
  const [data, setData] = React.useState<AudienceByLocation | null>(null)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    setError(false)
    fetchAudienceByLocation({
      days: Number(range),
      contentType: listing?.contentType,
      contentId: listing?.contentId,
      providerId,
      monitorId,
    })
      .then((result) => !cancelled && setData(result))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [range, listing?.contentType, listing?.contentId, providerId, monitorId])

  const rows = data ? data[level] : []
  const labels = {
    place: t("locationAnalytics.place"),
    views: t("locationAnalytics.views"),
    clicks: t("locationAnalytics.clicks"),
    applications: t("locationAnalytics.applications"),
  }

  return (
    <Panel
      icon={MapPin}
      title={t("locationAnalytics.title")}
      subtitle={t("locationAnalytics.subtitle", { days: range })}
      action={
        <SegmentedTabs
          items={[
            { id: "7" as Range, label: t("locationAnalytics.range7") },
            { id: "30" as Range, label: t("locationAnalytics.range30") },
            { id: "90" as Range, label: t("locationAnalytics.range90") },
          ]}
          value={range}
          onChange={setRange}
        />
      }
      bodyClassName="space-y-3"
      className={className}
    >
      <SegmentedTabs
        items={[
          { id: "countries" as Level, label: t("locationAnalytics.countries") },
          { id: "states" as Level, label: t("locationAnalytics.states") },
          { id: "cities" as Level, label: t("locationAnalytics.cities") },
        ]}
        value={level}
        onChange={setLevel}
      />

      {error ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("locationAnalytics.loadError")}</p>
      ) : !data ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("locationAnalytics.noData")}</p>
      ) : (
        <PlaceTable
          rows={rows}
          metrics={METRICS}
          labels={labels}
          otherLabel={t("locationAnalytics.other")}
          otherPlacesLabel={(count) => t("locationAnalytics.otherPlaces", { count })}
        />
      )}

      {data ? (
        <p className="text-xs text-muted-foreground">{t("locationAnalytics.privacyNote", { count: data.minCell })}</p>
      ) : null}
    </Panel>
  )
}

export default LocationAudiencePanel
