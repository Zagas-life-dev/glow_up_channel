"use client"

/**
 * Skills, picked from the official list — shared by onboarding and settings.
 *
 * Takes and returns English skill labels, which is what profiles store and
 * the backend maps back to tag ids; shows them in the reader's language.
 * Legacy free-typed skills that match no tag are kept visible (so saving the
 * page does not silently delete them) but new ones can only come from the list.
 */

import * as React from "react"
import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { useLocale } from "@/lib/i18n/context"
import { labelFor, tagsInFacet } from "@/lib/taxonomy"
import { cn } from "@/lib/utils"

const SKILLS = tagsInFacet("skill")
const ID_BY_LABEL = new Map(SKILLS.map((tag) => [tag.label.toLowerCase(), tag.id]))

export function SkillPicker({
  value,
  onChange,
  max = 15,
  className,
  chipClassName,
}: {
  /** English labels, as stored on the profile. */
  value: string[]
  onChange: (next: string[]) => void
  max?: number
  className?: string
  chipClassName?: string
}) {
  const { t, locale } = useLocale()
  const [query, setQuery] = React.useState("")

  const display = (label: string) => {
    const id = ID_BY_LABEL.get(label.toLowerCase())
    return id ? labelFor(id, locale) : label
  }

  const matches = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    const held = new Set(value.map((label) => label.toLowerCase()))
    return SKILLS.filter((tag) => !held.has(tag.label.toLowerCase()))
      .filter((tag) => labelFor(tag.id, locale).toLowerCase().includes(needle) || tag.label.toLowerCase().includes(needle))
      .slice(0, 12)
  }, [query, value, locale])

  return (
    <div className={cn("space-y-2", className)}>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((label) => (
            <span
              key={label}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground",
                chipClassName,
              )}
            >
              {display(label)}
              <button
                type="button"
                onClick={() => onChange(value.filter((other) => other !== label))}
                aria-label={t("tags.remove", { tag: display(label) })}
                className="text-muted-foreground transition-colors hover:text-destructive"
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
          disabled={value.length >= max}
          className="h-11 pl-9"
        />
      </div>
      {query.trim() ? (
        matches.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {matches.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  onChange([...value, tag.label])
                  setQuery("")
                }}
                className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-up-border-hover hover:text-foreground"
              >
                + {labelFor(tag.id, locale)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("tags.noMatches", { query: query.trim() })}</p>
        )
      ) : null}
    </div>
  )
}

export default SkillPicker
