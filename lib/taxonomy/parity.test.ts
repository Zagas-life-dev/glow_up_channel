/**
 * The frontend and backend must tag text identically.
 *
 * The backend stores each listing's official tags; the frontend profiles
 * readers and scores listings in the browser with the same vocabulary. If the
 * two drift — a tag added on one side, an alias edited, a matcher rule changed
 * in one copy — a listing is stored as one thing and ranked as another, and
 * nothing else would notice. Three things are held equal here:
 *
 *   1. The data files, byte for byte.
 *   2. The country table, against lib/geo/countries.ts.
 *   3. The matchers, text for text, across all six languages and the senses.
 */

import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { COUNTRIES } from "@/lib/geo/countries"
import { normalizeText } from "@/lib/nlp/normalize"
import { matchTagsDetailed } from "@/lib/nlp/taxonomy"

const root = process.cwd()
const require = createRequire(import.meta.url)
const backend = require(join(root, "latest-glowup-channel/src/taxonomy/index.js"))
const backendText = require(join(root, "latest-glowup-channel/src/taxonomy/text.js"))

// Line endings aside: the two repos can be checked out with different
// core.autocrlf settings, which rewrites one copy with CRLF on disk.
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n")

describe("shared data files", () => {
  it("keeps the taxonomy identical on both sides", () => {
    expect(read("lib/taxonomy/taxonomy.json")).toBe(read("latest-glowup-channel/src/taxonomy/taxonomy.json"))
  })

  it("keeps the places table identical on both sides", () => {
    expect(read("lib/geo/places.json")).toBe(read("latest-glowup-channel/src/geo/places.json"))
  })

  it("carries the same countries as lib/geo/countries.ts", () => {
    const places = JSON.parse(read("lib/geo/places.json")) as {
      countries: { code: string; name: string; subregion: string; languages: string[]; lat: number; lng: number }[]
    }
    const pick = (c: (typeof places.countries)[number]) => [c.code, c.name, c.subregion, c.languages.join(","), c.lat, c.lng]
    expect(places.countries.map(pick)).toEqual(
      COUNTRIES.map((c) => [c.code, c.name, c.subregion, c.languages.join(","), c.lat, c.lng]),
    )
  })
})

const SAMPLES = [
  "Fully funded Masters scholarship in Education covering tuition fees",
  "Data Education Bootcamp: learn SQL and Power BI, certificate provided",
  "Primary school teacher. Women are encouraged to apply.",
  "Senior Software Engineer (Remote) — Node.js, TypeScript, backend services",
  "Women in Tech Founders Grant: seed funding for female founders",
  "Hair stylist wanted for an early-stage beauty salon",
  "Offre de stage en finance : stage rémunéré pour étudiants en comptabilité",
  "Conférence sur l'entrepreneuriat pour les femmes porteuses de projet",
  "Beca para estudiantes de ingeniería civil, totalmente financiada",
  "Bolsa de estudos para mestrado em saúde pública",
  "Tunatafuta mhasibu mwenye uzoefu wa kazi ya uhasibu na ukaguzi katika benki",
  "ባንክ ውስጥ የሂሳብ አያያዝ ልምድ ያለው አካውንታንት እንፈልጋለን።",
  "Aerospace engineer to design satellite structures",
  "Community health workers for rural communities",
  "Graphic designer: logos and brand assets in Canva",
]

describe("matchers", () => {
  it("normalise text identically, Ge'ez script included", () => {
    for (const text of SAMPLES) {
      expect(normalizeText(text)).toBe(backendText.normalizeText(text))
    }
  })

  it("find the same tags with the same strength", () => {
    for (const text of SAMPLES) {
      const front = matchTagsDetailed(text)
      const back: Map<string, { strength: number; weakOnly: boolean }> = backend.matchTagsDetailed(text)
      expect([...front.keys()].sort(), text).toEqual([...back.keys()].sort())
      for (const [id, match] of front) {
        const other = back.get(id)!
        expect(match.weakOnly, `${text} → ${id}`).toBe(other.weakOnly)
        expect(Math.abs(match.strength - other.strength), `${text} → ${id}`).toBeLessThan(1e-9)
      }
    }
  })

  it("resolves ambiguous words from their neighbours", () => {
    const bootcamp = matchTagsDetailed("Education bootcamp: learn to code, certificate on completion")
    expect(bootcamp.has("type:training-programme")).toBe(true)
    expect(bootcamp.has("industry:education")).toBe(false)

    const boilerplate = matchTagsDetailed("Accountant needed. Women are encouraged to apply.")
    expect(boilerplate.has("community:women")).toBe(false)

    const aimed = matchTagsDetailed("Leadership fellowship for women in finance")
    expect(aimed.has("community:women")).toBe(true)
  })
})
