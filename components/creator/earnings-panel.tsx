"use client"

/**
 * Creators Program earnings on the creator dashboard. What shows depends on status:
 *   not invited - how the program works, and any held collab shares ("unlocks when you join")
 *   invited     - the invite, the terms, Accept
 *   member      - balances by state, earnings history; cash-out arrives with payouts
 *   removed     - a plain notice
 */

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { RiLoader4Line, RiTrophyLine, RiLockLine, RiTimeLine, RiWallet3Line, RiCheckboxCircleLine } from "react-icons/ri"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { acceptProgram, getMyProgram, naira, type LedgerRow, type MyProgram } from "@/lib/creator"
import { PayoutsSection } from "@/components/creator/payouts-section"

const STATE_TILES: { key: keyof MyProgram["balances"]; label: string; hint: string; icon: typeof RiLockLine }[] = [
  { key: "available", label: "Available", hint: "Ready to cash out", icon: RiWallet3Line },
  { key: "pending", label: "Pending", hint: "In the holding period", icon: RiTimeLine },
  { key: "held", label: "Held", hint: "Unlocks when you join", icon: RiLockLine },
  { key: "requested", label: "In cash-out", hint: "Waiting to be paid", icon: RiWallet3Line },
  { key: "paid", label: "Paid", hint: "Sent to your bank", icon: RiCheckboxCircleLine },
]

function rowLabel(r: LedgerRow) {
  const list = r.playlistName ? ` · ${r.playlistName}` : ""
  switch (r.type) {
    case "bonus":
      return `First 1,000 bonus${list}`
    case "block":
      return `Block ${r.blockNumber}${list}`
    case "collab_share":
      return `Collab share, block ${r.blockNumber}${list}`
    case "reversal":
      return r.note || "Reversed"
    case "payout":
      return "Cash-out"
    case "tax":
      return r.note || "Withholding tax"
    default:
      return "Credit"
  }
}

export function EarningsPanel() {
  const [data, setData] = useState<MyProgram | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [joining, setJoining] = useState(false)

  const load = useCallback(() => {
    getMyProgram()
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((err) => setError((err as Error).message))
  }, [])
  useEffect(load, [load])

  const join = async () => {
    if (!data) return
    setJoining(true)
    try {
      const res = await acceptProgram(data.terms.version)
      setData(res.program)
      toast.success(res.released ? `Welcome in. ${naira(res.released)} is now available.` : "Welcome to the Creators Program")
    } catch (err) {
      toast.error((err as Error).message)
      load()
    } finally {
      setJoining(false)
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data) return <RiLoader4Line className="mx-auto my-12 h-6 w-6 animate-spin text-muted-foreground" />

  const { rates } = data
  const blockSize = rates.blockSize.toLocaleString("en")

  return (
    <div className="space-y-5">
      {data.status === "removed" ? (
        <section className="rounded-up-lg border border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold text-foreground">You are no longer in the Creators Program</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your playlists stay up, but they do not earn. Contact UP if you think this is a mistake.</p>
        </section>
      ) : null}

      {data.status === "invited" ? (
        <section className="rounded-up-lg border border-up-orange bg-up-orange-tint p-4">
          <div className="flex items-center gap-2">
            <RiTrophyLine className="h-6 w-6 text-up-orange" aria-hidden />
            <h2 className="font-display text-lg font-bold text-foreground">Congratulations, you're invited to the UP Creators Program</h2>
          </div>
          <p className="mt-1 text-sm text-foreground">
            Your {naira(rates.bonusAmount)} bonus is waiting{data.balances.held > rates.bonusAmount ? `, with ${naira(data.balances.held - rates.bonusAmount)} more from collabs` : ""}. Accept the terms to unlock it.
          </p>
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border bg-card p-3">
            <p className="text-sm font-semibold text-foreground">{data.terms.title}</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] text-muted-foreground">
              {data.terms.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
          <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
            <input type="checkbox" className="h-5 w-5 accent-[#FF6A00]" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            I have read and accept the terms
          </label>
          <Button type="button" className="mt-2 h-11" disabled={!agreed || joining} onClick={join}>
            {joining ? <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" /> : null}
            Join and unlock {naira(data.balances.held)}
          </Button>
        </section>
      ) : null}

      {data.status === "not_invited" ? (
        <section className="rounded-up-lg border border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold text-foreground">How you earn</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>{naira(rates.bonusAmount)} when your first public playlist reaches {blockSize} unique viewers. That also invites you to the program.</li>
            <li>{naira(rates.blockAmount)} for every further {blockSize} unique viewers, on up to 5 public playlists.</li>
            <li>Collab earnings split evenly between the owner and editors.</li>
          </ul>
          {data.balances.held > 0 ? (
            <p className="mt-3 rounded-lg bg-up-fill px-3 py-2 text-sm text-foreground">
              {naira(data.balances.held)} from collabs is waiting for you. It unlocks when you join.
            </p>
          ) : null}
        </section>
      ) : null}

      {data.status !== "not_invited" || data.balances.held > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STATE_TILES.filter(({ key }) => key !== "requested" || data.balances.requested > 0).map(({ key, label, hint, icon: Icon }) => (
            <div key={key} className={cn("rounded-up-lg border border-border bg-card p-4", key === "available" && "border-up-orange")}>
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </div>
              <div className="mt-1 font-display text-[24px] font-bold tabular-nums text-foreground">{naira(data.balances[key])}</div>
              <div className="text-[12px] text-muted-foreground">{hint}</div>
            </div>
          ))}
        </div>
      ) : null}

      {data.status === "member" ? <PayoutsSection onChange={load} /> : null}

      {data.history.length ? (
        <section>
          <h2 className="mb-2 font-display text-lg font-bold text-foreground">Earnings history</h2>
          <ul className="divide-y divide-border rounded-up-lg border border-border bg-card">
            {data.history.map((r) => (
              <li key={r._id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{rowLabel(r)}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {new Date(r.creditedAt).toLocaleDateString()} · {r.state === "pending" && r.availableAt ? `available ${new Date(r.availableAt).toLocaleDateString()}` : r.state}
                  </p>
                </div>
                <span className={cn("text-sm font-semibold tabular-nums", r.amount < 0 ? "text-destructive" : "text-foreground")}>
                  {r.amount < 0 ? "−" : "+"}
                  {naira(Math.abs(r.amount))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-[12px] text-muted-foreground">
        Questions about earnings? See <Link href="/creator?tab=tips" className="underline">tips</Link> or contact UP.
      </p>
    </div>
  )
}
