/**
 * Turning `RankReason` descriptors into text the user can read.
 *
 * The scorer emits keys, not sentences, so a ranked list can be computed once
 * and rendered in any language. Tag parameters are localised too — an English
 * profile matching a Portuguese listing on `entrepreneurship-funding` should
 * still read "Corresponde ao seu interesse em Empreendedorismo" for a Portuguese
 * reader.
 */

import type { Locale } from "@/lib/i18n/config"
import type { TranslationKey, Translator } from "@/lib/i18n/translate"
import { tagLabel } from "@/lib/nlp/taxonomy"
import type { RankReason } from "@/lib/ranking/types"

export function formatReason(
  reason: RankReason,
  t: Translator,
  locale: Locale,
): string {
  const params = { ...reason.params }
  if (typeof params.tag === "string") {
    params.tag = tagLabel(params.tag, locale)
  }
  return t(`reasons.${reason.key}` as TranslationKey, params)
}

export function formatReasons(
  reasons: RankReason[],
  t: Translator,
  locale: Locale,
): string[] {
  return reasons.map((reason) => formatReason(reason, t, locale))
}

/**
 * Accepts either shape.
 *
 * The backend sends `reasons` as plain strings; this layer sends descriptors.
 * Cards receive a mix depending on whether a response has been re-ranked yet,
 * so they should not have to care which one they got.
 */
export function normalizeReasons(
  reasons: unknown,
  t: Translator,
  locale: Locale,
): string[] {
  if (!Array.isArray(reasons)) return []
  return reasons
    .map((reason) => {
      if (typeof reason === "string") return reason
      if (reason && typeof reason === "object" && "key" in reason) {
        return formatReason(reason as RankReason, t, locale)
      }
      return ""
    })
    .filter(Boolean)
}
