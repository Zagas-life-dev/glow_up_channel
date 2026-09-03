/**
 * The currencies a listing can be priced in.
 *
 * Scoped to the 33 countries in `lib/geo/supported.ts` — 23 distinct local
 * currencies, because XOF covers eight West African countries and XAF covers
 * four Central African ones — plus USD, EUR and GBP, which is what EU- and
 * UK-funded scholarships and grants are actually denominated in.
 *
 * `decimals` is the ISO 4217 minor unit, and it is load-bearing rather than
 * cosmetic: XOF, XAF, GNF, RWF and UGX have no subunit, so "1,500.00 CFA" is
 * not a formatting preference, it is wrong. Conversion rounds to this too, so
 * switching a 50,000 NGN salary to XOF yields a whole number of francs.
 *
 * Symbols are the local convention, not the Unicode currency sign, because a
 * Kenyan reading "KSh 45,000" recognises it and "Sh 45,000" reads as a typo.
 * Where several countries share a symbol ($ for LRD and NAD) the code is what
 * disambiguates, which is why every display path prints the code as well.
 */

import { SUPPORTED_COUNTRIES } from "@/lib/geo/supported"

export type CurrencyCode = string

export type Currency = {
  code: CurrencyCode
  /** English name, as it appears in the picker. */
  name: string
  /** Local convention, e.g. "₦" — never shown without the code beside it. */
  symbol: string
  /** ISO 4217 minor units. 0 for the CFA francs, GNF, RWF and UGX. */
  decimals: number
  /** True for USD/EUR/GBP — grouped separately in the picker. */
  international: boolean
}

/**
 * Local currencies, in the coverage-priority order of the countries that use
 * them, so the picker leads with what most posters actually need.
 */
export const CURRENCIES: Currency[] = [
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", decimals: 2, international: false },
  { code: "XOF", name: "West African CFA Franc", symbol: "CFA", decimals: 0, international: false },
  { code: "CVE", name: "Cape Verdean Escudo", symbol: "Esc", decimals: 2, international: false },
  { code: "SLE", name: "Sierra Leonean Leone", symbol: "Le", decimals: 2, international: false },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", decimals: 2, international: false },
  { code: "LRD", name: "Liberian Dollar", symbol: "L$", decimals: 2, international: false },
  { code: "GMD", name: "Gambian Dalasi", symbol: "D", decimals: 2, international: false },
  { code: "GNF", name: "Guinean Franc", symbol: "FG", decimals: 0, international: false },
  { code: "MRU", name: "Mauritanian Ouguiya", symbol: "UM", decimals: 2, international: false },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", decimals: 2, international: false },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", decimals: 2, international: false },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", decimals: 0, international: false },
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw", decimals: 0, international: false },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br", decimals: 2, international: false },
  { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK", decimals: 2, international: false },
  { code: "ZWG", name: "Zimbabwe Gold", symbol: "ZiG", decimals: 2, international: false },
  { code: "BWP", name: "Botswana Pula", symbol: "P", decimals: 2, international: false },
  { code: "NAD", name: "Namibian Dollar", symbol: "N$", decimals: 2, international: false },
  { code: "MZN", name: "Mozambican Metical", symbol: "MT", decimals: 2, international: false },
  { code: "MWK", name: "Malawian Kwacha", symbol: "MK", decimals: 2, international: false },
  { code: "AOA", name: "Angolan Kwanza", symbol: "Kz", decimals: 2, international: false },
  { code: "CDF", name: "Congolese Franc", symbol: "FC", decimals: 2, international: false },
  { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", decimals: 0, international: false },

  { code: "USD", name: "US Dollar", symbol: "$", decimals: 2, international: true },
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2, international: true },
  { code: "GBP", name: "British Pound", symbol: "£", decimals: 2, international: true },
]

/** The currency every amount is normalised against for cross-currency sorting. */
export const BASE_CURRENCY: CurrencyCode = "USD"

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]))

export const CURRENCY_CODES: ReadonlySet<CurrencyCode> = new Set(BY_CODE.keys())

export function currencyByCode(code: string | null | undefined): Currency | null {
  if (!code) return null
  return BY_CODE.get(code.toUpperCase().trim()) ?? null
}

export function isSupportedCurrency(code: string | null | undefined): boolean {
  return Boolean(code && CURRENCY_CODES.has(code.toUpperCase().trim()))
}

/**
 * ISO country code to the currency listings from there are priced in.
 *
 * Only the supported countries appear. A poster in an uncovered country falls
 * back to USD rather than to their own currency, because we hold no rate
 * confidence outside the coverage map.
 */
const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  // West Africa
  GH: "GHS",
  SN: "XOF",
  CI: "XOF",
  CV: "CVE",
  BJ: "XOF",
  TG: "XOF",
  SL: "SLE",
  NG: "NGN",
  LR: "LRD",
  GM: "GMD",
  BF: "XOF",
  ML: "XOF",
  GN: "GNF",
  NE: "XOF",
  GW: "XOF",
  MR: "MRU",

  // East Africa
  KE: "KES",
  TZ: "TZS",
  UG: "UGX",
  RW: "RWF",
  ET: "ETB",

  // Southern Africa
  ZM: "ZMW",
  ZW: "ZWG",
  BW: "BWP",
  NA: "NAD",
  MZ: "MZN",
  MW: "MWK",
  AO: "AOA",

  // Central Africa
  CD: "CDF",
  CM: "XAF",
  CG: "XAF",
  GA: "XAF",
  TD: "XAF",
}

/**
 * The currency to preselect for someone posting from `countryCode`.
 *
 * Falls back to USD for anywhere uncovered, and for a missing country — a
 * poster who has not told us where they are gets the one currency that means
 * the same thing everywhere.
 */
export function currencyForCountry(code: string | null | undefined): CurrencyCode {
  if (!code) return BASE_CURRENCY
  return COUNTRY_TO_CURRENCY[code.toUpperCase().trim()] ?? BASE_CURRENCY
}

/** Every country that prices in `currency`. Used to explain shared CFA codes. */
export function countriesUsingCurrency(currency: CurrencyCode): string[] {
  const target = currency.toUpperCase().trim()
  return Object.entries(COUNTRY_TO_CURRENCY)
    .filter(([, c]) => c === target)
    .map(([country]) => country)
}

/**
 * The picker's two groups: local currencies first in coverage-priority order,
 * then the three international ones.
 */
export const CURRENCY_GROUPS: { label: string; currencies: Currency[] }[] = [
  { label: "Local", currencies: CURRENCIES.filter((c) => !c.international) },
  { label: "International", currencies: CURRENCIES.filter((c) => c.international) },
]

/**
 * Sanity guard: every supported country must map to a currency in the catalog.
 *
 * Runs once at module load in development only. A country added to
 * `supported.ts` without a currency here would otherwise silently default its
 * posters to USD, which looks like a working feature until someone in Kigali
 * posts a salary.
 */
if (process.env.NODE_ENV !== "production") {
  const missing = SUPPORTED_COUNTRIES.filter(
    (entry) => !COUNTRY_TO_CURRENCY[entry.code],
  ).map((entry) => entry.code)
  if (missing.length > 0) {
    console.warn(
      `[currency] supported countries with no currency mapping: ${missing.join(", ")}`,
    )
  }
  const unmapped = Object.values(COUNTRY_TO_CURRENCY).filter((c) => !BY_CODE.has(c))
  if (unmapped.length > 0) {
    console.warn(`[currency] countries mapped to unknown currencies: ${unmapped.join(", ")}`)
  }
}
