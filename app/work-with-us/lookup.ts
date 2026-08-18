import { fetchHomeListPage, type HomeListType } from "@/lib/fetch-home-list-page"
import { matchScore } from "@/lib/search-rank"

import { LIST_PATH, type ContentType } from "./config"

export type Match = {
  contentId: string
  contentType: ContentType
  title: string
  subtitle: string
}

const TYPES: ContentType[] = ["opportunity", "event", "job", "resource"]

function asText(value: unknown): string {
  return typeof value === "string" ? value : ""
}

/**
 * Searches the four public list APIs at once and returns the closest matches.
 * Same endpoints the site search uses, so no login is needed.
 */
export async function searchPlatform(query: string): Promise<Match[]> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  if (!backendUrl || query.trim().length < 2) return []

  const perType = await Promise.all(
    TYPES.map(async (contentType) => {
      try {
        const page = await fetchHomeListPage({
          type: LIST_PATH[contentType] as HomeListType,
          cursorLastId: null,
          backendUrl,
          query: { search: query },
        })
        return page.items.map((item) => ({
          contentId: String(item._id),
          contentType,
          title: asText(item.title) || "Untitled",
          subtitle:
            asText(item.company) ||
            asText(item.organizer) ||
            asText(item.category) ||
            asText(item.type),
        }))
      } catch {
        return []
      }
    }),
  )

  return perType
    .flat()
    .map((match) => ({ match, rank: matchScore(match.title, query) }))
    .filter((entry) => entry.rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 8)
    .map((entry) => entry.match)
}
