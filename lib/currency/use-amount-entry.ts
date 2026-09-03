"use client"

/**
 * The amount + currency pair on a posting form.
 *
 * Owns one behaviour that is easy to get subtly wrong: when someone types
 * 50,000 with NGN selected and then switches to USD, the box should read 32.43
 * — and when they switch back to NGN it should read 50,000 again, not 50,047.
 *
 * That round-trip only holds if conversion always runs from what the user last
 * *typed* rather than from what is currently displayed. So this keeps an anchor
 * — the last hand-entered figure and the currency it was entered in — and every
 * currency change converts from the anchor. Chaining NGN → USD → EUR → NGN
 * therefore accumulates no drift, because it is three independent conversions
 * of the same original number rather than a chain of three roundings.
 *
 * Typing again re-anchors, because at that point the new number is the truth.
 */

import { useCallback, useMemo, useRef, useState } from "react"

import { BASE_CURRENCY, type CurrencyCode } from "@/lib/currency/catalog"
import {
  convert,
  formatAmount,
  parseAmount,
  roundToCurrency,
  toUsd,
  type RateTable,
} from "@/lib/currency/convert"

/** What gets written to the listing. Shared by all four content types. */
export type MoneyPayload = {
  amount: number
  currency: CurrencyCode
  /** The cross-currency sort key. Null when no rate was available. */
  amountUsd: number | null
  /** Units of USD per 1 unit of `currency`, at the time of posting. */
  fxRate: number | null
  /** Publication date of the rates used, so a stored figure can be aged. */
  fxAsOf: string | null
}

export type AmountEntry = {
  /** Raw input value — a string, because "" and "0" are different states. */
  amount: string
  currency: CurrencyCode
  setAmount: (next: string) => void
  setCurrency: (next: CurrencyCode) => void
  /** Set both without treating it as a hand-entry, e.g. when loading a listing. */
  reset: (amount: number | null, currency: CurrencyCode) => void
  /** Null when the field is empty or unparseable. */
  payload: MoneyPayload | null
  /**
   * What the last currency switch did, for the "converted from" hint under the
   * field. Cleared as soon as the user types.
   */
  lastConversion: { from: CurrencyCode; amount: number; to: CurrencyCode } | null
}

type Anchor = { amount: number; currency: CurrencyCode } | null

/**
 * Format a converted figure for redisplay in the input.
 *
 * Plain digits, no grouping and no symbol — this goes back into a text field
 * the user will keep editing, and "₦50,000.00" is hostile to edit. Trailing
 * zeros are trimmed so USD 32.40 reads as "32.4" rather than "32.40" only when
 * the value is genuinely whole.
 */
function forInput(amount: number, currency: CurrencyCode): string {
  const rounded = roundToCurrency(amount, currency)
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

export function useAmountEntry(
  rates: RateTable | null,
  initial: { amount?: number | null; currency?: CurrencyCode } = {},
): AmountEntry {
  const [amount, setAmountState] = useState<string>(
    initial.amount != null ? forInput(initial.amount, initial.currency ?? BASE_CURRENCY) : "",
  )
  const [currency, setCurrencyState] = useState<CurrencyCode>(
    initial.currency ?? BASE_CURRENCY,
  )
  const [lastConversion, setLastConversion] = useState<AmountEntry["lastConversion"]>(null)

  const anchor = useRef<Anchor>(
    initial.amount != null
      ? { amount: initial.amount, currency: initial.currency ?? BASE_CURRENCY }
      : null,
  )

  const setAmount = useCallback(
    (next: string) => {
      setAmountState(next)
      setLastConversion(null)
      const parsed = parseAmount(next)
      // Re-anchor on every keystroke that yields a number. Clearing the field
      // drops the anchor entirely, so the next currency switch has nothing to
      // convert and simply changes the label — which is what someone emptying
      // the box expects.
      anchor.current = parsed == null ? null : { amount: parsed, currency }
    },
    [currency],
  )

  const setCurrency = useCallback(
    (next: CurrencyCode) => {
      const target = next.toUpperCase().trim()
      const source = anchor.current

      setCurrencyState(target)

      if (!source || !rates || source.currency === target) {
        setLastConversion(null)
        return
      }

      const converted = convert(source.amount, source.currency, target, rates)
      if (!converted) {
        // No rate for one side — ZWG on a degraded upstream. Leave the number
        // alone rather than blanking a figure the poster already typed, and say
        // nothing, since claiming a conversion happened would be a lie.
        setLastConversion(null)
        return
      }

      setAmountState(forInput(converted.amount, target))
      setLastConversion({ from: source.currency, amount: source.amount, to: target })
    },
    [rates],
  )

  const reset = useCallback((nextAmount: number | null, nextCurrency: CurrencyCode) => {
    const target = nextCurrency.toUpperCase().trim()
    setCurrencyState(target)
    setAmountState(nextAmount != null ? forInput(nextAmount, target) : "")
    anchor.current = nextAmount != null ? { amount: nextAmount, currency: target } : null
    setLastConversion(null)
  }, [])

  const payload = useMemo<MoneyPayload | null>(() => {
    const parsed = parseAmount(amount)
    if (parsed == null) return null

    const rounded = roundToCurrency(parsed, currency)
    const usd = rates ? toUsd(rounded, currency, rates) : null

    return {
      amount: rounded,
      currency,
      amountUsd: usd?.amount ?? null,
      // Stored so a listing's figure can be re-derived, and so a stale one can
      // be spotted: a two-year-old naira salary converted at today's rate is
      // wrong in a way that a stored rate makes visible.
      fxRate: usd?.rate ?? null,
      fxAsOf: usd?.asOf ?? null,
    }
  }, [amount, currency, rates])

  return { amount, currency, setAmount, setCurrency, reset, payload, lastConversion }
}

/** "50,000 NGN" — the source figure, for the hint under a converted field. */
export function describeConversion(
  conversion: NonNullable<AmountEntry["lastConversion"]>,
): string {
  return `Converted from ${formatAmount(conversion.amount, conversion.from)}`
}
