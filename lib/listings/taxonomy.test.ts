import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  CAREER_STAGES,
  EDUCATION_LEVELS,
  INDUSTRY_SECTORS,
  TARGET_AUDIENCE,
  cleanIndustrySectors,
  cleanTags,
  cleanTargetAudience,
} from "@/lib/listings/taxonomy"

/**
 * These vocabularies only work as ranking signals because they are the same
 * ones the user answers at onboarding — a listing tagged "Technology, Student"
 * matches a profile holding those exact strings, with no fuzzy matching in
 * between. Nothing in the type system enforces that, so this reads the
 * onboarding sources and asserts it directly. A value renamed there and not
 * here would otherwise silently stop matching.
 */
function readSource(relative: string): string {
  return readFileSync(path.resolve(__dirname, "../..", relative), "utf8")
}

describe("parity with the onboarding vocabularies", () => {
  it("uses exactly the industries offered at onboarding", () => {
    const source = readSource("components/onboarding/industry-step.tsx")
    for (const industry of INDUSTRY_SECTORS) {
      expect(source, `industry-step.tsx no longer offers "${industry}"`).toContain(
        `value: "${industry}"`,
      )
    }

    // And nothing extra: count the options block so a value added there without
    // being added here is caught too.
    const offered = [...source.matchAll(/\{ value: "([^"]+)", label:/g)].map((m) => m[1])
    expect([...INDUSTRY_SECTORS].sort()).toEqual(offered.sort())
  })

  it("uses exactly the career stages onboarding stores", () => {
    const source = readSource("lib/onboarding-utils.ts")
    for (const stage of CAREER_STAGES) {
      expect(source, `careerStageMap no longer produces "${stage}"`).toContain(`'${stage}'`)
    }
  })

  it("uses exactly the education levels onboarding stores", () => {
    const source = readSource("lib/onboarding-utils.ts")
    for (const level of EDUCATION_LEVELS) {
      expect(source, `educationLevelMap no longer produces "${level}"`).toContain(`'${level}'`)
    }
  })
})

describe("cleaning", () => {
  it("drops values outside the vocabulary", () => {
    expect(cleanIndustrySectors(["Technology", "Astrology", ""])).toEqual(["Technology"])
    expect(cleanTargetAudience(["Student", "wizards"])).toEqual(["Student"])
  })

  it("accepts every documented value", () => {
    expect(cleanIndustrySectors([...INDUSTRY_SECTORS])).toHaveLength(INDUSTRY_SECTORS.length)
    expect(cleanTargetAudience([...TARGET_AUDIENCE])).toHaveLength(TARGET_AUDIENCE.length)
  })

  it("survives non-arrays and non-strings", () => {
    expect(cleanIndustrySectors(null)).toEqual([])
    expect(cleanIndustrySectors("Technology")).toEqual([])
    expect(cleanTargetAudience([1, null, "Student"])).toEqual(["Student"])
  })

  it("de-duplicates", () => {
    expect(cleanIndustrySectors(["Technology", "Technology"])).toEqual(["Technology"])
  })
})

describe("cleanTags", () => {
  it("strips a leading hash, trims and de-duplicates", () => {
    expect(cleanTags(["#remote", " remote ", "react"])).toEqual(["remote", "react"])
  })

  it("caps at the documented limit of 10", () => {
    expect(cleanTags(Array.from({ length: 25 }, (_, i) => `t${i}`))).toHaveLength(10)
  })

  it("drops empties", () => {
    expect(cleanTags(["", "  ", "#", "real"])).toEqual(["real"])
  })
})

describe("target audience", () => {
  it("is the two onboarding vocabularies combined", () => {
    expect(TARGET_AUDIENCE).toEqual([...CAREER_STAGES, ...EDUCATION_LEVELS])
  })

  it("has no overlap between the two halves", () => {
    const overlap = CAREER_STAGES.filter((s) => (EDUCATION_LEVELS as readonly string[]).includes(s))
    expect(overlap).toEqual([])
  })
})
