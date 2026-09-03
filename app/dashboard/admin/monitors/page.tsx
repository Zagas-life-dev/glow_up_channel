"use client"

/**
 * Admin — monitors.
 *
 * Every account that watches listings, what each one holds, and the controls to
 * change it. Deliberately self-sufficient: the assignment panel is on this page
 * rather than only on the super-admin-gated user detail screen, so a plain admin
 * can do the whole job here.
 *
 * "Open their view" leads to the monitor portal scoped to that account — the
 * real portal, not a reconstruction, so what an admin checks is what the monitor
 * actually sees.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AdminShell } from "@/components/admin/admin-shell"
import { MonitorAssignmentsPanel } from "@/components/admin/monitor-assignments-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, Eye, Loader2, Search, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { fetchMonitors, type MonitorAccount } from "@/lib/analytics/monitor"
import { ROLES, roleLabel } from "@/lib/roles"

function relative(value: string | null): string {
  if (!value) return "Never"
  const then = new Date(value).getTime()
  if (!Number.isFinite(then)) return "Never"

  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days}d ago`
  return new Date(value).toLocaleDateString()
}

export default function AdminMonitorsPage() {
  const [monitors, setMonitors] = useState<MonitorAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchMonitors({ limit: 200 })
      setMonitors(result.monitors)
    } catch (err: any) {
      toast.error(err?.message || "Failed to load monitors")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return monitors
    return monitors.filter(
      (monitor) =>
        monitor.displayName.toLowerCase().includes(needle) ||
        monitor.email.toLowerCase().includes(needle),
    )
  }, [monitors, search])

  const selected = monitors.find((monitor) => monitor._id === selectedId) || null

  const watching = monitors.filter((monitor) => monitor.assignmentCount > 0).length
  const idle = monitors.length - watching

  return (
    <AdminShell
      title="Monitors"
      description="Read-only accounts and the listings each one watches."
      onRefresh={load}
      refreshing={loading}
      width="wide"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Monitors</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{monitors.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Watching</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{watching}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Nothing assigned
              </p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{idle}</p>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search monitors"
            className="pl-9"
          />
        </div>

        {loading && monitors.length === 0 ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading monitors
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Eye className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium text-foreground">
                {search.trim() ? "No monitors match that." : "No monitor accounts yet."}
              </p>
              {!search.trim() ? (
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Change an existing account&apos;s role to Monitor from its user page, then assign
                  listings to it here.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {visible.map((monitor) => {
                  const isSelected = monitor._id === selectedId
                  return (
                    <li key={monitor._id}>
                      <div
                        className={`flex flex-wrap items-center gap-3 px-4 py-3 transition-colors ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedId(isSelected ? null : monitor._id)}
                          className="min-w-0 flex-1 text-left"
                          aria-expanded={isSelected}
                        >
                          <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                            {monitor.displayName}
                            {monitor.role !== ROLES.MONITOR ? (
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <ShieldCheck className="h-3 w-3" aria-hidden />
                                {roleLabel(monitor.role)}
                              </Badge>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{monitor.email}</p>
                        </button>

                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums text-foreground">
                            {monitor.assignmentCount}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {relative(monitor.lastAssignedAt)}
                          </p>
                        </div>

                        <Button asChild variant="outline" size="sm" className="shrink-0">
                          <Link href={`/dashboard/monitor?monitorId=${monitor._id}`}>
                            Open their view
                            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </Button>

                        <Button
                          variant={isSelected ? "default" : "ghost"}
                          size="sm"
                          className="shrink-0"
                          onClick={() => setSelectedId(isSelected ? null : monitor._id)}
                        >
                          {isSelected ? "Done" : "Assign"}
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {selected ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Managing assignments for <span className="font-medium text-foreground">{selected.displayName}</span>
            </p>
            {/* Keyed on the id so switching monitors remounts the panel rather
                than showing the previous account's assignments while it loads. */}
            <MonitorAssignmentsPanel key={selected._id} monitorId={selected._id} onChange={load} />
          </div>
        ) : null}
      </div>
    </AdminShell>
  )
}
