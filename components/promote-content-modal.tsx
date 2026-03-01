"use client"

import { useState } from 'react'
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
import { Loader2, TrendingUp } from 'lucide-react'

const MIN_DURATION = 7
const MAX_DURATION = 365
const NGN_PER_DAY = 100
const QUICK_AMOUNTS = [1000, 5000, 10000, 25000, 50000, 100000]
// Estimated cost per click (NGN) for reach calculation; product can tune these.
const ESTIMATED_CPC_MIN = 10
const ESTIMATED_CPC_MAX = 20

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
  onSuccess,
}: PromoteContentModalProps) {
  const [durationDays, setDurationDays] = useState(7)
  const [spendAmount, setSpendAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const safeDuration = Math.min(Math.max(MIN_DURATION, durationDays), MAX_DURATION)
  const upfrontNg = safeDuration * NGN_PER_DAY
  const spendLimitNg = (parseInt(spendAmount.replace(/\D/g, ''), 10) || 0) > 0 ? parseInt(spendAmount.replace(/\D/g, ''), 10) : null
  const totalNg = upfrontNg + (spendLimitNg ?? 0)

  // Estimated reach (people/clicks) from per-click budget; heuristic only.
  const reachMin = spendLimitNg != null && spendLimitNg > 0 && ESTIMATED_CPC_MAX > 0
    ? Math.round(spendLimitNg / ESTIMATED_CPC_MAX)
    : null
  const reachMax = spendLimitNg != null && spendLimitNg > 0 && ESTIMATED_CPC_MIN > 0
    ? Math.round(spendLimitNg / ESTIMATED_CPC_MIN)
    : null

  const handleSubmit = async () => {
    if (!item) return
    if (safeDuration < MIN_DURATION) {
      toast.error(`Duration must be at least ${MIN_DURATION} days`)
      return
    }
    if (spendLimitNg == null || spendLimitNg < 1) {
      toast.error('Enter a per-click budget amount (required)')
      return
    }
    setSubmitting(true)
    try {
      const callbackUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard/provider/promotions?promotion=success`
        : undefined
      const result = await ApiClient.initializePromotionPayment({
        contentId: item._id,
        contentType: item.type,
        durationDays: safeDuration,
        spendLimitNg,
        callbackUrl,
      })
      if (result?.authorizationUrl) {
        onOpenChange(false)
        window.location.href = result.authorizationUrl
        return
      }
      toast.error('Failed to start payment')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to start payment'
      toast.error(message)
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
            Pay once via Paystack (₦100/day upfront + your per-click budget). After payment, your promotion starts automatically.
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
            <Label>Budget for per-click (required)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Total amount that can be charged for clicks over this promotion. This amount is paid upfront together with the daily fee.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {QUICK_AMOUNTS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSpendAmount(String(n))}
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
                onChange={(e) => setSpendAmount(e.target.value)}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">NGN</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
            <p className="text-sm font-medium text-foreground">
              Upfront: ₦{upfrontNg.toLocaleString()} (₦{NGN_PER_DAY}/day × {safeDuration} days)
            </p>
            <p className="text-sm text-foreground">
              {spendLimitNg != null && spendLimitNg > 0
                ? `Per-click budget: ₦${spendLimitNg.toLocaleString()} over ${safeDuration} days.`
                : 'Enter a per-click budget above.'}
            </p>
            {reachMin != null && reachMax != null && reachMin > 0 && (
              <p className="text-sm text-foreground mt-2">
                With this budget and duration, you could reach approximately{' '}
                <span className="font-medium">{reachMin.toLocaleString()}–{reachMax.toLocaleString()} people</span>.
              </p>
            )}
            {spendLimitNg != null && spendLimitNg > 0 && (
              <p className="text-sm font-semibold text-foreground mt-2">
                Total to pay: ₦{totalNg.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !spendLimitNg || spendLimitNg < 1}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting…
              </>
            ) : (
              'Make payment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
