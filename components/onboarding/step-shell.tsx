'use client'

/**
 * Shared furniture for every onboarding step.
 *
 * Before this, each step styled its own heading, its own option buttons and its own colours —
 * several of them with hardcoded `bg-gray-50` / `text-gray-700`, which meant onboarding was the
 * one flow in the app that broke in dark mode. Steps now describe *what* they ask; this file
 * decides how it looks.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

/** Question and the reason it is being asked. Every step opens with one. */
export function StepHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-7">
      <h1 className="text-[1.75rem] font-bold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

/** A labelled input row. `optional` is the only way a field is ever allowed to be skipped. */
export function StepField({
  label,
  htmlFor,
  optional = false,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  optional?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        {label}
        {optional ? <span className="ml-1.5 font-normal normal-case tracking-normal opacity-70">— optional</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  )
}

/**
 * The payoff box — what answering this question actually unlocks. Concrete beats
 * encouraging: a number the user can hold onto is worth more than "this helps us
 * personalise your experience".
 */
export function StepPayoff({
  value,
  children,
}: {
  value?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-primary/25 bg-primary/[0.07] px-4 py-3.5">
      {value ? (
        <span className="shrink-0 text-lg font-bold tabular-nums text-primary">{value}</span>
      ) : null}
      <p className="min-w-0 text-[13px] leading-snug text-foreground/90">{children}</p>
    </div>
  )
}

/**
 * Multi- or single-select options. One visual language for interests, industries,
 * aspirations, education level and career stage, which previously had three.
 */
export function OptionGrid({
  options,
  selected,
  onToggle,
  columns = 1,
}: {
  options: readonly { value: string; label: string; hint?: string }[]
  selected: string[]
  onToggle: (value: string) => void
  columns?: 1 | 2
}) {
  return (
    <div className={cn('grid gap-2', columns === 2 && 'sm:grid-cols-2')}>
      {options.map((option) => {
        const active = selected.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            aria-pressed={active}
            className={cn(
              'flex min-h-[3.25rem] items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
              active
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-border hover:bg-muted/50',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                active ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
              )}
            >
              {active ? (
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block text-sm font-medium', active ? 'text-foreground' : 'text-foreground/90')}>
                {option.label}
              </span>
              {option.hint ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Shared input styling so every step's fields match. */
export const stepInputClass =
  'h-12 rounded-xl border-border bg-card text-[15px] text-foreground placeholder:text-muted-foreground/70'
