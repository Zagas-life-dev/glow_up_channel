import { describe, expect, it } from "vitest"

import { CURRENCIES, currencyForCountry, currencyByCode } from "@/lib/currency/catalog"
import { SUPPORTED_COUNTRIES } from "@/lib/geo/supported"
import {
  convert,
  formatAmount,
  localEquivalent,
  parseAmount,
  roundToCurrency,
  toUsd,
  type RateTable,
} from "@/lib/currency/convert"

/** Rates in the shape the endpoint returns: units per 1 USD. */
const RATES: RateTable = {
  base: "USD",
  asOf: "2026-09-01",
  rates: {
    USD: 1,
    EUR: 0.86,
    GBP: 0.75,
    NGN: 1480,
    GHS: 10.4,
    KES: 129,
    XOF: 565,
    UGX: 3600,
  },
}

describe("roundToCurrency", () => {
  it("rounds to cents for two-decimal currencies", () => {
    expect(roundToCurrency(32.4321, "USD")).toBe(32.43)
    expect(roundToCurrency(450000.567, "NGN")).toBe(450000.57)
  })

  it("rounds the CFA francs and their zero-decimal siblings to whole units", () => {
    // Quoting a CFA salary to two decimals is a currency error, not precision.
    expect(roundToCurrency(18320.6, "XOF")).toBe(18321)
    expect(roundToCurrency(116750.4, "UGX")).toBe(116750)
  })
})

describe("convert", () => {
  it("converts through the USD base", () => {
    const result = convert(50000, "NGN", "USD", RATES)
    expect(result?.amount).toBe(33.78)
    expect(result?.currency).toBe("USD")
  })

  it("converts between two non-base currencies", () => {
    const result = convert(1000, "GHS", "KES", RATES)
    // 1000 GHS -> 96.15 USD -> 12,403.85 KES
    expect(result?.amount).toBeCloseTo(12403.85, 1)
  })

  it("is an identity for the same currency, without consulting the table", () => {
    const result = convert(50000, "ZWG", "ZWG", RATES)
    expect(result).toEqual({ amount: 50000, currency: "ZWG", rate: 1, asOf: RATES.asOf })
  })

  it("returns null rather than guessing when a rate is missing", () => {
    // ZWG is the realistic case: recently redenominated, not carried everywhere.
    expect(convert(100, "ZWG", "USD", RATES)).toBeNull()
    expect(convert(100, "USD", "ZWG", RATES)).toBeNull()
  })

  it("returns null for a non-finite amount", () => {
    expect(convert(Number.NaN, "NGN", "USD", RATES)).toBeNull()
  })

  it("records the rate actually applied", () => {
    const result = convert(1, "NGN", "USD", RATES)
    expect(result?.rate).toBeCloseTo(1 / 1480, 10)
  })
})

describe("round-tripping", () => {
  /**
   * The invariant the posting form depends on. Converting away and back must
   * not drift, which is only true because `useAmountEntry` re-converts from the
   * originally typed figure rather than from the displayed one. This asserts
   * the property that makes that strategy necessary: a naive chain does drift.
   */
  it("drifts when chained through the displayed value", () => {
    const away = convert(50000, "NGN", "USD", RATES)!
    const back = convert(away.amount, "USD", "NGN", RATES)!
    expect(back.amount).not.toBe(50000)
    expect(back.amount).toBeCloseTo(50000, -2)
  })

  it("is exact when re-converted from the original figure", () => {
    const original = 50000
    convert(original, "NGN", "USD", RATES)
    convert(original, "NGN", "EUR", RATES)
    const back = convert(original, "NGN", "NGN", RATES)!
    expect(back.amount).toBe(original)
  })
})

describe("toUsd", () => {
  it("produces the cross-currency sort key", () => {
    // The bug this field exists to fix: 450,000 NGN must not outrank 1,200 USD.
    const naira = toUsd(450000, "NGN", RATES)!
    const dollars = toUsd(1200, "USD", RATES)!
    expect(naira.amount).toBeLessThan(dollars.amount)
  })
})

describe("localEquivalent", () => {
  it("declines to convert a listing already in the viewer's currency", () => {
    // Otherwise the card renders "₦450,000" above "≈ ₦450,000".
    expect(localEquivalent(450000, "NGN", "NGN", RATES)).toBeNull()
  })

  it("declines when there is no amount, currency, or table", () => {
    expect(localEquivalent(null, "NGN", "GHS", RATES)).toBeNull()
    expect(localEquivalent(0, "NGN", "GHS", RATES)).toBeNull()
    expect(localEquivalent(450000, null, "GHS", RATES)).toBeNull()
    expect(localEquivalent(450000, "NGN", "GHS", null)).toBeNull()
  })

  it("converts across currencies", () => {
    const result = localEquivalent(450000, "NGN", "GHS", RATES)
    expect(result?.currency).toBe("GHS")
    expect(result?.amount).toBeCloseTo(3162.16, 1)
  })
})

describe("parseAmount", () => {
  it("accepts pasted, grouped and decorated input", () => {
    expect(parseAmount("450,000")).toBe(450000)
    expect(parseAmount("₦450,000")).toBe(450000)
    expect(parseAmount(" 32.43 ")).toBe(32.43)
  })

  it("distinguishes an unstated amount from zero", () => {
    // A job paying 0 and a job that did not state its pay are different listings.
    expect(parseAmount("")).toBeNull()
    expect(parseAmount("  ")).toBeNull()
    expect(parseAmount("abc")).toBeNull()
    expect(parseAmount("0")).toBe(0)
  })

  it("rejects negatives", () => {
    expect(parseAmount("-100")).toBeNull()
  })
})

describe("formatAmount", () => {
  it("prints the symbol and always the code", () => {
    // "$" alone is ambiguous across USD, LRD and NAD; "CFA" across XOF and XAF.
    expect(formatAmount(450000, "NGN")).toBe("₦450,000 NGN")
    expect(formatAmount(1200, "USD")).toBe("$1,200 USD")
  })

  it("can drop the code where context already supplies it", () => {
    expect(formatAmount(1200, "USD", { withCode: false })).toBe("$1,200")
  })

  it("does not throw on a currency the runtime may not know", () => {
    expect(() => formatAmount(100, "ZWG")).not.toThrow()
    expect(() => formatAmount(100, "SLE")).not.toThrow()
  })
})

describe("catalog", () => {
  it("maps every supported country to a currency in the catalog", () => {
    for (const country of SUPPORTED_COUNTRIES) {
      const code = currencyForCountry(country.code)
      expect(currencyByCode(code), `${country.code} -> ${code}`).not.toBeNull()
    }
  })

  it("falls back to USD outside the coverage map", () => {
    expect(currencyForCountry("FR")).toBe("USD")
    expect(currencyForCountry(null)).toBe("USD")
  })

  it("groups the eight XOF and four XAF countries onto shared codes", () => {
    expect(currencyForCountry("SN")).toBe("XOF")
    expect(currencyForCountry("CI")).toBe("XOF")
    expect(currencyForCountry("CM")).toBe("XAF")
    expect(currencyForCountry("TD")).toBe("XAF")
  })

  it("has no duplicate currency codes", () => {
    const codes = CURRENCIES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
