/**
 * Phone dialling codes for the countries the platform covers.
 *
 * Deliberately scoped to `SUPPORTED_COUNTRIES` rather than every country on earth: the phone
 * picker should only offer places we actually operate in, the same way the country picker does.
 * If coverage expands, add the entry here and the picker follows automatically.
 *
 * `example` is a placeholder hint only — it is never validated against. Per-country national
 * number lengths vary by carrier and change over time, so validating against a hardcoded length
 * would reject valid numbers. Validation is deliberately generic: 6–14 digits after the code.
 */

import { countryByCode, type Country } from "@/lib/geo/countries"
import { SUPPORTED_COUNTRIES } from "@/lib/geo/supported"

export type DialEntry = {
  code: string
  dial: string
  /** Sample national number (no leading zero) shown as the input placeholder. */
  example: string
}

const DIAL_BY_CODE: Record<string, { dial: string; example: string }> = {
  // West Africa
  GH: { dial: "+233", example: "24 123 4567" },
  SN: { dial: "+221", example: "70 123 4567" },
  CI: { dial: "+225", example: "01 23 45 67 89" },
  CV: { dial: "+238", example: "991 12 34" },
  BJ: { dial: "+229", example: "90 01 23 45" },
  TG: { dial: "+228", example: "90 11 22 33" },
  SL: { dial: "+232", example: "76 123456" },
  NG: { dial: "+234", example: "801 234 5678" },
  LR: { dial: "+231", example: "77 012 3456" },
  GM: { dial: "+220", example: "301 2345" },
  BF: { dial: "+226", example: "70 12 34 56" },
  ML: { dial: "+223", example: "65 01 23 45" },
  GN: { dial: "+224", example: "621 12 34 56" },
  NE: { dial: "+227", example: "93 12 34 56" },
  GW: { dial: "+245", example: "955 012 345" },
  MR: { dial: "+222", example: "22 12 34 56" },

  // East Africa
  KE: { dial: "+254", example: "712 123456" },
  TZ: { dial: "+255", example: "621 234 567" },
  UG: { dial: "+256", example: "712 345678" },
  RW: { dial: "+250", example: "788 123 456" },
  ET: { dial: "+251", example: "911 234 567" },

  // Southern Africa
  ZM: { dial: "+260", example: "955 123456" },
  ZW: { dial: "+263", example: "71 234 5678" },
  BW: { dial: "+267", example: "71 123 456" },
  NA: { dial: "+264", example: "81 123 4567" },
  MZ: { dial: "+258", example: "82 123 4567" },
  MW: { dial: "+265", example: "991 23 45 67" },
  AO: { dial: "+244", example: "923 123 456" },

  // Central Africa
  CD: { dial: "+243", example: "991 234 567" },
  CM: { dial: "+237", example: "6 71 23 45 67" },
  CG: { dial: "+242", example: "06 123 4567" },
  GA: { dial: "+241", example: "06 03 12 34" },
  TD: { dial: "+235", example: "63 01 23 45" },
}

export type DialOption = DialEntry & { country: Country }

/** Every supported country with its dial code, in the platform's coverage-priority order. */
export const DIAL_OPTIONS: DialOption[] = SUPPORTED_COUNTRIES.flatMap((entry) => {
  const country = countryByCode(entry.code)
  const dial = DIAL_BY_CODE[entry.code]
  if (!country || !dial) return []
  return [{ code: entry.code, dial: dial.dial, example: dial.example, country }]
})

const OPTION_BY_CODE = new Map(DIAL_OPTIONS.map((option) => [option.code, option]))

export function dialOptionFor(code: string | null | undefined): DialOption | null {
  if (!code) return null
  return OPTION_BY_CODE.get(code.toUpperCase()) ?? null
}

/** The emoji flag for an ISO 3166-1 alpha-2 code, built from regional indicator symbols. */
export function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return ""
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  )
}

/** Digits only, with any leading zero (trunk prefix) removed. */
export function normalizeNationalNumber(input: string): string {
  return input.replace(/\D/g, "").replace(/^0+/, "")
}

/**
 * E.164-ish: dial code plus national digits. Not a full libphonenumber validation — just enough
 * to reject obvious nonsense while accepting every real number in our coverage.
 */
export function buildPhoneNumber(dial: string, national: string): string {
  return `${dial}${normalizeNationalNumber(national)}`
}

export function isValidNationalNumber(input: string): boolean {
  const digits = normalizeNationalNumber(input)
  return digits.length >= 6 && digits.length <= 14
}
