"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ApiClient from '@/lib/api-client'
import { toast } from 'sonner'
import { Loader2, TrendingUp, Wallet } from 'lucide-react'
import Link from 'next/link'

const MIN_DURATION = 7
const MAX_DURATION = 365
const NGN_PER_DAY = 100
const QUICK_AMOUNTS = [1000, 5000, 10000, 25000, 50000, 100000]

export interface PostedItemForPromote {
  _id: string
  title: string
  type: 'opportunity' | 'job' | 'event' | 'resource'
}

interface PromoteContentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: PostedItemForPromote | null
  walletBalance?: number
  onSuccess: () => void
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    opportunity: 'Opportunity',
    job: 'Job',
    event: 'Event',
    resource: 'Resource',
  }
  return map[type] || type
}

export function PromoteContentModal({
  open,
  onOpenChange,
  item,
  walletBalance: walletBalanceProp,
  onSuccess,
}: PromoteContentModalProps) {
  const [durationDays, setDurationDays] = useState(7)
  const [spendAmount, setSpendAmount] = useState('')
  const [noLimit, setNoLimit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [balance, setBalance] = useState(walletBalanceProp ?? 0)
  const [loadingBalance, setLoadingBalance] = useState(false)

  useEffect(() => {
    if (walletBalanceProp !== undefined) {
      setBalance(walletBalanceProp)
      return
    }
    if (!open) return
    let cancelled = false
    setLoadingBalance(true)
    ApiClient.getWallet()
      .then((w) => { if (!cancelled) setBalance(w.balanceNg); })
      .catch(() => { if (!cancelled) setBalance(0); })
      .finally(() => { if (!cancelled) setLoadingBalance(false); })
    return () => { cancelled = true }
  }, [open, walletBalanceProp])

  const safeDuration = Math.min(Math.max(MIN_DURATION, durationDays), MAX_DURATION)
  const upfrontNg = safeDuration * NGN_PER_DAY
  const spendLimitNg = noLimit ? null : (parseInt(spendAmount.replace(/\D/g, ''), 10) || 0) > 0 ? parseInt(spendAmount.replace(/\D/g, ''), 10) : null
  const insufficient = balance < upfrontNg

  const handleSubmit = async () => {
    if (!item) return
    if (safeDuration < MIN_DURATION) {
      toast.error(`Duration must be at least ${MIN_DURATION} days`)
      return
    }
    if (!noLimit && (spendLimitNg == null || spendLimitNg < 1)) {
      toast.error('Enter an amount for per-click budget or tick "No limit"')
      return
    }
    if (insufficient) {
      toast.error('Insufficient wallet balance for upfront (₦100/day). Top up first.')
      return
    }
    setSubmitting(true)
    try {
      const result = await ApiClient.startPromotionWithWallet({
        contentId: item._id,
        contentType: item.type,
        durationDays: safeDuration,
        spendLimitNg: noLimit ? undefined : (spendLimitNg ?? undefined),
      })
      const limitText = result.spendLimitNg != null ? `; up to ₦${result.spendLimitNg.toLocaleString()} per-click budget` : '; no per-click limit'
      toast.success(`Promotion started. ₦${result.chargedNg.toLocaleString()} charged upfront${limitText}.`)
      setBalance(result.balanceNg)
      onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to start promotion')
    } finally {
      setSubmitting(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Promote this content
          </DialogTitle>
          <DialogDescription>
            ₦100 per day is charged upfront from your wallet. Set duration and your exact budget for per-click charges over that period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-sm font-medium text-foreground line-clamp-2">{item.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{getTypeLabel(item.type)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (days)</Label>
            <Input
              id="duration"
              type="number"
              min={MIN_DURATION}
              max={MAX_DURATION}
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || MIN_DURATION)}
            />
            <p className="text-xs text-muted-foreground">
              Min {MIN_DURATION}, max {MAX_DURATION} days. Upfront: ₦{NGN_PER_DAY}/day × {safeDuration} = ₦{upfrontNg.toLocaleString()}.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Budget for per-click (exact amount)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Total amount that can be charged from your wallet for clicks over this promotion. Enter the exact amount or use quick fill.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {QUICK_AMOUNTS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setSpendAmount(String(n)); setNoLimit(false); }}
                >
                  ₦{n.toLocaleString()}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                placeholder="e.g. 15000"
                value={spendAmount}
                onChange={(e) => { setSpendAmount(e.target.value); setNoLimit(false); }}
                disabled={noLimit}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">NGN</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={noLimit}
                onChange={(e) => { setNoLimit(e.target.checked); if (e.target.checked) setSpendAmount(''); }}
                className="rounded border-border"
              />
              <span className="text-sm">No limit (per-click charges uncapped)</span>
            </label>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
            <p className="text-sm font-medium text-foreground">
              Upfront: ₦{upfrontNg.toLocaleString()} (₦{NGN_PER_DAY}/day × {safeDuration} days)
            </p>
            <p className="text-sm text-foreground">
              {spendLimitNg != null
                ? `Per-click budget: ₦${spendLimitNg.toLocaleString()} over ${safeDuration} days.`
                : `Per-click: no cap over ${safeDuration} days.`}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Wallet className="h-4 w-4" />
              <span>{loadingBalance ? 'Loading…' : `Wallet: ₦${balance.toLocaleString()}`}</span>
            </div>
            {insufficient && (
              <p className="text-sm text-destructive font-medium mt-2">
                Insufficient for upfront. <Link href="/dashboard/provider/wallet" className="underline">Top up wallet</Link>.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || insufficient}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              'Start promotion'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
