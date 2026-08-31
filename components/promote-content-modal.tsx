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
const QUICK_DURATIONS = [7, 14, 30, 60, 90]

export interface PostedItemForPromote {
  _id: string
  title: string
  type: 'opportunity' | 'job' | 'event' | 'resource'
}

interface PromoteContentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: PostedItemForPromote | null
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
  const [submitting, setSubmitting] = useState(false)

  const safeDuration = Math.min(Math.max(MIN_DURATION, durationDays), MAX_DURATION)

  const handleSubmit = async () => {
    if (!item) return
    if (safeDuration < MIN_DURATION) {
      toast.error(`Duration must be at least ${MIN_DURATION} days`)
      return
    }
    setSubmitting(true)
    try {
      await ApiClient.startFreePromotion({
        contentId: item._id,
        contentType: item.type,
        durationDays: safeDuration,
      })
      toast.success(`Promotion started for ${safeDuration} days`)
      onOpenChange(false)
      onSuccess()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to start promotion'
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
            Promotion is free. Pick how long you want the boost to run and it starts right away.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-sm font-medium text-foreground line-clamp-2">{item.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{getTypeLabel(item.type)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (days)</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_DURATIONS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={safeDuration === n ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDurationDays(n)}
                >
                  {n} days
                </Button>
              ))}
            </div>
            <Input
              id="duration"
              type="number"
              min={MIN_DURATION}
              max={MAX_DURATION}
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || MIN_DURATION)}
            />
            <p className="text-xs text-muted-foreground">
              Min {MIN_DURATION}, max {MAX_DURATION} days.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
            <p className="text-sm font-medium text-foreground">
              Your content gets boosted placement for {safeDuration} days.
            </p>
            <p className="text-sm text-muted-foreground">
              No fee, no budget and no per-click charge — promotion costs you nothing.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
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
