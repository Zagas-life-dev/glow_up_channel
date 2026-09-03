"use client"

/**
 * Amount + currency, with live conversion on currency change.
 *
 * One component for all four content types, because "salary", "award amount",
 * "ticket price" and "resource price" differ only in their label — they were
 * previously four hand-rolled inputs that each hardcoded NGN, and that is
 * exactly how the four money shapes drifted apart.
 *
 * The conversion itself lives in `useAmountEntry`; this is the presentation.
 * The two things it is careful about:
 *
 *  - It says when a figure was converted, and from what. A number that silently
 *    changes under someone who is mid-form reads as a bug, however correct it is.
 *  - It says when rates are stale. The committed fallback table can be months
 *    old, and a poster deserves to know the 32.43 they are about to publish was
 *    computed from a rate we are not confident in.
 */

import { useId } from "react"
import { Info, TriangleAlert } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CURRENCY_GROUPS, type CurrencyCode } from "@/lib/currency/catalog"
import { formatAmount } from "@/lib/currency/convert"
import { describeConversion, type AmountEntry } from "@/lib/currency/use-amount-entry"
import { cn } from "@/lib/utils"

/** Jobs and paid opportunities both need a rate period; events and resources do not. */
export const PAY_PERIODS = [
  { value: "hourly", label: "Per hour" },
  { value: "daily", label: "Per day" },
  { value: "weekly", label: "Per week" },
  { value: "monthly", label: "Per month" },
  { value: "annually", label: "Per year" },
  { value: "one-time", label: "One-time" },
] as const

export type PayPeriod = (typeof PAY_PERIODS)[number]["value"]

export function AmountCurrencyField({
  entry,
  label,
  placeholder = "Amount",
  period,
  onPeriodChange,
  ratesStale,
  className,
  inputClassName,
  disabled,
}: {
  entry: AmountEntry
  label?: string
  placeholder?: string
  /** Omit to hide the period select entirely (events, resources). */
  period?: PayPeriod | ""
  onPeriodChange?: (next: PayPeriod) => void
  ratesStale?: boolean
  className?: string
  inputClassName?: string
  disabled?: boolean
}) {
  const id = useId()
  const showPeriod = period !== undefined && Boolean(onPeriodChange)
  const usd = entry.payload?.amountUsd

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <Label
          htmlFor={id}
          className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
        >
          {label}
        </Label>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Input
          id={id}
          value={entry.amount}
          onChange={(e) => entry.setAmount(e.target.value)}
          placeholder={placeholder}
          inputMode="decimal"
          disabled={disabled}
          className={cn("h-10 min-w-0 flex-1 rounded-lg", inputClassName)}
        />

        <Select
          value={entry.currency}
          onValueChange={(next) => entry.setCurrency(next as CurrencyCode)}
          disabled={disabled}
        >
          <SelectTrigger
            aria-label="Currency"
            className={cn("h-10 w-[7.5rem] shrink-0 rounded-lg", inputClassName)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72 border-border bg-surface">
            {CURRENCY_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {group.label}
                </SelectLabel>
                {group.currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code} className="text-foreground">
                    <span className="font-medium">{currency.code}</span>
                    <span className="ml-2 text-muted-foreground">{currency.name}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {showPeriod ? (
          <Select
            value={period || undefined}
            onValueChange={(next) => onPeriodChange?.(next as PayPeriod)}
            disabled={disabled}
          >
            <SelectTrigger
              aria-label="Period"
              className={cn("h-10 w-32 shrink-0 rounded-lg", inputClassName)}
            >
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent className="border-border bg-surface">
              {PAY_PERIODS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-foreground">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {/* Why the number just changed. Only ever shown immediately after a
          currency switch — typing clears it. */}
      {entry.lastConversion ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          {describeConversion(entry.lastConversion)}. Edit it if the exact figure matters.
        </p>
      ) : null}

      {/* The stored sort key, surfaced so the poster can sanity-check it. A
          salary that reads as $3 when they meant $3,000 is catchable here and
          nowhere else. */}
      {usd != null && entry.currency !== "USD" ? (
        <p className="text-xs text-muted-foreground">
          Listed for comparison as {formatAmount(usd, "USD")}
        </p>
      ) : null}

      {ratesStale && entry.amount ? (
        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
          Live rates are unavailable, so conversions use a saved rate and may be
          out of date. Enter the amount in its own currency to be safe.
        </p>
      ) : null}
    </div>
  )
}
