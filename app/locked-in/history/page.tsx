"use client"

import { useEffect, useState } from "react"
import AuthGuard from "@/components/auth-guard"
import ApiClient from "@/lib/api-client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}h ${m}m ${s}s`
  }
  if (m > 0) {
    return `${m}m ${s}s`
  }
  return `${s}s`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  try {
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  } catch {
    return `${d.toLocaleDateString(undefined, { dateStyle: "medium" })} ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
  }
}

interface Session {
  _id: string
  durationSeconds: number
  startedAt: string
  endedAt: string
  endReason?: string
  intention?: string | null
  todoList?: { id: string; text: string; done: boolean }[]
}

function LockedInHistoryContent() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selected, setSelected] = useState<Session | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ApiClient.getLockedInSessions({ page, limit: 20 })
      .then((data) => {
        if (!cancelled) {
          setSessions(Array.isArray(data?.sessions) ? data.sessions : [])
          setTotal(typeof data?.total === "number" ? data.total : 0)
          setTotalPages(typeof data?.totalPages === "number" ? data.totalPages : 0)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSessions([])
          setError(err?.message ?? "Failed to load session history")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [page, refreshKey])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Locked In history</h1>
          <Link href="/locked-in">
            <Button variant="outline" size="sm">Back to timer</Button>
          </Link>
        </div>
        {loading ? (
          <div className="text-muted-foreground text-center py-12">Loading sessions…</div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            <p>{error}</p>
            <Button variant="outline" className="mt-3" onClick={() => setRefreshKey((k) => k + 1)}>Retry</Button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No sessions yet.</p>
            <Link href="/locked-in" className="text-primary underline mt-2 inline-block">Start your first session</Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {sessions.map((s) => (
                <li
                  key={s._id}
                  className="flex items-center justify-between rounded-lg border bg-card p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{formatDuration(s.durationSeconds)}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(s.endedAt)}</p>
                    {s.intention && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        <span className="font-semibold">Intention:</span> {s.intention}
                      </p>
                    )}
                    {Array.isArray(s.todoList) && s.todoList.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">Todos:</span>{" "}
                        {s.todoList.filter((t) => t.done).length}/{s.todoList.length} done
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {s.endReason === "tab_closed" && (
                      <span className="text-xs text-muted-foreground">Tab closed</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelected(s)}
                    >
                      View
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center px-2 text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Session details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Locked in for{" "}
                <span className="font-semibold text-foreground">
                  {formatDuration(selected.durationSeconds)}
                </span>{" "}
                (ended {formatDate(selected.endedAt)}).
              </p>
              {selected.intention && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Intention
                  </p>
                  <p className="mt-1 rounded-lg bg-muted px-3 py-2 text-sm">
                    {selected.intention}
                  </p>
                </div>
              )}
              {Array.isArray(selected.todoList) && selected.todoList.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    To-do summary
                  </p>
                  <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {selected.todoList.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-2 rounded bg-muted px-3 py-2 text-sm"
                      >
                        <span className={t.done ? "line-through text-muted-foreground" : ""}>
                          {t.text}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {t.done ? "Done" : "Pending"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground text-center">
                    Completed{" "}
                    <span className="font-semibold text-foreground">
                      {selected.todoList.filter((t) => t.done).length}
                    </span>{" "}
                    of {selected.todoList.length} to-dos.
                  </p>
                </div>
              )}
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function LockedInHistoryPage() {
  return (
    <AuthGuard>
      <LockedInHistoryContent />
    </AuthGuard>
  )
}
