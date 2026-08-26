"use client"

/**
 * The two pieces of behaviour every content detail page needs beyond its own
 * data fetch: why this listing is being shown, and what else is like it.
 *
 * Both were written for the opportunity page and copied nowhere — when events,
 * jobs and resources adopted the same layout they took these with them, so
 * there is still one implementation of each.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePersonalizedRanking } from "@/hooks/use-personalized-ranking"
import { fetchHomeListPage, type HomeListItem, type HomeListType } from "@/lib/fetch-home-list-page"

/**
 * Score a single listing with the same ranker the feed uses.
 *
 * These endpoints return content on its own, with no notion of who is reading
 * it, so the match has to be computed here. `dropExpired` is off: the page
 * still has to explain itself after a deadline passes.
 */
export function useContentRanking(item: any | null): {
  reasons: string[]
  glow: number | null
  /** True once there is enough about the reader to say anything meaningful. */
  personalised: boolean
} {
  const { normalizedUser } = useAuth()

  const rankingProfile = useMemo(
    () =>
      normalizedUser
        ? {
            country: normalizedUser.country ?? undefined,
            province: normalizedUser.province ?? undefined,
            city: normalizedUser.city ?? undefined,
            interests: normalizedUser.interests,
            skills: normalizedUser.skills,
            industrySectors: normalizedUser.industrySectors,
            aspirations: normalizedUser.aspirations,
            careerStage: normalizedUser.careerStage ?? undefined,
          }
        : null,
    [normalizedUser],
  )

  const { rankForFeed, personalised } = usePersonalizedRanking(rankingProfile)

  const ranked = useMemo(() => {
    if (!item) return null
    return rankForFeed([item as Record<string, unknown>], { dropExpired: false })[0] ?? null
  }, [rankForFeed, item])

  const reasons: string[] = Array.isArray(ranked?.reasons) ? ranked.reasons : []
  const glow = typeof ranked?.score === "number" ? Math.round(ranked.score) : null

  return {
    reasons: personalised ? reasons : [],
    glow,
    personalised: personalised && reasons.length > 0,
  }
}

/**
 * Up to three listings of the same type sharing tags with this one.
 *
 * Ranked by how many tags overlap, so the list degrades gracefully: a listing
 * with one shared tag is still a better suggestion than a random one, and a
 * listing with none never appears at all.
 */
export function useSimilarContent(
  type: HomeListType,
  item: any | null,
  options?: {
    /** Return the date that decides "still open". Omit for undated types. */
    getDeadline?: (row: any) => string | undefined
  },
): HomeListItem[] {
  const [similar, setSimilar] = useState<HomeListItem[]>([])

  const getDeadline = options?.getDeadline

  /**
   * `item` and `getDeadline` are read through refs rather than depended on.
   *
   * Every caller passes the options object — and the callback inside it —
   * as a literal, so both are new identities on every single render. With
   * `getDeadline` in the dependency array this effect re-ran each render:
   * fetch, setSimilar with a fresh array, re-render, fetch again. It measured
   * ~2,300 requests in 400ms, which pins the main thread and is exactly the
   * "wait for page to respond" hang.
   *
   * Telling callers to wrap it in useCallback would not be a fix — it would be
   * a rule nobody remembers on the fourth page. The hook is responsible for
   * being safe to call the obvious way.
   */
  const itemRef = useRef(item)
  const getDeadlineRef = useRef(getDeadline)

  useEffect(() => {
    itemRef.current = item
    getDeadlineRef.current = getDeadline
  })

  /**
   * The dependencies that genuinely mean "fetch again": a different listing,
   * a different type, or a changed tag set. All primitives, all stable.
   */
  const itemId = typeof item?._id === "string" ? item._id : null
  const tagsKey = useMemo(() => {
    const tags = Array.isArray(item?.tags) ? item.tags : []
    return tags.map((tag: unknown) => String(tag).toLowerCase()).sort().join("|")
  }, [item])

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    if (!itemId || !backendUrl) return

    // No tags means no basis for "similar" — an untagged listing gets no list
    // rather than three arbitrary ones.
    if (!tagsKey) return

    let cancelled = false
    const tags = new Set(tagsKey.split("|"))

    fetchHomeListPage({ type, cursorLastId: null, backendUrl })
      .then(({ items }) => {
        if (cancelled) return
        const getRowDeadline = getDeadlineRef.current
        const matches = items
          .filter((row) => row._id !== itemId)
          .filter((row) => {
            if (!getRowDeadline) return true
            const deadline = getRowDeadline(row)
            // Undated rows stay in: for most types a missing date means
            // "rolling", not "closed".
            if (!deadline) return true
            const time = new Date(deadline).getTime()
            return Number.isNaN(time) || time > Date.now()
          })
          .map((row) => {
            const rowTags = Array.isArray((row as any).tags) ? (row as any).tags : []
            const overlap = rowTags.filter((tag: string) =>
              tags.has(String(tag).toLowerCase()),
            ).length
            return { row, overlap }
          })
          .filter(({ overlap }) => overlap > 0)
          .sort((a, b) => b.overlap - a.overlap)
          .slice(0, 3)
          .map(({ row }) => row)

        // Bail out when nothing changed, so an identical result cannot start
        // another render pass.
        setSimilar((previous) => {
          if (
            previous.length === matches.length &&
            previous.every((row, i) => row._id === matches[i]._id)
          ) {
            return previous
          }
          return matches
        })
      })
      .catch(() => {
        // A missing "similar" list is not worth surfacing as an error.
      })

    return () => {
      cancelled = true
    }
  }, [type, itemId, tagsKey])

  return similar
}
