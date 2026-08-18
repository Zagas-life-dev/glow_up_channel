/**
 * The countries the platform actually covers.
 *
 * `countries.ts` knows about every country on earth because listings, profiles
 * and CDN headers can name any of them and all of it has to normalize. This is
 * the much shorter list of places UP sources content for — what the country
 * picker offers, and what "we cover you" means.
 *
 * Order is the platform's coverage priority, not alphabetical, and is preserved
 * exactly as given. Notably Nigeria sits after the seven focus countries
 * despite being the largest source: it carries many times their listings and
 * leads the run otherwise.
 *
 * The regional grouping here is the platform's own, and deliberately differs
 * from the UN M49 subregions in `countries.ts` — Zambia and Malawi are grouped
 * as Southern Africa here but are Eastern Africa geographically, and Angola is
 * Southern here but Central there. The geographic subregions still drive the
 * proximity ladder; this grouping only labels the picker.
 */

import { countryByCode, type Country } from "@/lib/geo/countries"

export type SupportedRegion =
  | "west-africa"
  | "east-africa"
  | "southern-africa"
  | "central-africa"

export type SupportedCountry = {
  code: string
  region: SupportedRegion
  /**
   * One of the seven countries the platform leads with. Kept because it is the
   * documented intent; nothing in the ranking layer reads it yet.
   */
  focus: boolean
}

/** In coverage-priority order. Index is the priority. */
export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  // West Africa — 16. First seven are the focus set.
  { code: "GH", region: "west-africa", focus: true },
  { code: "SN", region: "west-africa", focus: true },
  { code: "CI", region: "west-africa", focus: true },
  { code: "CV", region: "west-africa", focus: true },
  { code: "BJ", region: "west-africa", focus: true },
  { code: "TG", region: "west-africa", focus: true },
  { code: "SL", region: "west-africa", focus: true },
  { code: "NG", region: "west-africa", focus: false },
  { code: "LR", region: "west-africa", focus: false },
  { code: "GM", region: "west-africa", focus: false },
  { code: "BF", region: "west-africa", focus: false },
  { code: "ML", region: "west-africa", focus: false },
  { code: "GN", region: "west-africa", focus: false },
  { code: "NE", region: "west-africa", focus: false },
  { code: "GW", region: "west-africa", focus: false },
  { code: "MR", region: "west-africa", focus: false },

  // East Africa — 5
  { code: "KE", region: "east-africa", focus: false },
  { code: "TZ", region: "east-africa", focus: false },
  { code: "UG", region: "east-africa", focus: false },
  { code: "RW", region: "east-africa", focus: false },
  { code: "ET", region: "east-africa", focus: false },

  // Southern Africa — 7. South Africa is deliberately excluded.
  { code: "ZM", region: "southern-africa", focus: false },
  { code: "ZW", region: "southern-africa", focus: false },
  { code: "BW", region: "southern-africa", focus: false },
  { code: "NA", region: "southern-africa", focus: false },
  { code: "MZ", region: "southern-africa", focus: false },
  { code: "MW", region: "southern-africa", focus: false },
  { code: "AO", region: "southern-africa", focus: false },

  // Central Africa — 5
  { code: "CD", region: "central-africa", focus: false },
  { code: "CM", region: "central-africa", focus: false },
  { code: "CG", region: "central-africa", focus: false },
  { code: "GA", region: "central-africa", focus: false },
  { code: "TD", region: "central-africa", focus: false },
]

export const SUPPORTED_CODES: ReadonlySet<string> = new Set(
  SUPPORTED_COUNTRIES.map((entry) => entry.code),
)

const BY_CODE = new Map(SUPPORTED_COUNTRIES.map((entry) => [entry.code, entry]))

export function isSupportedCountry(code: string | null | undefined): boolean {
  return Boolean(code && SUPPORTED_CODES.has(code.toUpperCase()))
}

export function supportedEntry(code: string | null | undefined): SupportedCountry | null {
  if (!code) return null
  return BY_CODE.get(code.toUpperCase()) ?? null
}

/** Coverage priority, or `Infinity` for anywhere we do not cover. */
export function coveragePriority(code: string | null | undefined): number {
  if (!code) return Infinity
  const index = SUPPORTED_COUNTRIES.findIndex((e) => e.code === code.toUpperCase())
  return index === -1 ? Infinity : index
}

/** Display order of the picker's groups. */
export const SUPPORTED_REGION_ORDER: SupportedRegion[] = [
  "west-africa",
  "east-africa",
  "southern-africa",
  "central-africa",
]

export type SupportedGroup = {
  region: SupportedRegion
  countries: Country[]
}

/**
 * The picker's contents: supported countries resolved to full records, grouped
 * by region, each group in coverage-priority order.
 *
 * Built once — the list is static.
 */
export const SUPPORTED_GROUPS: SupportedGroup[] = SUPPORTED_REGION_ORDER.map(
  (region) => ({
    region,
    countries: SUPPORTED_COUNTRIES.filter((entry) => entry.region === region)
      .map((entry) => countryByCode(entry.code))
      .filter((country): country is Country => country !== null),
  }),
).filter((group) => group.countries.length > 0)
