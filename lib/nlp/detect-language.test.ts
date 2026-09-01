/**
 * Language detection, with the cases that used to fail.
 *
 * The detector feeds `languageSignal`, which carries 0.18 of a resource's
 * weight — second only to meaning — and swings a full 0.8 between "your
 * language" and "foreign". A misread title costs more than a mediocre topical
 * match, so these are worth pinning.
 */

import { describe, expect, it } from "vitest"

import { detectLanguage } from "@/lib/nlp/detect-language"

const detect = (text: string) => detectLanguage(text).language

describe("detectLanguage", () => {
  it("reads the four languages in ordinary titles", () => {
    expect(detect("Guia completo de empreendedorismo para jovens")).toBe("pt")
    expect(detect("Guia de bolsas de estudos no exterior")).toBe("pt")
    expect(detect("Guía de becas para estudiantes")).toBe("es")
    expect(detect("Manual de emprendimiento y financiacion")).toBe("es")
    expect(detect("Guide de la candidature et de la bourse d'etudes")).toBe("fr")
    expect(detect("Formation en developpement web")).toBe("fr")
    expect(detect("CV Template Pack")).toBe("en")
    expect(detect("Digital Marketing Fundamentals")).toBe("en")
  })

  it("reads plurals, not just the singular in the marker list", () => {
    // `\b`-anchored singulars meant every one of these came back English, on
    // nothing but the accent-free bonus.
    expect(detect("beca")).toBe("es")
    expect(detect("becas")).toBe("es")
    expect(detect("bolsa")).toBe("pt")
    expect(detect("bolsas")).toBe("pt")
    expect(detect("vaga")).toBe("pt")
    expect(detect("vagas")).toBe("pt")
    expect(detect("Vagas de emprego em tecnologia")).toBe("pt")
    expect(detect("Ofertas de empleo en tecnologia")).toBe("es")
  })

  it("reads a language whether or not the source kept its accents", () => {
    // Scraped listings arrive both ways, and the marker lists used to be
    // spelled one way each — so each list only matched half the corpus.
    expect(detect("formação profissional")).toBe("pt")
    expect(detect("formacao profissional")).toBe("pt")
    expect(detect("formación profesional")).toBe("es")
    expect(detect("formacion profesional")).toBe("es")
  })

  it("does not hand every es/pt draw to Spanish", () => {
    // The old `reduce` kept the first language on an exact tie, and Spanish
    // precedes Portuguese in SUPPORTED_LANGUAGES.
    const guess = detectLanguage("Guia completo de empreendedorismo para jovens")
    expect(guess.language).toBe("pt")
    expect(guess.scores.pt).toBeGreaterThan(guess.scores.es)
  })

  it("abstains instead of guessing English from an absence of accents", () => {
    // 0.75 out of a 0.75 total used to read as confidence 1.0.
    expect(detect("PDF 2026")).toBeNull()
    expect(detect("")).toBeNull()
  })

  it("counts the one-letter function words Portuguese and Spanish lean on", () => {
    // `tokenize` drops single characters, so "o", "a" and "e" — the three most
    // frequent Portuguese words — were invisible as stopword evidence.
    const guess = detectLanguage("O guia de bolsas e a formacao no exterior")
    expect(guess.language).toBe("pt")
  })

  it("still prefers what the publisher declared", () => {
    expect(detectLanguage("Guia de bolsas").language).toBe("pt")
  })
})
