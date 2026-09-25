"use client"

/**
 * Pick a listing's tags from the official list — nothing else can be typed.
 *
 * One section per group (what it is, format, level, community, industry,
 * skills), each capped at the same limit the backend enforces. Small groups
 * are shown as chips; skills, the one long list, is searchable and grouped by
 * industry. Suggestions come from the title and description with the backend
 * tagger's own weighting, so what a provider is offered is what the server
 * would have chosen anyway — they confirm or correct it.
 */

import * as React from "react"
import { Check, Plus, Search, Sparkles, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLocale } from "@/lib/i18n/context"
import {
  atFacetLimit,
  FACET_LABEL_KEYS,
  FACET_LIMITS,
  FACETS_BY_KIND,
  facetOf,
  labelFor,
  missingRequired,
  suggestTags,
  tagAllowedFor,
  tagsInFacet,
  type ListingKind,
  type TagFacet,
} from "@/lib/taxonomy"
import { cn } from "@/lib/utils"

/** Chips for these; a search box for the rest. */
const CHIP_FACETS = new Set<TagFacet>(["type", "format", "work", "level", "community", "industry"])

/** Enough to read the gist without re-scoring on every keystroke. */
const SUGGEST_DEBOUNCE_MS = 400

function Chip({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string
  selected: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        selected
          ? "border-primary bg-up-orange-tint text-up-orange-ink"
          : "border-border bg-card text-muted-foreground hover:border-up-border-hover hover:text-foreground",
        disabled && !selected && "cursor-not-allowed opacity-40 hover:border-border hover:text-muted-foreground",
      )}
    >
      {label}
    </button>
  )
}

export function TagPicker({
  kind,
  value,
  onChange,
  draft,
  className,
}: {
  kind: ListingKind
  value: string[]
  onChange: (next: string[]) => void
  /** Title and description, for suggestions. */
  draft?: { title?: string; description?: string }
  className?: string
}) {
  const { t, locale } = useLocale()
  const facets = FACETS_BY_KIND[kind]
  const [query, setQuery] = React.useState("")
  const [suggested, setSuggested] = React.useState<string[]>([])

  // Drop tags the kind cannot carry when the provider switches type mid-form.
  React.useEffect(() => {
    const allowed = value.filter((id) => tagAllowedFor(id, kind))
    if (allowed.length !== value.length) onChange(allowed)
  }, [kind, value, onChange])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setSuggested(suggestTags(draft ?? {}, kind, locale).slice(0, 12))
    }, SUGGEST_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft?.title, draft?.description, kind, locale]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((other) => other !== id))
      return
    }
    if (atFacetLimit(value, id)) return
    onChange([...value, id])
  }

  const pendingSuggestions = suggested.filter((id) => !value.includes(id) && !atFacetLimit(value, id))
  const missing = missingRequired(value, kind)

  const skillMatches = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    const skills = tagsInFacet("skill")
    if (!needle) return []
    return skills
      .filter((tag) => {
        const label = labelFor(tag.id, locale).toLowerCase()
        return label.includes(needle) || tag.label.toLowerCase().includes(needle)
      })
      .slice(0, 20)
  }, [query, locale])

  return (
    <div className={cn("space-y-4", className)}>
      <Label className="text-[13px] font-bold text-foreground">{t("tags.title")}</Label>

      {pendingSuggestions.length > 0 ? (
        <div className="rounded-up-xl border border-dashed border-primary/40 bg-up-orange-tint/40 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-up-orange-ink">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t("tags.suggested")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pendingSuggestions.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary"
              >
                <Plus className="h-3 w-3" aria-hidden />
                {labelFor(id, locale)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {facets.map((facet) => {
        const selectedHere = value.filter((id) => facetOf(id) === facet)
        const limit = FACET_LIMITS[facet]
        return (
          <section key={facet} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {t(FACET_LABEL_KEYS[facet])}
                {missing.includes(facet) ? <span className="ml-0.5 text-up-orange-ink">*</span> : null}
              </p>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {selectedHere.length}/{limit}
              </span>
            </div>

            {facet === "community" ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{t("tags.communityHelp")}</p>
            ) : null}

            {CHIP_FACETS.has(facet) ? (
              <div className="flex flex-wrap gap-1.5">
                {tagsInFacet(facet)
                  .filter((tag) => tagAllowedFor(tag.id, kind))
                  .map((tag) => {
                    const isSelected = value.includes(tag.id)
                    return (
                      <Chip
                        key={tag.id}
                        label={labelFor(tag.id, locale)}
                        selected={isSelected}
                        disabled={!isSelected && selectedHere.length >= limit}
                        onClick={() => toggle(tag.id)}
                      />
                    )
                  })}
              </div>
            ) : (
              <div className="space-y-2">
                {selectedHere.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedHere.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full border border-primary bg-up-orange-tint px-3 py-1.5 text-xs font-medium text-up-orange-ink"
                      >
                        {labelFor(id, locale)}
                        <button
                          type="button"
                          onClick={() => toggle(id)}
                          aria-label={t("tags.remove", { tag: labelFor(id, locale) })}
                          className="rounded-full hover:text-foreground"
                        >
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("tags.search")}
                    disabled={selectedHere.length >= limit}
                    className="h-10 pl-9 text-sm"
                  />
                </div>
                {query.trim() ? (
                  skillMatches.length > 0 ? (
                    <ul className="max-h-56 overflow-y-auto rounded-up-xl border border-border bg-card p-1">
                      {skillMatches.map((tag) => {
                        const isSelected = value.includes(tag.id)
                        return (
                          <li key={tag.id}>
                            <button
                              type="button"
                              onClick={() => {
                                toggle(tag.id)
                                setQuery("")
                              }}
                              disabled={!isSelected && selectedHere.length >= limit}
                              className="flex w-full items-center justify-between rounded-up-sm px-3 py-2 text-left text-sm hover:bg-up-fill disabled:opacity-40"
                            >
                              <span>
                                {labelFor(tag.id, locale)}
                                {tag.parent ? (
                                  <span className="ml-2 text-xs text-muted-foreground">{labelFor(tag.parent, locale)}</span>
                                ) : null}
                              </span>
                              {isSelected ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("tags.noMatches", { query: query.trim() })}</p>
                  )
                ) : null}
              </div>
            )}
          </section>
        )
      })}

      {missing.includes("industry") ? (
        <p className="text-xs text-up-orange-ink">{t("tags.industryRequired")}</p>
      ) : null}
      {missing.includes("level") ? (
        <p className="text-xs text-up-orange-ink">{t("tags.levelRequired")}</p>
      ) : null}
    </div>
  )
}

export default TagPicker
