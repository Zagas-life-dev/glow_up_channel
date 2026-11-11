"use client"

/**
 * Members' cash-out: bank details (Paystack name check), the Cash out button, and
 * payout history. Account numbers never come back from the server, only the last 4.
 */

import { useCallback, useEffect, useState } from "react"
import { RiBankLine, RiCheckboxCircleLine, RiLoader4Line, RiShieldCheckLine } from "react-icons/ri"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getBanks,
  getMyBank,
  getMyPayouts,
  naira,
  requestCashOut,
  saveMyBank,
  type BankDetails,
  type CashOutStatus,
  type Payout,
} from "@/lib/creator"

const input = "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"

function BankForm({ current, onSaved, onCancel }: { current: BankDetails | null; onSaved: (b: BankDetails) => void; onCancel?: () => void }) {
  const [banks, setBanks] = useState<{ code: string; name: string }[]>([])
  const [accountName, setAccountName] = useState(current?.accountName || "")
  const [bankCode, setBankCode] = useState(current?.bankCode || "")
  const [accountNumber, setAccountNumber] = useState("")
  const [tin, setTin] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getBanks().then((d) => setBanks(d.banks)).catch(() => setBanks([]))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await saveMyBank({ accountName, accountNumber, bankCode, tin: tin || undefined })
      toast.success(res.checked ? "Bank details saved and checked" : "Bank details saved. We could not check them with the bank right now.")
      onSaved(res.bank)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {current ? (
        <p className="rounded-lg bg-up-orange-tint px-3 py-2 text-[13px] text-foreground">
          Changing your account pauses cash-out for 7 days, to protect you if someone else gets into your account.
        </p>
      ) : null}
      <div>
        <label htmlFor="bank-name" className="mb-1 block text-sm font-medium text-foreground">Account name</label>
        <input id="bank-name" className={input} value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="As your bank shows it" required autoComplete="name" />
      </div>
      <div>
        <label htmlFor="bank-code" className="mb-1 block text-sm font-medium text-foreground">Bank</label>
        <select id="bank-code" className={input} value={bankCode} onChange={(e) => setBankCode(e.target.value)} required>
          <option value="">Choose your bank</option>
          {banks.map((b) => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="bank-number" className="mb-1 block text-sm font-medium text-foreground">Account number</label>
        <input
          id="bank-number"
          className={input}
          inputMode="numeric"
          pattern="\d{10}"
          maxLength={10}
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder={current ? `•••••• ${current.accountLast4}` : "10 digits"}
          required
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="bank-tin" className="mb-1 block text-sm font-medium text-foreground">Tax ID (TIN), optional</label>
        <input id="bank-tin" className={input} value={tin} onChange={(e) => setTin(e.target.value)} placeholder={current?.hasTin ? "On file. Type to replace." : "If you have one"} autoComplete="off" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="h-11" disabled={saving || accountNumber.length !== 10 || !bankCode}>
          {saving ? <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save bank details
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" className="h-11" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}

const STATUS_STYLE: Record<Payout["status"], string> = {
  requested: "bg-up-orange-tint text-up-orange-ink",
  paid: "bg-up-lime-tint text-up-lime-ink",
  rejected: "bg-muted text-muted-foreground",
}
const STATUS_LABEL: Record<Payout["status"], string> = { requested: "Waiting to be paid", paid: "Paid", rejected: "Not paid" }

export function PayoutsSection({ onChange }: { onChange: () => void }) {
  const [bank, setBank] = useState<BankDetails | null | undefined>(undefined)
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState<CashOutStatus | null>(null)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    getMyBank().then((d) => setBank(d.bank)).catch(() => setBank(null))
    getMyPayouts()
      .then((d) => {
        setStatus(d.status)
        setPayouts(d.payouts)
      })
      .catch(() => {})
  }, [])
  useEffect(load, [load])

  const cashOut = async () => {
    setBusy(true)
    try {
      const { payout } = await requestCashOut()
      toast.success(`Cash-out of ${naira(payout.netAmount)} requested. Payouts go out weekly.`)
      load()
      onChange()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="rounded-up-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <RiBankLine className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h2 className="font-display text-lg font-bold text-foreground">Bank details</h2>
        </div>
        {bank === undefined ? (
          <RiLoader4Line className="mt-3 h-5 w-5 animate-spin text-muted-foreground" />
        ) : bank && !editing ? (
          <div className="mt-2 text-sm text-foreground">
            <p className="font-semibold">{bank.accountName}</p>
            <p className="text-muted-foreground">
              {bank.bankName} · •••••• {bank.accountLast4}
              {bank.hasTin ? " · TIN on file" : ""}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-muted-foreground">
              {bank.paystackVerified ? <RiShieldCheckLine className="h-4 w-4 text-up-lime-ink" aria-hidden /> : null}
              {bank.paystackVerified ? "Name checked with your bank" : "Not checked with the bank yet"}
            </p>
            <div>
              <Button type="button" variant="outline" className="mt-3 h-10" onClick={() => setEditing(true)}>
                Change bank details
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            {!bank ? <p className="mb-3 text-sm text-muted-foreground">Add the account we should pay you into.</p> : null}
            <BankForm
              current={bank}
              onSaved={(b) => {
                setBank(b)
                setEditing(false)
                load()
              }}
              onCancel={bank ? () => setEditing(false) : undefined}
            />
          </div>
        )}
      </section>

      <section className="rounded-up-lg border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold text-foreground">Cash out</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cash-out opens at {naira(status?.minPayout ?? 5000)} available. Payouts go out weekly to your bank.
          {status && status.taxRate > 0 ? ` ${status.taxRate}% is withheld as tax.` : ""}
        </p>
        {status?.openRequest ? (
          <p className="mt-3 rounded-lg bg-up-orange-tint px-3 py-2 text-sm text-foreground">
            {naira(status.openRequest.netAmount)} is on its way. Requested {new Date(status.openRequest.createdAt).toLocaleDateString()}.
          </p>
        ) : null}
        <Button type="button" className="mt-3 h-11" disabled={!status?.canCashOut || busy} onClick={cashOut}>
          {busy ? <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" /> : null}
          Cash out {naira(status?.available ?? 0)}
        </Button>
        {status && !status.canCashOut && status.reason && !status.openRequest ? (
          <p className="mt-2 text-[13px] text-muted-foreground">{status.reason}</p>
        ) : null}
      </section>

      {payouts.length ? (
        <section>
          <h2 className="mb-2 font-display text-lg font-bold text-foreground">Payouts</h2>
          <ul className="divide-y divide-border rounded-up-lg border border-border bg-card">
            {payouts.map((p) => (
              <li key={p._id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tabular-nums text-foreground">{naira(p.netAmount)}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()}
                    {p.bank ? ` · ${p.bank.bankName} ••${p.bank.accountLast4}` : ""}
                    {p.taxAmount ? ` · ${naira(p.taxAmount)} tax` : ""}
                    {p.note && p.status === "rejected" ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium", STATUS_STYLE[p.status])}>
                  {p.status === "paid" ? <RiCheckboxCircleLine className="h-3.5 w-3.5" aria-hidden /> : null}
                  {STATUS_LABEL[p.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
