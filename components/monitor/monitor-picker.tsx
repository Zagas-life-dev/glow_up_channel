"use client"

/**
 * Admin control: whose monitor view am I looking at?
 *
 * An admin opening the monitor portal sees their own assignments by default and
 * can switch to any monitor account. The point is to answer "what does this
 * person actually see?" without borrowing their login — so the switch drives the
 * same endpoints the monitor's own session would hit, rather than a separate
 * admin rendering that could drift from the real thing.
 *
 * The choice lives in the URL so it survives moving between the portal's tabs
 * and can be handed to someone else as a link.
 */

import { useEffect, useState } from "react"
import { Eye, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchMonitors, type MonitorAccount } from "@/lib/analytics/monitor"

/** The sentinel for "my own assignments" — Radix Select rejects an empty value. */
export const SELF = "self"

export function MonitorPicker({
  value,
  onChange,
}: {
  /** Selected monitor id, or SELF. */
  value: string
  onChange: (value: string) => void
}) {
  const [monitors, setMonitors] = useState<MonitorAccount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const result = await fetchMonitors({ limit: 200 })
        if (!cancelled) setMonitors(result.monitors)
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message || "Failed to load monitors")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[11px] uppercase tracking-[0.1em] text-muted-foreground sm:inline">
        Viewing as
      </span>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className="h-9 w-[200px] rounded-xl text-sm">
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading
            </span>
          ) : (
            <SelectValue placeholder="Myself" />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SELF}>Myself</SelectItem>
          {monitors.map((monitor) => (
            <SelectItem key={monitor._id} value={monitor._id}>
              <span className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {monitor.displayName}
                <span className="text-muted-foreground">({monitor.assignmentCount})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
