/**
 * Converting and formatting listing amounts.
 *
 * Pure and React-free, so the rounding rules can be tested directly rather than
 * through a form. Every rate in a `RateTable` is expressed as units per 1 USD,
 * which is what open.er-api.com returns and what keeps conversion a single
 * divide-then-multiply instead of a matrix.
 *
 * The rule that matters most here is that conversion is lossy and we say so.
 * 50,000 NGN converted to USD and back does not return 50,000 — it returns
 * 50,047 — because the intermediate rounds to cents. The posting form works
 * around that by remembering what was originally typed (see `useAmountEntry`);
 * everything else treats a converted number as an approximation and labels it.
 */

import {
  BASE_CURRENCY,
  currencyByCode,
  type CurrencyCode,
} from "@/lib/currency/catalog"

/** Units of each currency per 1 USD. */
export type RateTable = {
  base: CurrencyCode
  /** ISO date the rates were published, not the date we fetched them. */
  asOf: string
  rates: Record<CurrencyCode, number>
  /** True when serving the committed fallback table rather than live rates. */
  stale?: boolean
}

export type Converted = {
  amount: number
  currency: CurrencyCode
  /** Units of `to` per 1 unit of `from`, before rounding. Stored on listings. */
  rate: number
  asOf: string
}

/**
 * Round to a currency's minor unit.
 *
 * XOF and its four zero-decimal siblings round to whole francs — quoting a CFA
 * salary to two decimals is not precision, it is a currency error.
 */
export function roundToCurrency(amount: number, currency: CurrencyCode): number {
  const decimals = currencyByCode(currency)?.decimals ?? 2
  const factor = 10 ** decimals
  return Math.round(amount * factor) / factor
}

/**
 * `amount` of `from`, expressed in `to`.
 *
 * Returns null rather than guessing when either currency is missing from the
 * table — a listing priced in a currency we hold no rate for should show its
 * own figure unconverted, not a fabricated one. ZWG is the realistic case:
 * newly redenominated and not carried by every provider.
 */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  table: RateTable,
): Converted | null {
  if (!Number.isFinite(amount)) return null

  const fromCode = from.toUpperCase().trim()
  const toCode = to.toUpperCase().trim()

  if (fromCode === toCode) {
    return { amount: roundToCurrency(amount, toCode), currency: toCode, rate: 1, asOf: table.asOf }
  }

  const fromRate = table.rates[fromCode]
  const toRate = table.rates[toCode]
  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) return null

  const rate = toRate / fromRate
  return {
    amount: roundToCurrency(amount * rate, toCode),
    currency: toCode,
    rate,
    asOf: table.asOf,
  }
}

/**
 * The USD baseline stored alongside every listing amount.
 *
 * This is what makes "highest paying jobs" answerable across 26 currencies —
 * without it, sorting compares 450,000 NGN against 1,200 USD as raw numbers and
 * ranks the naira salary 375x higher.
 */
export function toUsd(
  amount: number,
  currency: CurrencyCode,
  table: RateTable,
): Converted | null {
  return convert(amount, currency, BASE_CURRENCY, table)
}

/**
 * "₦450,000" — symbol plus grouped digits, at the currency's own precision.
 *
 * Uses `Intl.NumberFormat` for grouping and falls back to a manual join when a
 * runtime does not recognise a code. ZWG and SLE are both recent enough that
 * older Node and Safari builds throw on them, and a thrown formatter in a feed
 * card blanks the whole card.
 */
export function formatAmount(
  amount: number,
  currency: CurrencyCode,
  options: { withCode?: boolean; locale?: string } = {},
): string {
  const { withCode = true, locale = "en" } = options
  const meta = currencyByCode(currency)
  const decimals = meta?.decimals ?? 2
  const code = currency.toUpperCase().trim()

  let digits: string
  try {
    digits = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(amount)
  } catch {
    digits = amount.toFixed(decimals)
  }

  const symbol = meta?.symbol
  if (!symbol) return `${code} ${digits}`

  // The code always rides along: "$" alone is ambiguous across USD, LRD and NAD,
  // and "CFA" alone across XOF and XAF.
  const body = `${symbol}${digits}`
  return withCode ? `${body} ${code}` : body
}

/** "≈ ₵3,400 GHS" — the secondary line on a card, never the primary figure. */
export function formatApprox(
  amount: number,
  currency: CurrencyCode,
  options: { locale?: string } = {},
): string {
  return `≈ ${formatAmount(amount, currency, { withCode: true, locale: options.locale })}`
}

/**
 * A listing's stored money, converted for a viewer, or null when there is
 * nothing honest to show.
 *
 * Deliberately refuses to convert when the listing is already in the viewer's
 * currency — the caller would otherwise render "₦450,000" and "≈ ₦450,000"
 * one above the other.
 */
export function localEquivalent(
  amount: number | null | undefined,
  currency: CurrencyCode | null | undefined,
  viewerCurrency: CurrencyCode | null | undefined,
  table: RateTable | null,
): Converted | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null
  if (!currency || !viewerCurrency || !table) return null
  if (currency.toUpperCase().trim() === viewerCurrency.toUpperCase().trim()) return null
  return convert(amount, currency, viewerCurrency, table)
}

/**
 * Parse what someone typed into an amount field.
 *
 * Accepts grouped input ("450,000"), stray currency symbols and whitespace,
 * because people paste salaries out of job descriptions. Returns null for
 * anything that is not a positive finite number, which the caller treats as
 * "no amount given" rather than as zero — a job paying 0 and a job that did not
 * state its pay are different listings.
 */
export function parseAmount(input: string | number | null | undefined): number | null {
  if (input == null) return null
  if (typeof input === "number") {
    return Number.isFinite(input) && input >= 0 ? input : null
  }
  const cleaned = input.replace(/[^\d.,-]/g, "").replace(/,/g, "")
  if (!cleaned || cleaned === "." || cleaned === "-") return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  return value
}
