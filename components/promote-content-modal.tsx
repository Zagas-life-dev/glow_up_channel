"use client"

/**
 * Starting a promotion.
 *
 * Two tiers reach this modal, and they are genuinely different products rather
 * than a small and a large of the same thing, so the choice is the first thing
 * asked and everything below it reacts:
 *
 *   - **Standard** boosts placement in the feed and the hub pages. The provider
 *     picks how long it runs.
 *   - **Extreme** additionally takes the first card of every feed and announces
 *     the listing to readers directly — a popup, a push and an email slot. Its
 *     length used to be fixed at 21 days, because the announcement schedule was
 *     a set of offsets into that window and any other length would have pulled
 *     the three channels apart. The schedule is now drawn from whatever span the
 *     campaign is created with and the number of announcements scales with it,
 *     so the provider picks the length here too — and the line under the control
 *     tells them what a longer run buys.
 *
 * Both are free. Neither has a budget, a bid or a per-click charge.
 */

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
import { announcementCount } from '@/lib/promotions/announcement'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Bell,
  Check,
  ImagePlus,
  Loader2,
  Mail,
  Megaphone,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { compressImage, formatBytes, MAX_COVER_BYTES } from '@/lib/images/compress-image'

const MIN_DURATION = 7
const MAX_DURATION = 365
const QUICK_DURATIONS = [7, 14, 30, 60, 90]

/**
 * Extreme runs may be shorter than a standard one, because the shortest band
 * on the announcement ladder is a week and a run has to be able to sit inside
 * it. Mirrors `MIN_EXTREME_DAYS` in `promotionController.startFree`.
 */
const EXTREME_MIN_DURATION = 3

/** What the tier has always run for, and still does unless asked otherwise. */
const EXTREME_DEFAULT_DURATION = 21

const EXTREME_QUICK_DURATIONS = [7, 21, 45, 90, 180, 365]

/** Matches the backend's own limit for hero uploads. */
const MAX_HERO_BYTES = MAX_COVER_BYTES

type Tier = 'standard' | 'extreme'

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

/** What the extreme tier adds, in the order a provider cares about it. */
const EXTREME_PERKS: { icon: typeof Zap; text: string }[] = [
  { icon: Sparkles, text: 'The first card of the feed and of every hub page, every load' },
  { icon: Zap, text: 'Shown in the main feed and the sponsored feed, not just one' },
  { icon: Megaphone, text: 'Full-screen announcements through the run, on days picked per reader' },
  { icon: Bell, text: 'A push notification on each of those days' },
  { icon: Mail, text: 'A featured slot in our welcome and verification emails' },
]

function TierCard({
  selected,
  onSelect,
  disabled,
  title,
  tagline,
  meta,
  badge,
  children,
}: {
  selected: boolean
  onSelect: () => void
  disabled?: boolean
  title: string
  tagline: string
  meta: string
  badge?: string
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'w-full rounded-xl border p-3 text-left transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:border-primary/40',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
          )}
          aria-hidden
        >
          {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            {badge && (
              <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                {badge}
              </span>
            )}
            <span className="ml-auto text-[11px] font-medium text-muted-foreground">{meta}</span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{tagline}</p>
          {children}
        </div>
      </div>
    </button>
  )
}

export function PromoteContentModal({
  open,
  onOpenChange,
  item,
  onSuccess,
}: PromoteContentModalProps) {
  const [tier, setTier] = useState<Tier>('standard')
  const [durationDays, setDurationDays] = useState(7)
  const [submitting, setSubmitting] = useState(false)
  const [heroFile, setHeroFile] = useState<File | null>(null)
  /** An oversized pick is re-encoded before it becomes the selection. */
  const [compressing, setCompressing] = useState(false)

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

  // Note: callers key this component on the listing id, so opening it for a
  // different listing remounts it and every field above starts fresh. That
  // matters more than it looks — without it the modal remembers the last tier
  // and image, and a provider who chose Extreme once would silently get it
  // again on the next listing they promoted. Remounting is also why there is no
  // reset effect here: there is nothing to reset.

  const isExtreme = tier === 'extreme'
  const minDuration = isExtreme ? EXTREME_MIN_DURATION : MIN_DURATION
  const effectiveDuration = Math.min(Math.max(minDuration, durationDays), MAX_DURATION)

  /**
   * How many times this run will announce itself to a given reader.
   *
   * Computed from the same ladder the server draws the days from, so the
   * number shown here is the number delivered rather than a marketing round
   * figure. It is the one part of the tier that visibly rewards a longer run,
   * which is exactly why it belongs next to the control that sets it.
   */
  const popups = announcementCount(effectiveDuration)

  const handleSubmit = async () => {
    if (!item) return
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
        durationDays: effectiveDuration,
        heroImageUrl,
        ...(isExtreme && { packageType: 'extreme' as const }),
      })

      toast.success(
        isExtreme
          ? `Extreme promotion started — ${effectiveDuration} days, ${popups} announcement${popups === 1 ? '' : 's'}`
          : `Promotion started for ${effectiveDuration} days`,
      )
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

  const busy = submitting || compressing

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Promote this content
          </DialogTitle>
          <DialogDescription>
            Promotion is free — no fees, no budget, no per-click charge. Pick how
            far you want it to reach.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{getTypeLabel(item.type)}</p>
          </div>

          {/* Tier. First, because everything below depends on it. */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Reach
            </Label>

            <TierCard
              selected={!isExtreme}
              onSelect={() => setTier('standard')}
              disabled={busy}
              title="Standard"
              tagline="Boosted placement in the feed and on the hub pages."
              meta="You choose the length"
            />

            <TierCard
              selected={isExtreme}
              onSelect={() => {
                setTier('extreme')
                // Standard opens on a week, which would quietly halve what the
                // tier has always run for. Anything the provider has already
                // set is theirs and is left alone.
                if (durationDays === MIN_DURATION) setDurationDays(EXTREME_DEFAULT_DURATION)
              }}
              disabled={busy}
              title="Extreme"
              tagline="Everything in Standard, plus we announce it to readers directly."
              meta="You choose the length"
              badge="Most reach"
            >
              {isExtreme && (
                <ul className="mt-2.5 space-y-1.5 border-t border-primary/15 pt-2.5">
                  {EXTREME_PERKS.map((perk) => (
                    <li key={perk.text} className="flex items-start gap-2">
                      <perk.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {perk.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </TierCard>
          </div>

          {/*
            Duration — one control for both tiers now.

            It used to be replaced for extreme by a "fixed at 21 days" notice,
            because the announcement schedule was a fixed set of offsets into a
            21-day window. It is now drawn from whatever span the campaign is
            created with, and the number of announcements scales with it, so
            the length is a real choice on both tiers. What extreme adds here
            is the line below the control saying what that choice buys.
          */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <div className="flex flex-wrap gap-2">
              {(isExtreme ? EXTREME_QUICK_DURATIONS : QUICK_DURATIONS).map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={effectiveDuration === n ? 'default' : 'outline'}
                  size="sm"
                  disabled={busy}
                  onClick={() => setDurationDays(n)}
                >
                  {n} days
                </Button>
              ))}
            </div>
            <Input
              id="duration"
              type="number"
              min={minDuration}
              max={MAX_DURATION}
              value={durationDays}
              disabled={busy}
              onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || minDuration)}
            />
            {isExtreme ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Between {minDuration} and {MAX_DURATION} days. A {effectiveDuration}-day
                run announces itself to each reader on{' '}
                <span className="font-medium text-foreground">
                  {popups} {popups === 1 ? 'day' : 'separate days'}
                </span>{' '}
                — longer runs earn more. It replaces any promotion currently running
                on this listing.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Between {minDuration} and {MAX_DURATION} days.
              </p>
            )}
          </div>

          {/* Hero image — only available while promoting.

              A listing carries an `image` field that every promoted surface
              reads, but no posting form ever set it, so promoted listings
              rendered without one. It is offered here rather than on the
              posting forms because it is part of what the promotion buys: it
              goes on when the campaign starts and comes off when it ends. */}
          <div className="space-y-2">
            <Label>
              Hero image <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            {heroPreview ? (
              <div className="relative overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroPreview} alt="Hero preview" className="h-32 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setHeroFile(null)}
                  disabled={busy}
                  aria-label="Remove image"
                  className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 text-foreground shadow-sm hover:bg-background"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-muted/30 p-5 text-center transition-colors hover:border-primary/50">
                {compressing ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {compressing ? 'Compressing image…' : 'Add a hero image'}
                </span>
                <span className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP or GIF · larger than 10MB is compressed for you
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  className="hidden"
                  disabled={busy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0] ?? null
                    // Let the same file be re-picked after a failure.
                    e.target.value = ''
                    if (!file) return
                    if (file.size <= MAX_HERO_BYTES) {
                      setHeroFile(file)
                      return
                    }

                    setCompressing(true)
                    const result = await compressImage(file, MAX_HERO_BYTES)
                    setCompressing(false)

                    if (!result.ok) {
                      toast.error(
                        result.animated
                          ? `That GIF is ${formatBytes(file.size)}. Animated GIFs can't be compressed without losing the animation — please use one under 10MB.`
                          : `Image too large. This one is ${formatBytes(file.size)} and can't be compressed below 10MB without ruining it — please use one under 10MB.`,
                      )
                      return
                    }

                    setHeroFile(result.file)
                    if (result.compressedFrom) {
                      toast.success(
                        `Compressed from ${formatBytes(result.compressedFrom)} to ${formatBytes(result.file.size)}.`,
                      )
                    }
                  }}
                />
              </label>
            )}
            <p className="text-xs text-muted-foreground">
              Shown on your listing while the promotion runs. It is removed when
              the promotion ends.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : isExtreme ? (
              `Start extreme · ${effectiveDuration} days`
            ) : (
              `Start promotion · ${effectiveDuration} days`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
