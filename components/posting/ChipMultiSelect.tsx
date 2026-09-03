"use client"

/**
 * A short, fixed vocabulary picked as chips.
 *
 * Used for a listing's industries and its target audience — both are closed
 * lists of four to eight values drawn from what users already answer at
 * onboarding, which is small enough that a dropdown would hide the options
 * behind a click for no benefit.
 *
 * Deliberately not the tag input beside it: tags are open-ended and searchable,
 * these are not. Letting a poster type a new industry is what would break the
 * profile↔listing match this field exists to enable.
 */

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function ChipMultiSelect({
  label,
  helperText,
  options,
  groups,
  selected,
  onChange,
  max,
  disabled,
  className,
}: {
  label?: string
  helperText?: string
  /** A flat list. Ignored when `groups` is given. */
  options?: readonly string[]
  /** Grouped options, e.g. career stage and education level under one field. */
  groups?: { label: string; options: readonly string[] }[]
  selected: string[]
  onChange: (next: string[]) => void
  /** Selecting beyond this is refused rather than silently trimmed. */
  max?: number
  disabled?: boolean
  className?: string
}) {
  const resolved = groups ?? (options ? [{ label: "", options }] : [])
  const atLimit = max != null && selected.length >= max

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
      return
    }
    if (atLimit) return
    onChange([...selected, value])
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <div className="flex items-baseline justify-between gap-2">
          <Label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </Label>
          {max != null ? (
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {selected.length}/{max}
            </span>
          ) : null}
        </div>
      ) : null}

      {resolved.map((group) => (
        <div key={group.label} className="space-y-1.5">
          {group.label ? (
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
              {group.label}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {group.options.map((option) => {
              const isSelected = selected.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={disabled || (!isSelected && atLimit)}
                  onClick={() => toggle(option)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    // A chip that cannot be chosen should look unavailable rather
                    // than merely fail to respond.
                    !isSelected && atLimit && "cursor-not-allowed opacity-40 hover:border-border hover:text-muted-foreground",
                  )}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  )
}
