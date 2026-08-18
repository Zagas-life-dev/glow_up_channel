import { getSiteUrl } from "@/lib/site-url"
import { BRAND } from "./brand"
import type {
  SeoEvent,
  SeoJob,
  SeoLocation,
  SeoOpportunity,
  SeoResource,
} from "./content-types"

/**
 * schema.org JSON-LD builders.
 *
 * These are the machine-readable copy of each listing. Search engines use them
 * for rich results, and answer engines (ChatGPT, Perplexity, Claude, AI
 * Overviews) read them to answer "what events can I attend" style questions —
 * so every fact a user might ask about (when, where, cost, deadline, who runs
 * it, who is eligible) belongs here, not only in the rendered page.
 */

export type JsonLdObject = Record<string, unknown>

const ORG_NAME = BRAND.name

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Drop null/undefined/empty values so we never emit hollow JSON-LD keys. */
function compact<T extends JsonLdObject>(obj: T): T {
  const out: JsonLdObject = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    if (typeof v === "string" && v.trim() === "") continue
    if (Array.isArray(v) && v.length === 0) continue
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) {
      continue
    }
    out[k] = v
  }
  return out as T
}

/** schema.org date fields must be ISO 8601; anything unparseable is omitted. */
function isoDate(value?: string | null): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

/** Strip markup and collapse whitespace; JSON-LD descriptions must be plain text. */
export function plainText(value?: string | null, max = 5000): string | undefined {
  if (!value) return undefined
  const text = String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!text) return undefined
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${path}`
}

/** Only pass through image URLs that are already absolute and fetchable. */
function imageUrl(value?: string | null): string | undefined {
  if (!value) return undefined
  const v = String(value).trim()
  if (!v) return undefined
  if (v.startsWith("http://") || v.startsWith("https://")) return v
  if (v.startsWith("/")) return absoluteUrl(v)
  return undefined
}

function keywords(...groups: (string[] | undefined)[]): string | undefined {
  const all = groups
    .flatMap((g) => g ?? [])
    .map((t) => String(t).trim())
    .filter(Boolean)
  const unique = Array.from(new Set(all))
  return unique.length ? unique.join(", ") : undefined
}

/**
 * Build an Offer without ever emitting a currency we have no price for.
 *
 * A `priceCurrency` with no `price` is an invalid Offer and gets flagged by
 * structured-data validators, which is easy to hit here: several records are
 * marked paid while leaving the amount blank. In that case we describe
 * availability only and stay silent about cost.
 */
function buildOffer(opts: {
  url: string
  isFree: boolean
  price?: number | null
  currency?: string | null
  validThrough?: string
}): JsonLdObject {
  const priced = !opts.isFree && typeof opts.price === "number"
  return compact({
    "@type": "Offer",
    url: opts.url,
    price: opts.isFree ? 0 : priced ? opts.price : undefined,
    priceCurrency: opts.isFree ? undefined : priced ? (opts.currency ?? "USD") : undefined,
    availability: "https://schema.org/InStock",
    validThrough: opts.validThrough,
    category: opts.isFree ? "Free" : "Paid",
  })
}

function postalAddress(loc?: SeoLocation): JsonLdObject | undefined {
  if (!loc) return undefined
  const address = compact({
    "@type": "PostalAddress",
    streetAddress: loc.address ?? undefined,
    addressLocality: loc.city ?? undefined,
    addressRegion: loc.province ?? undefined,
    addressCountry: loc.country ?? undefined,
  })
  // "@type" alone means we learned no actual address parts.
  return Object.keys(address).length > 1 ? address : undefined
}

function placeName(loc?: SeoLocation): string | undefined {
  const parts = [loc?.city, loc?.province, loc?.country].filter(Boolean)
  return parts.length ? parts.join(", ") : undefined
}

/* -------------------------------------------------------------------------- */
/* Site-level graph                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Organization + WebSite, emitted once on the home page.
 * Establishes the publisher identity that item-level entities point back to.
 */
export function buildSiteJsonLd(): JsonLdObject {
  const site = getSiteUrl()
  return {
    "@context": "https://schema.org",
    "@graph": [
      compact({
        "@type": "Organization",
        "@id": `${site}/#organization`,
        name: BRAND.name,
        alternateName: [...BRAND.alternateName],
        legalName: BRAND.legalName,
        slogan: BRAND.slogan,
        url: site,
        description: BRAND.description,
        logo: compact({
          "@type": "ImageObject",
          url: absoluteUrl(BRAND.logo),
        }),
      }),
      compact({
        "@type": "WebSite",
        "@id": `${site}/#website`,
        name: BRAND.name,
        alternateName: [...BRAND.alternateName],
        url: site,
        publisher: { "@id": `${site}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${site}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      }),
    ],
  }
}

/** Publisher reference used by every item-level entity. */
function publisher(): JsonLdObject {
  return { "@id": `${getSiteUrl()}/#organization` }
}

/* -------------------------------------------------------------------------- */
/* Breadcrumbs                                                                */
/* -------------------------------------------------------------------------- */

export function buildBreadcrumbJsonLd(
  trail: { name: string; path: string }[],
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}

/* -------------------------------------------------------------------------- */
/* Event                                                                      */
/* -------------------------------------------------------------------------- */

function attendanceMode(loc?: SeoLocation): string {
  if (loc?.isHybrid) return "https://schema.org/MixedEventAttendanceMode"
  if (loc?.isRemote) return "https://schema.org/OnlineEventAttendanceMode"
  return "https://schema.org/OfflineEventAttendanceMode"
}

function eventLocation(event: SeoEvent): JsonLdObject | JsonLdObject[] | undefined {
  const loc = event.location
  const virtual = compact({
    "@type": "VirtualLocation",
    url: event.url ?? absoluteUrl(`/events/${event._id ?? ""}`),
  })
  const physical = compact({
    "@type": "Place",
    name: placeName(loc),
    address: postalAddress(loc),
  })
  const hasPhysical = Object.keys(physical).length > 1

  if (loc?.isHybrid) return hasPhysical ? [physical, virtual] : virtual
  if (loc?.isRemote) return virtual
  return hasPhysical ? physical : undefined
}

/**
 * schema.org/Event — the entity that makes an individual event answerable by
 * AI search ("free design events in Lagos this month") rather than merely
 * indexable.
 */
export function buildEventJsonLd(event: SeoEvent, id: string): JsonLdObject {
  const url = absoluteUrl(`/events/${id}`)
  const start = isoDate(event.dates?.startDate)
  // Treat as free only when explicitly unpaid, or when nothing suggests a cost.
  const isFree =
    event.isPaid === false || (event.isPaid === undefined && !event.price)

  return compact({
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${url}#event`,
    name: plainText(event.title, 200),
    description: plainText(event.description),
    url,
    image: imageUrl(event.image),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: attendanceMode(event.location),
    startDate: start,
    endDate: isoDate(event.dates?.endDate),
    location: eventLocation(event),
    organizer: event.organizer
      ? compact({ "@type": "Organization", name: plainText(event.organizer, 200) })
      : undefined,
    performer: event.organizer
      ? compact({ "@type": "Organization", name: plainText(event.organizer, 200) })
      : undefined,
    maximumAttendeeCapacity: event.capacity?.maxAttendees ?? undefined,
    typicalAgeRange: event.requirements?.ageRange ?? undefined,
    audience: event.targetAudience?.length
      ? compact({
          "@type": "Audience",
          audienceType: event.targetAudience.join(", "),
        })
      : undefined,
    about: event.eventType ?? undefined,
    keywords: keywords(event.tags, event.industrySectors, event.targetAudience),
    offers: buildOffer({
      url,
      isFree,
      price: event.price,
      currency: event.currency,
      validThrough: isoDate(event.dates?.registrationDeadline),
    }),
    isAccessibleForFree: isFree,
    publisher: publisher(),
  })
}

/* -------------------------------------------------------------------------- */
/* Job                                                                        */
/* -------------------------------------------------------------------------- */

const EMPLOYMENT_TYPES: Record<string, string> = {
  "full-time": "FULL_TIME",
  fulltime: "FULL_TIME",
  full_time: "FULL_TIME",
  "part-time": "PART_TIME",
  parttime: "PART_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  contractor: "CONTRACTOR",
  freelance: "CONTRACTOR",
  temporary: "TEMPORARY",
  internship: "INTERN",
  intern: "INTERN",
  volunteer: "VOLUNTEER",
  apprenticeship: "OTHER",
}

function employmentType(jobType?: string): string | undefined {
  if (!jobType) return undefined
  return EMPLOYMENT_TYPES[jobType.toLowerCase().trim()] ?? "OTHER"
}

/** Map the backend's pay period onto schema.org's QuantitativeValue unitText. */
const PAY_PERIODS: Record<string, string> = {
  hourly: "HOUR",
  hour: "HOUR",
  daily: "DAY",
  day: "DAY",
  weekly: "WEEK",
  week: "WEEK",
  monthly: "MONTH",
  month: "MONTH",
  annually: "YEAR",
  annual: "YEAR",
  yearly: "YEAR",
  year: "YEAR",
}

function baseSalary(pay?: SeoJob["pay"]): JsonLdObject | undefined {
  if (!pay?.amount) return undefined
  const unitText = pay.period
    ? PAY_PERIODS[pay.period.toLowerCase().trim()]
    : undefined
  return compact({
    "@type": "MonetaryAmount",
    currency: pay.currency ?? "USD",
    value: compact({
      "@type": "QuantitativeValue",
      value: pay.amount,
      unitText,
    }),
  })
}

/**
 * schema.org/JobPosting — required for Google Jobs eligibility and read
 * directly by AI assistants answering role/location/pay questions.
 */
export function buildJobJsonLd(job: SeoJob, id: string): JsonLdObject {
  const url = absoluteUrl(`/jobs/${id}`)
  const loc = job.location
  const remote = Boolean(loc?.isRemote)

  return compact({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "@id": `${url}#jobposting`,
    title: plainText(job.title, 200),
    name: plainText(job.title, 200),
    description: plainText(job.description),
    url,
    image: imageUrl(job.image),
    datePosted: isoDate(job.publishedAt ?? job.createdAt),
    validThrough: isoDate(job.dates?.applicationDeadline),
    employmentType: employmentType(job.jobType),
    hiringOrganization: compact({
      "@type": "Organization",
      name: plainText(job.company, 200) ?? ORG_NAME,
    }),
    jobLocationType: remote ? "TELECOMMUTE" : undefined,
    jobLocation: !remote
      ? (() => {
          const address = postalAddress(loc)
          return address ? { "@type": "Place", address } : undefined
        })()
      : undefined,
    applicantLocationRequirements:
      remote && loc?.country
        ? compact({ "@type": "Country", name: loc.country })
        : undefined,
    baseSalary: baseSalary(job.pay),
    jobBenefits: job.benefits?.length ? job.benefits.join(", ") : undefined,
    industry: job.industrySectors?.length
      ? job.industrySectors.join(", ")
      : undefined,
    keywords: keywords(job.tags, job.industrySectors, job.targetAudience),
    directApply: false,
    publisher: publisher(),
  })
}

/* -------------------------------------------------------------------------- */
/* Opportunity                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Opportunities cover scholarships, grants, fellowships, internships and
 * programs, which map onto three different schema.org types. Choosing the
 * closest one matters: a scholarship described as a generic WebPage will not
 * surface for funding questions.
 */
function opportunitySchemaType(o: SeoOpportunity): "MonetaryGrant" | "JobPosting" | "EducationalOccupationalProgram" {
  const hint = `${o.type ?? ""} ${o.category ?? ""}`.toLowerCase()
  if (/scholarship|grant|fund|award|bursary|prize/.test(hint)) return "MonetaryGrant"
  if (/internship|job|role|position|employment|volunteer/.test(hint)) {
    return "JobPosting"
  }
  return "EducationalOccupationalProgram"
}

/** Eligibility phrased as prose — the form assistants quote back to users. */
function eligibilityText(o: SeoOpportunity): string | undefined {
  const r = o.requirements
  if (!r) return undefined
  const parts = [
    r.Eligible_participants,
    r.educationLevel && `Education level: ${r.educationLevel}`,
    r.careerStage && `Career stage: ${r.careerStage}`,
    r.experience && `Experience: ${r.experience}`,
    r.ageRange && `Age range: ${r.ageRange}`,
    r.citizenship && `Citizenship: ${r.citizenship}`,
    r.skills?.length ? `Skills: ${r.skills.join(", ")}` : undefined,
    r.other,
  ].filter(Boolean)
  return parts.length ? plainText(parts.join(". ")) : undefined
}

export function buildOpportunityJsonLd(
  o: SeoOpportunity,
  id: string,
): JsonLdObject {
  const url = absoluteUrl(`/opportunities/${id}`)
  const type = opportunitySchemaType(o)
  const deadline = isoDate(o.dates?.applicationDeadline)
  const providerOrg = compact({
    "@type": "Organization",
    name: plainText(o.provider, 200) ?? ORG_NAME,
  })

  const common = {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${url}#opportunity`,
    name: plainText(o.title, 200),
    description: plainText(o.description),
    url,
    image: imageUrl(o.image),
    keywords: keywords(o.tags, o.industrySectors, o.targetAudience),
    publisher: publisher(),
  }

  if (type === "JobPosting") {
    const address = postalAddress(o.location)
    return compact({
      ...common,
      title: plainText(o.title, 200),
      datePosted: isoDate(o.publishedAt ?? o.createdAt),
      validThrough: deadline,
      hiringOrganization: providerOrg,
      employmentType: employmentType(o.type) ?? "OTHER",
      jobLocationType: o.location?.isRemote ? "TELECOMMUTE" : undefined,
      jobLocation:
        !o.location?.isRemote && address ? { "@type": "Place", address } : undefined,
      baseSalary: o.financial?.amount
        ? compact({
            "@type": "MonetaryAmount",
            currency: o.financial.currency ?? "USD",
            value: compact({
              "@type": "QuantitativeValue",
              value: o.financial.amount,
            }),
          })
        : undefined,
      qualifications: eligibilityText(o),
    })
  }

  if (type === "MonetaryGrant") {
    return compact({
      ...common,
      funder: providerOrg,
      sponsor: providerOrg,
      amount: o.financial?.amount
        ? compact({
            "@type": "MonetaryAmount",
            currency: o.financial.currency ?? "USD",
            value: o.financial.amount,
          })
        : undefined,
      eligibleRegion: o.location?.country
        ? compact({ "@type": "Country", name: o.location.country })
        : undefined,
      // Not a schema.org term, but widely consumed and harmless to emit.
      applicationDeadline: deadline,
      eligibilityCriteria: eligibilityText(o),
    })
  }

  return compact({
    ...common,
    provider: providerOrg,
    applicationDeadline: deadline,
    startDate: isoDate(o.dates?.startDate),
    endDate: isoDate(o.dates?.endDate),
    timeToComplete: o.dates?.duration ?? undefined,
    educationalCredentialAwarded: o.category ?? undefined,
    programPrerequisites: eligibilityText(o),
    occupationalCategory: o.industrySectors?.length
      ? o.industrySectors.join(", ")
      : undefined,
    offers: buildOffer({
      url,
      isFree: !o.financial?.isPaid,
      price: o.financial?.amount,
      currency: o.financial?.currency,
      validThrough: deadline,
    }),
  })
}

/* -------------------------------------------------------------------------- */
/* Resource                                                                   */
/* -------------------------------------------------------------------------- */

export function buildResourceJsonLd(r: SeoResource, id: string): JsonLdObject {
  const url = absoluteUrl(`/resources/${id}`)
  const free = !r.isPremium

  return compact({
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": `${url}#resource`,
    name: plainText(r.title, 200),
    description: plainText(r.description),
    url,
    learningResourceType: r.resourceType ?? r.category ?? undefined,
    educationalUse: r.category ?? undefined,
    isAccessibleForFree: free,
    encodingFormat: r.fileType ?? undefined,
    numberOfPages: r.pageCount ?? undefined,
    dateModified: isoDate(r.updatedAt),
    datePublished: isoDate(r.createdAt),
    keywords: keywords(r.tags),
    provider: publisher(),
    publisher: publisher(),
    // Premium resources are paid via an external link with no amount stored,
    // so only the free case can state a price.
    offers: buildOffer({ url, isFree: free }),
  })
}

/* -------------------------------------------------------------------------- */
/* Hub pages                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * ItemList for a listing hub. Gives crawlers and assistants a directory of the
 * individual detail URLs instead of an opaque, client-rendered feed.
 */
export function buildItemListJsonLd(
  name: string,
  description: string,
  path: string,
  items: { id: string; title?: string }[],
): JsonLdObject {
  return compact({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${absoluteUrl(path)}#collection`,
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: { "@id": `${getSiteUrl()}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`${path}/${item.id}`),
        name: plainText(item.title, 200),
      })),
    },
  })
}
