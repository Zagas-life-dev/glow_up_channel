/**
 * One draft shape in, four model-shaped payloads out.
 *
 * This exists because the same listing was previously assembled by hand in
 * three places — the provider posting sheet, the admin create-content form and
 * the work-with-us importer — and all three drifted from the models in
 * different ways. The create endpoints do `new Model({ ...req.body })` with no
 * normalisation and no unknown-key rejection, so every drift failed silently
 * and still returned 201: jobs sent `type` where the model reads `jobType` and
 * shipped with no type at all; opportunities sent `company` where the model
 * reads `provider`; resources sent `url` and `author`, neither of which exists
 * on the model.
 *
 * Building the payload in one audited place is the fix. The mapping table below
 * is the contract, and `payload.test.ts` asserts it against the real field
 * names rather than against a copy of them.
 *
 *   draft field        opportunity        job            event        resource
 *   ────────────────── ────────────────── ────────────── ──────────── ──────────
 *   organizationName   provider           company        organizer    (dropped)
 *   type               type + category    jobType        eventType    category
 *   money              financial + pricing pay + pricing price+pricing price+pricing
 *
 * `pricing` is the new canonical money object, written identically on all four
 * types. The legacy containers beside it are still written so the ~15 existing
 * read sites keep working; the models derive them from `pricing` so there is
 * still only one writer.
 */

import type { MoneyPayload } from "@/lib/currency/use-amount-entry"
import type { PayPeriod } from "@/components/posting/AmountCurrencyField"
import { BASE_CURRENCY } from "@/lib/currency/catalog"
import {
  cleanIndustrySectors,
  cleanTags,
  cleanTargetAudience,
  CAREER_STAGES,
  EDUCATION_LEVELS,
} from "@/lib/listings/taxonomy"

export type ListingKind = "opportunity" | "job" | "event" | "resource"

export type ListingLocation = {
  country?: string
  /** ISO code from the country picker — what the location ranker actually matches on. */
  countryCode?: string
  province?: string
  city?: string
  address?: string
  isRemote?: boolean
}

export type ListingDates = {
  applicationDeadline?: string
  startDate?: string
  endDate?: string
  registrationDeadline?: string
}

export type ListingDraft = {
  kind: ListingKind
  title: string
  description: string
  /** External link. For resources this becomes `paymentLink`, the model's link field. */
  url?: string
  /** Company, provider, organizer or creator — one field, four destinations. */
  organizationName?: string
  /** The per-kind type/category selection. */
  type?: string
  tags?: string[]
  industrySectors?: string[]
  targetAudience?: string[]
  location?: ListingLocation
  /** Null when the listing states no amount. Distinct from an amount of zero. */
  money?: MoneyPayload | null
  isPaid?: boolean
  period?: PayPeriod | ""
  dates?: ListingDates
  /** Free-text eligibility, opportunities only. Lands in `requirements.other`. */
  requirements?: string
  benefits?: string[]
  capacity?: number | null
  /** Resources: a premium resource is one behind a payment link. */
  isPremium?: boolean
  /** Admin and importer paths publish directly; providers submit for review. */
  isApproved?: boolean
  status?: "active" | "inactive" | "draft"
}

/** The canonical money object, written on all four content types. */
export type Pricing = {
  isPaid: boolean
  amount: number | null
  currency: string
  amountUsd: number | null
  fxRate: number | null
  fxAsOf: string | null
  period: string | null
  benefits: string[]
}

function text(value: string | undefined | null): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : ""
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * A form date ("2026-11-30") as an ISO instant.
 *
 * The models coerce with `toDateOrNull` and store real Dates, because Mongo
 * range queries are type-bracketed and a deadline left as a bare string is
 * invisible to every `{ $gte: <Date> }` filter the list endpoints run. Sending
 * a full ISO string keeps that coercion unambiguous across timezones.
 */
function isoDate(value: string | undefined | null): string | undefined {
  const raw = text(value ?? undefined)
  if (!raw) return undefined
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

function buildPricing(draft: ListingDraft): Pricing {
  const money = draft.money ?? null
  return {
    isPaid: Boolean(draft.isPaid),
    amount: money?.amount ?? null,
    // Never left unset. The models default an absent currency to USD while
    // every form used to hardcode NGN, so an amount with no currency read as
    // USD and the same amount with one read as naira.
    currency: money?.currency ?? BASE_CURRENCY,
    amountUsd: money?.amountUsd ?? null,
    fxRate: money?.fxRate ?? null,
    fxAsOf: money?.fxAsOf ?? null,
    period: text(draft.period || undefined) ?? null,
    benefits: Array.isArray(draft.benefits) ? draft.benefits.filter(Boolean) : [],
  }
}

function buildLocation(location: ListingLocation | undefined) {
  if (!location) return undefined
  const place = {
    country: text(location.country),
    countryCode: text(location.countryCode)?.toUpperCase(),
    province: text(location.province),
    city: text(location.city),
    address: text(location.address),
    isRemote: Boolean(location.isRemote),
  }
  // A wholly empty location object is worse than none: it overwrites whatever a
  // previous edit set and gives the ranker an object that looks populated.
  const hasPlace = place.country || place.province || place.city || place.address
  if (!hasPlace && !place.isRemote) return undefined
  return place
}

/**
 * The opportunity `requirements` object.
 *
 * The forms collect one free-text box, but the model expects a structured
 * object — so the old code assigned a string to it and every field read back as
 * null, losing the eligibility text entirely. The text now lands in `other`,
 * and the audience selections fill the two structured fields they are already
 * the correct vocabulary for.
 */
function buildRequirements(draft: ListingDraft) {
  const audience = cleanTargetAudience(draft.targetAudience)
  const careerStage = audience.find((v) => (CAREER_STAGES as readonly string[]).includes(v))
  const educationLevel = audience.find((v) => (EDUCATION_LEVELS as readonly string[]).includes(v))
  const other = text(draft.requirements)

  if (!other && !careerStage && !educationLevel) return undefined

  return {
    ...(educationLevel && { educationLevel }),
    ...(careerStage && { careerStage }),
    ...(other && { other }),
  }
}

function buildDates(dates: ListingDates | undefined) {
  if (!dates) return undefined
  const out = {
    ...(isoDate(dates.applicationDeadline) && {
      applicationDeadline: isoDate(dates.applicationDeadline),
    }),
    ...(isoDate(dates.startDate) && { startDate: isoDate(dates.startDate) }),
    ...(isoDate(dates.endDate) && { endDate: isoDate(dates.endDate) }),
    ...(isoDate(dates.registrationDeadline) && {
      registrationDeadline: isoDate(dates.registrationDeadline),
    }),
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * Build the request body for a listing.
 *
 * Returns exactly the keys the corresponding model reads — anything else would
 * be silently dropped by the controller, which is the failure mode this whole
 * module exists to prevent.
 */
export function buildListingPayload(draft: ListingDraft): Record<string, unknown> {
  const pricing = buildPricing(draft)
  const location = buildLocation(draft.location)
  const dates = buildDates(draft.dates)

  const common = {
    title: draft.title.trim(),
    description: draft.description.trim(),
    tags: cleanTags(draft.tags),
    industrySectors: cleanIndustrySectors(draft.industrySectors),
    targetAudience: cleanTargetAudience(draft.targetAudience),
    pricing,
    ...(draft.status && { status: draft.status }),
    ...(draft.isApproved !== undefined && { isApproved: draft.isApproved }),
  }

  switch (draft.kind) {
    case "opportunity": {
      const requirements = buildRequirements(draft)
      return {
        ...common,
        ...(text(draft.url) && { url: text(draft.url) }),
        // `provider`, not `company` — the model reads provider and the provider
        // form had been sending company, so every provider-posted opportunity
        // was published with no organisation name.
        ...(text(draft.organizationName) && { provider: text(draft.organizationName) }),
        ...(text(draft.type) && { type: text(draft.type), category: text(draft.type) }),
        ...(location && { location }),
        ...(dates && { dates }),
        ...(requirements && { requirements }),
        financial: {
          isPaid: pricing.isPaid,
          amount: pricing.amount,
          currency: pricing.currency,
          amountUsd: pricing.amountUsd,
          fxRate: pricing.fxRate,
          fxAsOf: pricing.fxAsOf,
          benefits: pricing.benefits,
        },
      }
    }

    case "job": {
      return {
        ...common,
        ...(text(draft.url) && { url: text(draft.url) }),
        ...(text(draft.organizationName) && { company: text(draft.organizationName) }),
        // `jobType`, not `type`. All three call sites sent `type`, so no job in
        // the database has ever had a type.
        ...(text(draft.type) && { jobType: text(draft.type) }),
        ...(location && { location }),
        ...(dates && { dates }),
        ...(pricing.benefits.length > 0 && { benefits: pricing.benefits }),
        pay: {
          isPaid: pricing.isPaid,
          amount: pricing.amount,
          currency: pricing.currency,
          amountUsd: pricing.amountUsd,
          fxRate: pricing.fxRate,
          fxAsOf: pricing.fxAsOf,
          period: pricing.period,
        },
      }
    }

    case "event": {
      return {
        ...common,
        ...(text(draft.url) && { url: text(draft.url) }),
        ...(text(draft.organizationName) && { organizer: text(draft.organizationName) }),
        ...(text(draft.type) && { eventType: text(draft.type) }),
        ...(location && { location }),
        ...(dates && { dates }),
        isPaid: pricing.isPaid,
        price: pricing.amount,
        currency: pricing.currency,
        priceUsd: pricing.amountUsd,
        ...(draft.capacity != null &&
          Number.isFinite(draft.capacity) &&
          draft.capacity >= 1 && { capacity: { maxAttendees: draft.capacity } }),
      }
    }

    case "resource": {
      return {
        ...common,
        ...(text(draft.type) && { category: text(draft.type) }),
        // The model has no `url` field — `paymentLink` is where a resource's
        // external link actually lives, misnamed but load-bearing. The admin
        // form used to send `url` as well, and it was dropped on every save.
        ...(text(draft.url) && { paymentLink: text(draft.url) }),
        isPremium: Boolean(draft.isPremium),
        price: pricing.amount,
        currency: pricing.currency,
        priceUsd: pricing.amountUsd,
      }
    }
  }
}
