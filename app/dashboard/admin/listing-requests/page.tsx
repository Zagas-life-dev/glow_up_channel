"use client"

/**
 * Admin — listing requests from creators (Creators Program spec). The team reviews
 * each link in-house, adds it through the usual upload tools if it belongs on UP,
 * and approves or rejects here. The creator is notified either way (inbox + push),
 * with the optional note as the message.
 */

import { useCallback, useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { RiLinkM, RiCheckLine, RiCloseLine, RiInboxLine } from "react-icons/ri"
import { toast } from "sonner"
import { AdminShell } from "@/components/admin/admin-shell"
import { AdminCard, AdminEmpty, AdminSkeletonRows, AdminTabs } from "@/components/admin/ui"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getListingRequestQueue, reviewListingRequest, type ListingRequest } from "@/lib/creator"

type Status = ListingRequest["status"]

export default function AdminListingRequestsPage() {
  const [status, setStatus] = useState<Status>("pending")
  const [rows, setRows] = useState<ListingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows((await getListingRequestQueue(status)).requests)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  const decide = async (id: string, decision: "approved" | "rejected") => {
    setBusy(id)
    try {
      await reviewListingRequest(id, decision, notes[id])
      toast.success(decision === "approved" ? "Approved. The creator has been told." : "Rejected. The creator has been told.")
      setRows((list) => list.filter((r) => r._id !== id))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <AdminShell description="Links creators asked UP to add. Add the listing with the usual tools, then approve or reject." onRefresh={load} refreshing={loading}>
      <div className="space-y-5">
        <AdminTabs
          value={status}
          onChange={setStatus}
          options={[
            { value: "pending", label: "Waiting" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
        {loading && rows.length === 0 ? (
          <AdminSkeletonRows rows={4} />
        ) : rows.length === 0 ? (
          <AdminEmpty icon={RiInboxLine} title={status === "pending" ? "No requests waiting" : "Nothing here"} />
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <AdminCard key={r._id} className={cn("p-4", busy === r._id && "opacity-60")}>
                <div className="flex flex-wrap items-center gap-2">
                  <RiLinkM className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground underline">
                    {r.url}
                  </a>
                  <span className="text-[12px] text-muted-foreground">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  From {r.creator?.name || "a creator"}
                  {r.creator?.email ? ` · ${r.creator.email}` : ""}
                </p>
                {r.details ? <p className="mt-2 whitespace-pre-line text-sm text-foreground">{r.details}</p> : null}
                {r.note && status !== "pending" ? <p className="mt-2 text-[13px] text-muted-foreground">Note sent: {r.note}</p> : null}
                {status === "pending" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Note to the creator (optional)"
                      maxLength={500}
                      value={notes[r._id] || ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [r._id]: e.target.value }))}
                      className="h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm sm:w-auto sm:flex-1"
                    />
                    <Button type="button" disabled={busy === r._id} onClick={() => decide(r._id, "approved")} className="h-10">
                      <RiCheckLine className="mr-1.5 h-4 w-4" /> Approve
                    </Button>
                    <Button type="button" variant="outline" disabled={busy === r._id} onClick={() => decide(r._id, "rejected")} className="h-10">
                      <RiCloseLine className="mr-1.5 h-4 w-4" /> Reject
                    </Button>
                  </div>
                ) : null}
              </AdminCard>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
