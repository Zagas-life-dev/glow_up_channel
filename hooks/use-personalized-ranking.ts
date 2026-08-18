"use client"

/**
 * The one hook a feed needs.
 *
 * Assembles the ranking context from the three inputs that live in different
 * places — location (hook), locale (context), interests (user profile) — and
 * hands back a `rank` function. Feeds call it on whatever page of items they
 * just fetched.
 *
 * Ranking is synchronous and memoised on the context, so re-ranking a page is
 * cheap enough to do during render. The expensive half — parsing each listing
 * into a `TextProfile` — is cached by item id inside `rank.ts`.
 */

import { useCallback, useMemo } from "react"

import { useViewingCountry } from "@/lib/geo/viewing-country"
import { applyViewingSelection } from "@/lib/geo/viewing-location"
import { useLocale } from "@/lib/i18n/context"
import { profileUser } from "@/lib/nlp/profile-text"
import { languagesForCountry } from "@/lib/ranking/signals"
import { formatReasons } from "@/lib/ranking/reasons"
import { rankItems, type RankOptions } from "@/lib/ranking/rank"
import type { RankedItem, RankingContext } from "@/lib/ranking/types"
import { useUserLocation, profileLocationReading } from "@/hooks/use-user-location"
import type {
  GeolocationPermission,
  LocationReading,
  ResolvedLocation,
} from "@/lib/geo/types"

/** The onboarding profile fields the ranker reads. All optional. */
export type RankingUserProfile = {
  country?: string
  province?: string
  city?: string
  interests?: unknown
  skills?: unknown
  industrySectors?: unknown
  industry?: unknown
  aspirations?: unknown
  fieldOfStudy?: unknown
  careerStage?: unknown
  updatedAt?: string
} | null

export type UsePersonalizedRanking = {
  /** Score and reorder a page of items. */
  rank: <T extends Record<string, unknown>>(
    items: T[],
    options?: RankOptions,
  ) => RankedItem<T>[]
  /** Same, but returns plain items with `score` and localised `reasons` set. */
  rankForFeed: <T extends Record<string, unknown>>(
    items: T[],
    options?: RankOptions,
  ) => (T & { score: number; reasons: string[] })[]
  location: ResolvedLocation
  locationLoading: boolean
  /** True once we have either a location or some interests to rank on. */
  personalised: boolean
  /**
   * Re-exported so a consumer can render the consent card without calling
   * `useUserLocation` again — a second instance would fire its own `/api/geo`
   * request before the first had cached a result.
   */
  locationPermission: GeolocationPermission
  requestPreciseLocation: () => Promise<LocationReading | null>
  context: RankingContext
}

export function usePersonalizedRanking(
  profile: RankingUserProfile,
): UsePersonalizedRanking {
  const { locale, secondary, t } = useLocale()

  const profileReading = useMemo(
    () =>
      profileLocationReading(
        profile
          ? {
              country: typeof profile.country === "string" ? profile.country : undefined,
              province:
                typeof profile.province === "string" ? profile.province : undefined,
              city: typeof profile.city === "string" ? profile.city : undefined,
              updatedAt: profile.updatedAt,
            }
          : null,
      ),
    [profile],
  )

  const { location: detected, loading, permission, requestPrecise } =
    useUserLocation(profileReading)

  const { selection } = useViewingCountry()

  /** What the feed is ranked against — see `applyViewingSelection` for the rule. */
  const location = useMemo<ResolvedLocation>(
    () => applyViewingSelection(detected, selection),
    [detected, selection],
  )

  const interests = useMemo(() => profileUser(profile, locale), [profile, locale])

  // Languages the user reads: their UI locale, whatever the browser reports,
  // and the official languages of wherever they are.
  //
  // Note this follows the *selected* country, not the detected one, which is
  // the behaviour you want: someone browsing Senegal should stop seeing French
  // listings treated as foreign, because Senegalese listings are in French.
  const secondaryLanguages = useMemo(() => {
    const fromCountry = languagesForCountry(location.countryCode)
    return Array.from(new Set([...secondary, ...fromCountry])).filter(
      (language) => language !== locale,
    )
  }, [secondary, location.countryCode, locale])

  // `now` is bucketed to the minute so the context identity — and therefore the
  // memo below — does not change on every render.
  const now = useMemo(() => Math.floor(Date.now() / 60_000) * 60_000, [])

  const context = useMemo<RankingContext>(
    () => ({
      location,
      language: locale,
      secondaryLanguages,
      interests,
      now,
    }),
    [location, locale, secondaryLanguages, interests, now],
  )

  const rank = useCallback(
    <T extends Record<string, unknown>>(items: T[], options?: RankOptions) =>
      rankItems(items, context, options),
    [context],
  )

  const rankForFeed = useCallback(
    <T extends Record<string, unknown>>(items: T[], options?: RankOptions) =>
      rankItems(items, context, options).map((ranked) => ({
        ...ranked.item,
        score: ranked.score,
        reasons: formatReasons(ranked.reasons, t, locale),
      })),
    [context, t, locale],
  )

  return {
    rank,
    rankForFeed,
    location,
    locationLoading: loading,
    personalised:
      Boolean(location.countryCode || location.coordinates) || interests.tags.size > 0,
    locationPermission: permission,
    requestPreciseLocation: requestPrecise,
    context,
  }
}
