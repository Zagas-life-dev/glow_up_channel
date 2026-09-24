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
      <h1 className="font-display text-2xl font-bold leading-[1.2] text-foreground sm:text-[30px]">
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
        className="text-[13px] font-bold text-foreground"
      >
        {label}
        {optional ? <span className="ml-1.5 font-medium text-muted-foreground">— optional</span> : null}
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
    <div className="flex items-center gap-3.5 rounded-up-lg bg-up-lime-tint px-4 py-3.5">
      {value ? (
        <span className="shrink-0 font-display text-[22px] font-bold tabular-nums text-foreground">{value}</span>
      ) : null}
      <p className="min-w-0 text-[13px] leading-snug text-foreground">{children}</p>
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
    <div className={cn('grid gap-2.5', columns === 2 && 'sm:grid-cols-2')}>
      {options.map((option) => {
        const active = selected.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            aria-pressed={active}
            className={cn(
              // Selected fills navy with an orange check, so it reads without relying on colour alone.
              'flex min-h-14 items-center gap-3 rounded-up-lg border-[1.5px] px-4 py-3 text-left transition-colors',
              active
                ? 'border-up-navy bg-up-navy text-up-on-navy dark:border-up-orange dark:bg-[#141D4A]'
                : 'border-border bg-card text-foreground hover:border-up-border-hover',
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{option.label}</span>
              {option.hint ? (
                <span className={cn('mt-0.5 block text-xs', active ? 'text-up-on-navy-muted' : 'text-muted-foreground')}>
                  {option.hint}
                </span>
              ) : null}
            </span>
            <span
              aria-hidden
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors',
                active ? 'bg-up-orange text-up-navy' : 'shadow-[inset_0_0_0_1.5px_var(--up-border-hover)] text-transparent',
              )}
            >
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Shared input styling so every step's fields match. */
export const stepInputClass =
  'h-12 text-[15px] text-foreground placeholder:text-muted-foreground'
