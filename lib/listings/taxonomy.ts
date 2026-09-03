/**
 * The vocabularies a listing is tagged with.
 *
 * Every list here is deliberately identical to one the user already answers
 * during onboarding. That is the whole point: `industrySectors` on a listing is
 * only a ranking signal if it draws from the same six values as
 * `industrySectors` on a profile, and `targetAudience` only matches if it uses
 * the same career stages and education levels the user picked for themselves.
 * A parallel vocabulary — however sensible — turns matching back into fuzzy
 * string work.
 *
 * Source of truth for the values: `lib/onboarding-utils.ts` and the step
 * components beside it. If a value changes there, it must change here, which is
 * what the parity test in `taxonomy.test.ts` enforces.
 */

/** Mirrors `components/onboarding/industry-step.tsx`. */
export const INDUSTRY_SECTORS = [
  "Technology",
  "Creative Arts & Media",
  "Business & Finance",
  "Healthcare & Sciences",
  "Education & Training",
  "Government & Public Service",
] as const

export type IndustrySector = (typeof INDUSTRY_SECTORS)[number]

/** Mirrors the `careerStageMap` values in `lib/onboarding-utils.ts`. */
export const CAREER_STAGES = [
  "Student",
  "Entry-Level (0-2 years)",
  "Mid-Career (3-7 years)",
  "Senior/Executive (8+ years)",
] as const

export type CareerStage = (typeof CAREER_STAGES)[number]

/** Mirrors the `educationLevelMap` values in `lib/onboarding-utils.ts`. */
export const EDUCATION_LEVELS = [
  "High School",
  "Undergraduate",
  "Graduate",
  "Professional",
] as const

export type EducationLevel = (typeof EDUCATION_LEVELS)[number]

/**
 * What a listing's `targetAudience` may contain: career stages and education
 * levels in one flat list, because the field is one array on the model and a
 * poster thinks of "students" and "undergraduates" as the same kind of answer.
 *
 * They stay distinguishable — `CAREER_STAGES` and `EDUCATION_LEVELS` are
 * exported separately so the form can group them and the ranker can score a
 * career-stage match differently from an education match.
 */
export const TARGET_AUDIENCE = [...CAREER_STAGES, ...EDUCATION_LEVELS] as const

export type TargetAudience = (typeof TARGET_AUDIENCE)[number]

export const TARGET_AUDIENCE_GROUPS: { label: string; options: readonly string[] }[] = [
  { label: "Career stage", options: CAREER_STAGES },
  { label: "Education level", options: EDUCATION_LEVELS },
]

const INDUSTRY_SET: ReadonlySet<string> = new Set(INDUSTRY_SECTORS)
const AUDIENCE_SET: ReadonlySet<string> = new Set(TARGET_AUDIENCE)

/**
 * Drop anything not in the vocabulary.
 *
 * Applied on the way into a payload rather than trusted from the form, because
 * these arrays also arrive from the admin editor, the work-with-us importer and
 * legacy documents, and one free-text value is enough to make a facet count
 * wrong forever.
 */
export function cleanIndustrySectors(values: unknown): string[] {
  return asArray(values).filter((v) => INDUSTRY_SET.has(v))
}

export function cleanTargetAudience(values: unknown): string[] {
  return asArray(values).filter((v) => AUDIENCE_SET.has(v))
}

function asArray(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    if (typeof value !== "string") continue
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

/**
 * Free-text tags: trimmed, de-duplicated, capped at the documented limit of 10.
 *
 * Normalises before de-duplicating, not after. `asArray` compares raw values,
 * so "#react" and "react " are two distinct entries to it — and stripping the
 * hash afterwards left the listing carrying "react" twice, which double-counts
 * in every tag facet.
 */
export function cleanTags(values: unknown): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of asArray(values)) {
    const tag = raw.replace(/^#+/, "").trim()
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tag)
    if (out.length === 10) break
  }
  return out
}
