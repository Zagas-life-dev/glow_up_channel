"use client"

/**
 * Admin — weekly Creators Program payouts (super admins). Each request shows the
 * creator, amount, tax, net, and the bank details to pay into, with the Paystack check
 * status. The team pays by bank transfer, then marks it paid (the creator gets a
 * notification and email) or not paid (the money returns to their available balance).
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { RiFileCopyLine, RiWallet3Line, RiShieldCheckLine, RiErrorWarningLine } from "react-icons/ri"
import { toast } from "sonner"
import { AdminShell } from "@/components/admin/admin-shell"
import { AdminCard, AdminEmpty, AdminSkeletonRows, AdminStat, AdminStatGrid, AdminTabs } from "@/components/admin/ui"
import { Button } from "@/components/ui/button"
import { getAdminPayouts, markAdminPayout, naira, type AdminPayout, type Payout } from "@/lib/creator"

export default function AdminPayoutsPage() {
  const [status, setStatus] = useState<Payout["status"]>("requested")
  const [rows, setRows] = useState<AdminPayout[]>([])
  const [week, setWeek] = useState("")
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await getAdminPayouts(status)
      setRows(d.payouts)
      setWeek(d.week)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [status])
  useEffect(() => {
    void load()
  }, [load])

  const totals = useMemo(() => ({
    net: rows.reduce((n, r) => n + r.netAmount, 0),
    tax: rows.reduce((n, r) => n + r.taxAmount, 0),
  }), [rows])

  const copy = async (text: string | null) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied")
    } catch {
      toast.message(text)
    }
  }

  const mark = async (id: string, next: "paid" | "rejected") => {
    setBusy(id)
    try {
      await markAdminPayout(id, next, notes[id])
      toast.success(next === "paid" ? "Marked paid. The creator has been told." : "Marked not paid. The money is back in their balance.")
      setRows((list) => list.filter((r) => r._id !== id))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <AdminShell
      description={`Creators Program cash-outs. This week is ${week || "…"}. Pay by bank transfer, then mark each one.`}
      onRefresh={load}
      refreshing={loading}
      requireSuperAdmin
      width="wide"
    >
      <div className="space-y-5">
        <AdminStatGrid className="lg:grid-cols-3">
          <AdminStat label={status === "requested" ? "To pay" : status === "paid" ? "Paid" : "Not paid"} value={rows.length} icon={RiWallet3Line} emphasis={status === "requested" && rows.length ? "attention" : "none"} />
          <AdminStat label="Net total" value={naira(totals.net)} />
          <AdminStat label="Tax withheld" value={naira(totals.tax)} />
        </AdminStatGrid>

        <AdminTabs
          value={status}
          onChange={setStatus}
          options={[
            { value: "requested", label: "To pay" },
            { value: "paid", label: "Paid" },
            { value: "rejected", label: "Not paid" },
          ]}
        />

        {loading && rows.length === 0 ? (
          <AdminSkeletonRows rows={4} />
        ) : rows.length === 0 ? (
          <AdminEmpty icon={RiWallet3Line} title={status === "requested" ? "Nothing to pay" : "Nothing here"} />
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <AdminCard key={r._id} className="p-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-xl font-bold tabular-nums text-foreground">{naira(r.netAmount)}</span>
                  {r.taxAmount ? <span className="text-[12px] text-muted-foreground">({naira(r.amount)} less {naira(r.taxAmount)} tax)</span> : null}
                  <span className="ml-auto text-[12px] text-muted-foreground">{r.week} · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
                </div>
                <p className="mt-1 text-sm text-foreground">{r.creator.name || "Creator"} <span className="text-muted-foreground">· {r.creator.email}</span></p>
                <div className="mt-3 grid gap-1 rounded-lg bg-up-fill p-3 text-sm sm:grid-cols-2">
                  <span className="text-muted-foreground">Account name</span>
                  <span className="font-medium text-foreground">{r.bank.accountName}</span>
                  <span className="text-muted-foreground">Bank</span>
                  <span className="font-medium text-foreground">{r.bank.bankName} ({r.bank.bankCode})</span>
                  <span className="text-muted-foreground">Account number</span>
                  <button type="button" onClick={() => copy(r.bank.accountNumber)} className="inline-flex items-center gap-1 text-left font-mono font-medium text-foreground hover:underline">
                    {r.bank.accountNumber || "unavailable"}
                    <RiFileCopyLine className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  </button>
                  {r.bank.tin ? (
                    <>
                      <span className="text-muted-foreground">TIN</span>
                      <span className="font-mono text-foreground">{r.bank.tin}</span>
                    </>
                  ) : null}
                  <span className="text-muted-foreground">Name check</span>
                  <span className="inline-flex items-center gap-1 text-foreground">
                    {r.bank.paystackVerified ? <RiShieldCheckLine className="h-4 w-4 text-up-lime-ink" aria-hidden /> : <RiErrorWarningLine className="h-4 w-4 text-up-orange" aria-hidden />}
                    {r.bank.paystackVerified ? "Matched with Paystack" : "Not checked: confirm the name before paying"}
                  </span>
                </div>
                {r.note && status !== "requested" ? <p className="mt-2 text-[13px] text-muted-foreground">Note: {r.note}</p> : null}
                {status === "requested" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Transfer reference or reason"
                      maxLength={500}
                      value={notes[r._id] || ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [r._id]: e.target.value }))}
                      className="h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm sm:w-auto sm:flex-1"
                    />
                    <Button type="button" className="h-10" disabled={busy === r._id} onClick={() => mark(r._id, "paid")}>
                      Mark paid
                    </Button>
                    <Button type="button" variant="outline" className="h-10" disabled={busy === r._id} onClick={() => mark(r._id, "rejected")}>
                      Not paid
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
