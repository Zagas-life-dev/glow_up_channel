"use client"

/**
 * Admin — Creators Program. Fraud review (spike and ring flags pause crediting until
 * someone looks), and the members list with balances by state. Clearing a flag resumes
 * crediting; confirming fraud reverses that playlist's unpaid credits. Removing a
 * creator withholds everything unpaid. Both are super-admin actions on the server.
 */

import { useCallback, useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { RiShieldCheckLine, RiAlarmWarningLine, RiTrophyLine } from "react-icons/ri"
import { toast } from "sonner"
import { AdminShell } from "@/components/admin/admin-shell"
import { AdminCard, AdminEmpty, AdminSkeletonRows, AdminStat, AdminStatGrid, AdminTabs, StatusPill } from "@/components/admin/ui"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { getProgramOverview, naira, removeFromProgram, resolveProgramFlag, type ProgramOverview } from "@/lib/creator"

type Tab = "flags" | "members"

export default function AdminCreatorsProgramPage() {
  const { user } = useAuth()
  const isSuper = (user as { role?: string } | null)?.role === "super_admin"
  const [data, setData] = useState<ProgramOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("flags")
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getProgramOverview())
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const act = async (id: string, fn: () => Promise<string>) => {
    setBusy(id)
    try {
      toast.success(await fn())
      await load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const counts = data?.counts || {}
  return (
    <AdminShell description="Fraud review and members of the Creators Program." onRefresh={load} refreshing={loading} width="wide">
      <div className="space-y-5">
        <AdminStatGrid className="lg:grid-cols-4">
          <AdminStat label="Open flags" value={data?.flags.length ?? 0} icon={RiAlarmWarningLine} emphasis={data?.flags.length ? "attention" : "none"} />
          <AdminStat label="Members" value={counts.member || 0} icon={RiTrophyLine} />
          <AdminStat label="Invited" value={counts.invited || 0} hint="Not joined yet" />
          <AdminStat label="Removed" value={counts.removed || 0} />
        </AdminStatGrid>

        <AdminTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "flags", label: "Fraud review", count: data?.flags.length },
            { value: "members", label: "Members", count: data?.members.length },
          ]}
        />
        {!isSuper ? <p className="text-[13px] text-muted-foreground">Decisions that move money are for super admins.</p> : null}

        {loading && !data ? (
          <AdminSkeletonRows rows={4} />
        ) : tab === "flags" ? (
          !data?.flags.length ? (
            <AdminEmpty icon={RiShieldCheckLine} title="Nothing to review" description="Spike and ring flags show up here and pause crediting until reviewed." />
          ) : (
            <div className="space-y-3">
              {data.flags.map((f) => (
                <AdminCard key={f._id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={f.kind || "spike"} />
                    <span className="text-sm font-semibold text-foreground">{f.playlistName || f.user?.name || f.user?.email || "Unknown"}</span>
                    <span className="text-[12px] text-muted-foreground">{formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
                    {(f.reasons || []).slice(-3).map((r, i) => (
                      <li key={i}>{r.text}</li>
                    ))}
                  </ul>
                  {isSuper ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Note (kept with the decision)"
                        maxLength={500}
                        value={notes[f._id] || ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [f._id]: e.target.value }))}
                        className="h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm sm:w-auto sm:flex-1"
                      />
                      <Button type="button" className="h-10" disabled={busy === f._id} onClick={() => act(f._id, async () => {
                        await resolveProgramFlag(f._id, "cleared", notes[f._id] || "")
                        return "Cleared. Crediting resumes."
                      })}>
                        Looks real
                      </Button>
                      <Button type="button" variant="outline" className="h-10 text-destructive" disabled={busy === f._id} onClick={() => act(f._id, async () => {
                        const r = await resolveProgramFlag(f._id, "fraud", notes[f._id] || "Fake views confirmed")
                        return `Fraud confirmed. ${naira(r.reversed)} reversed.`
                      })}>
                        Fake views
                      </Button>
                    </div>
                  ) : null}
                </AdminCard>
              ))}
            </div>
          )
        ) : !data?.members.length ? (
          <AdminEmpty icon={RiTrophyLine} title="No creators invited yet" />
        ) : (
          <div className="space-y-2">
            {data.members.map((m) => (
              <AdminCard key={m._id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{m.user?.name || m.user?.email || m.userId}</span>
                  <StatusPill status={m.status} />
                </div>
                <p className="mt-1 text-[12px] tabular-nums text-muted-foreground">
                  Available {naira(m.balances.available)} · Pending {naira(m.balances.pending)} · Held {naira(m.balances.held)} · Paid {naira(m.balances.paid)}
                </p>
                {isSuper && m.status !== "removed" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 h-9 text-destructive"
                    disabled={busy === m.userId}
                    onClick={() => {
                      const reason = window.prompt("Reason for removing this creator? Unpaid earnings will be withheld.")
                      if (!reason?.trim()) return
                      void act(m.userId, async () => {
                        const r = await removeFromProgram(m.userId, reason.trim())
                        return `Removed. ${naira(r.withheld)} withheld.`
                      })
                    }}
                  >
                    Remove from program
                  </Button>
                ) : null}
              </AdminCard>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
