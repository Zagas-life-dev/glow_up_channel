/**
 * Reading a listing's price, whichever shape it is stored in.
 *
 * Four content types, four historic containers — `pay` on jobs, `financial` on
 * opportunities, a flat `price`/`currency` pair on events and, since resources
 * gained a price, on those too. New writes carry the canonical `pricing` object
 * as well, but the database is full of documents that predate it, so every read
 * site needs one function that copes with all of them.
 *
 * That is not a cosmetic concern. The feed card previously read
 * `financial.amount || price` and never `pay.amount`, so a job's salary — the
 * single most load-bearing fact on a job card — appeared on no card anywhere.
 * And it printed the bare number with no currency, so "450000" could mean naira
 * or dollars and the reader had no way to tell.
 */

import type { CurrencyCode } from "@/lib/currency/catalog"
import { formatAmount, localEquivalent, type RateTable } from "@/lib/currency/convert"

/** The money-bearing fields a listing may carry, in any of its four shapes. */
export type PriceableListing = {
  pricing?: {
    isPaid?: boolean
    amount?: number | string | null
    currency?: string | null
    period?: string | null
  } | null
  pay?: { isPaid?: boolean; amount?: number | string | null; currency?: string | null; period?: string | null } | null
  financial?: { isPaid?: boolean; amount?: number | string | null; currency?: string | null } | null
  isPaid?: boolean
  isPremium?: boolean
  price?: number | string | null
  currency?: string | null
}

export type ListingMoney = {
  isPaid: boolean
  amount: number | null
  currency: CurrencyCode
  period: string | null
}

const PERIOD_LABEL: Record<string, string> = {
  hourly: "hr",
  daily: "day",
  weekly: "wk",
  monthly: "mo",
  annually: "yr",
  // Legacy spellings, still in the database from before the vocabulary was
  // unified. Rendering "/yearly" beside "/yr" would look like two different facts.
  yearly: "yr",
  month: "mo",
  year: "yr",
  "one-time": "",
}

function num(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * Pure. The canonical object wins; the legacy containers are consulted in the
 * order a given content type would have used them.
 */
export function readListingMoney(item: PriceableListing): ListingMoney {
  const amount =
    num(item.pricing?.amount) ??
    num(item.pay?.amount) ??
    num(item.financial?.amount) ??
    num(item.price)

  const currency = (
    item.pricing?.currency ||
    item.pay?.currency ||
    item.financial?.currency ||
    item.currency ||
    "USD"
  ).toUpperCase()

  const period = item.pricing?.period || item.pay?.period || null

  // A stated amount implies paid even when no flag says so — listings arrived
  // that way for as long as the amount field and the paid toggle were separate
  // optional inputs.
  const isPaid = Boolean(
    item.pricing?.isPaid ?? item.pay?.isPaid ?? item.financial?.isPaid ?? item.isPaid ?? item.isPremium,
  ) || amount !== null

  return { isPaid, amount, currency, period }
}

export type ListingPriceDisplay = {
  /** "₦450,000 NGN / mo", or "Paid" when the amount is unstated. Null when free. */
  primary: string | null
  /** "≈ ₵3,400 GHS" in the viewer's own currency, or null. */
  approx: string | null
}

/**
 * Format a listing's price for display, as posted, with an approximate local
 * equivalent beside it.
 *
 * The figure as posted is always the primary one. Converting it outright would
 * mean a salary shown in a currency the employer never quoted, drifting with a
 * rate we refresh daily — accurate enough to be useful as a hint, not accurate
 * enough to be the number someone negotiates against.
 */
export function formatListingPrice(
  item: PriceableListing,
  viewerCurrency: CurrencyCode | null,
  rates: RateTable | null,
): ListingPriceDisplay {
  const money = readListingMoney(item)
  if (!money.isPaid) return { primary: null, approx: null }

  if (money.amount === null) return { primary: "Paid", approx: null }

  const suffix = money.period ? PERIOD_LABEL[money.period] ?? money.period : ""
  const primary = `${formatAmount(money.amount, money.currency, { withCode: false })}${suffix ? ` / ${suffix}` : ""}`

  const converted = localEquivalent(money.amount, money.currency, viewerCurrency, rates)
  const approx = converted
    ? `≈ ${formatAmount(converted.amount, converted.currency, { withCode: false })}${suffix ? ` / ${suffix}` : ""}`
    : null

  return { primary, approx }
}
