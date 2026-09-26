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
import { KindChip, toUpKind } from '@/components/up/kind'
import { toast } from 'sonner'
import {
  Bell,
  Check,
  ImagePlus,
  Loader2,
  Mail,
  Megaphone,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { IMAGE_TARGETS, formatBytes, prepareErrorMessage, prepareImageUpload } from '@/lib/images/compress-image'

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

/**
 * A reach option. Extreme is drawn as a small version of its own navy feed
 * card (tile stack, lime pill) so providers see what they are getting.
 */
function TierCard({
  selected,
  onSelect,
  disabled,
  title,
  tagline,
  meta,
  badge,
  navy = false,
  children,
}: {
  selected: boolean
  onSelect: () => void
  disabled?: boolean
  title: string
  tagline: string
  meta: string
  badge?: string
  navy?: boolean
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'relative w-full overflow-hidden rounded-up-xl p-4 text-left transition-shadow',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        navy
          ? 'bg-up-navy text-up-on-navy dark:bg-up-lead'
          : 'border-[1.5px] border-border bg-card text-foreground hover:border-up-border-hover',
        selected && 'shadow-[0_0_0_3px_var(--up-orange)]',
        selected && !navy && 'border-transparent',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      {navy ? (
        <>
          <span aria-hidden className="absolute -right-8 -top-9 h-[90px] w-[120px] -rotate-[8deg] rounded-[20px] bg-up-orange" />
          <span aria-hidden className="absolute -top-[18px] right-10 h-12 w-16 rotate-[7deg] rounded-[14px] bg-up-lime" />
        </>
      ) : null}
      <div className="relative flex items-center justify-between gap-2">
        {badge ? (
          <span className="rounded-full bg-up-lime px-2.5 py-[5px] text-xs font-bold text-up-navy">{badge}</span>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">{meta}</span>
        )}
        <span
          aria-hidden
          className={cn(
            'grid h-5 w-5 shrink-0 place-items-center rounded-full',
            selected
              ? 'bg-up-orange text-up-navy'
              : navy
                ? 'shadow-[inset_0_0_0_1.5px_var(--up-border-on-navy)]'
                : 'shadow-[inset_0_0_0_1.5px_var(--up-border-hover)]',
          )}
        >
          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      </div>
      <p className="relative mt-3 font-display text-lg font-bold">{title}</p>
      <p className={cn('relative mt-1 text-[13px] leading-relaxed', navy ? 'text-up-orange' : 'text-muted-foreground')}>
        {tagline}
      </p>
      {children ? <div className="relative">{children}</div> : null}
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
          heroImageUrl = await ApiClient.uploadPromotionHeroImage({
            file: heroFile,
            contentId: item._id,
            contentType: item.type,
          })
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
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Promote this content</DialogTitle>
          <DialogDescription className="flex items-center gap-2 pr-10 pt-1">
            <KindChip kind={toUpKind(item.type)} size="sm" />
            <span className="line-clamp-1 font-semibold text-foreground">{item.title}</span>
            <span className="shrink-0 text-xs">· {getTypeLabel(item.type)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Tier. First, because everything below depends on it. */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Reach
            </Label>
            <div className="grid gap-3 sm:grid-cols-2 sm:items-start">

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
              navy
            >
              {isExtreme && (
                <ul className="mt-3 space-y-1.5 border-t border-up-border-on-navy pt-3">
                  {EXTREME_PERKS.map((perk) => (
                    <li key={perk.text} className="flex items-start gap-2">
                      <perk.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-up-lime" aria-hidden />
                      <span className="text-xs leading-relaxed text-up-on-navy-muted">
                        {perk.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </TierCard>
            </div>
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
            <Label htmlFor="duration" className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Duration
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Segmented pill for the common lengths; the field takes anything else. */}
              <div role="radiogroup" aria-label="Duration" className="flex flex-1 gap-1 overflow-x-auto rounded-full bg-up-fill p-1">
                {(isExtreme ? EXTREME_QUICK_DURATIONS : QUICK_DURATIONS).map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={effectiveDuration === n}
                    disabled={busy}
                    onClick={() => setDurationDays(n)}
                    className={cn(
                      'h-[34px] min-w-[52px] flex-1 whitespace-nowrap rounded-full px-2 text-[13px] font-semibold transition-colors',
                      effectiveDuration === n ? 'bg-up-solid text-up-on-solid' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {n}d
                  </button>
                ))}
              </div>
              <div className="relative sm:w-[120px]">
                <Input
                  id="duration"
                  type="number"
                  min={minDuration}
                  max={MAX_DURATION}
                  value={durationDays}
                  disabled={busy}
                  aria-label="Custom duration in days"
                  onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || minDuration)}
                  className="h-[42px] pr-12"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">days</span>
              </div>
            </div>
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
            <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Hero image <span className="normal-case tracking-normal">(optional)</span>
            </Label>
            {heroPreview ? (
              <div className="relative overflow-hidden rounded-up-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroPreview} alt="Hero preview" className="h-32 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setHeroFile(null)}
                  disabled={busy}
                  aria-label="Remove image"
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-card text-foreground shadow-up-pop"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-3.5 rounded-up-lg border-[1.5px] border-dashed border-up-border-hover bg-up-fill p-4 transition-colors hover:border-up-orange">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-up-md bg-card text-muted-foreground">
                  {compressing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-foreground">
                    {compressing ? 'Compressing image…' : 'Add a hero image'}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    JPEG, PNG, WebP or GIF · larger than 10MB is compressed for you
                  </span>
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
                    // Always prepared, not just when over the cap: the server
                    // keeps 1920x1080, so a bigger photo is only upload time.
                    setCompressing(true)
                    const result = await prepareImageUpload(file, IMAGE_TARGETS.promotionHero)
                    setCompressing(false)

                    if (!result.ok) {
                      toast.error(prepareErrorMessage(result, file, IMAGE_TARGETS.promotionHero))
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

        {/* No price, budget or wallet anywhere: the footer says so plainly. */}
        <DialogFooter className="border-t border-up-hairline pt-4 sm:justify-between">
          <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground sm:justify-start">
            <Check className="h-3.5 w-3.5 text-up-lime-ink dark:text-up-lime" strokeWidth={3} />
            No fees — promotions are granted, never billed
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting} className="h-11">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy} className="h-11 px-6">
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
