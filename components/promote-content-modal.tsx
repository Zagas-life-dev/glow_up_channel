"use client"

import { useEffect, useMemo, useState } from 'react'
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
import { ImagePlus, Loader2, TrendingUp, X } from 'lucide-react'

const MIN_DURATION = 7
const MAX_DURATION = 365
const QUICK_DURATIONS = [7, 14, 30, 60, 90]

/** Matches the backend's own limit for hero uploads. */
const MAX_HERO_BYTES = 10 * 1024 * 1024

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
  const [heroFile, setHeroFile] = useState<File | null>(null)

  // Derived rather than held in state, so picking a file does not cost an extra
  // render pass. The effect below exists only to revoke the URL — without it
  // every re-pick leaks a blob for the life of the tab.
  const heroPreview = useMemo(
    () => (heroFile ? URL.createObjectURL(heroFile) : null),
    [heroFile],
  )

  useEffect(() => {
    if (!heroPreview) return
    return () => URL.revokeObjectURL(heroPreview)
  }, [heroPreview])

  const safeDuration = Math.min(Math.max(MIN_DURATION, durationDays), MAX_DURATION)

  const handleSubmit = async () => {
    if (!item) return
    if (safeDuration < MIN_DURATION) {
      toast.error(`Duration must be at least ${MIN_DURATION} days`)
      return
    }
    setSubmitting(true)
    try {
      // Uploaded first: a failed image must not leave a started campaign with a
      // half-applied hero, and the start call needs the hosted URL.
      let heroImageUrl: string | null = null
      if (heroFile) {
        try {
          heroImageUrl = await ApiClient.uploadPromotionHeroImage(heroFile)
        } catch (uploadError) {
          const message = uploadError instanceof Error ? uploadError.message : 'Image upload failed'
          toast.error(`${message}. Start the promotion without an image, or try again.`)
          setSubmitting(false)
          return
        }
      }

      await ApiClient.startFreePromotion({
        contentId: item._id,
        contentType: item.type,
        durationDays: safeDuration,
        heroImageUrl,
      })
      toast.success(`Promotion started for ${safeDuration} days`)
      setHeroFile(null)
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

          {/* Hero image — only available while promoting.

              A listing carries an `image` field that every promoted surface
              reads, but no posting form ever set it, so promoted listings
              rendered without one. It is offered here rather than on the
              posting forms because it is part of what the promotion buys: it
              goes on when the campaign starts and comes off when it ends. */}
          <div className="space-y-2">
            <Label>Hero image <span className="font-normal text-muted-foreground">(optional)</span></Label>
            {heroPreview ? (
              <div className="relative overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroPreview} alt="Hero preview" className="h-32 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setHeroFile(null)}
                  disabled={submitting}
                  aria-label="Remove image"
                  className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 text-foreground shadow-sm hover:bg-background"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-muted/30 p-5 text-center transition-colors hover:border-primary/50">
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Add a hero image</span>
                <span className="text-xs text-muted-foreground">JPEG, PNG, WebP or GIF · max 10MB</span>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  className="hidden"
                  disabled={submitting}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null
                    if (file && file.size > MAX_HERO_BYTES) {
                      toast.error('Image is too large. Maximum size is 10MB.')
                      return
                    }
                    setHeroFile(file)
                  }}
                />
              </label>
            )}
            <p className="text-xs text-muted-foreground">
              Shown on your listing while the promotion runs. It is removed when
              the promotion ends.
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
