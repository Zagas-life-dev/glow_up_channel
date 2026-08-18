/**
 * How closely a title matches what someone typed.
 *
 * The list APIs return matches in date order, so this is what puts the thing
 * they actually meant at the top. Used by the search page and by the
 * "Work with us" promotion lookup.
 */
export function matchScore(title: string, query: string): number {
  const a = title.toLowerCase().trim()
  const b = query.toLowerCase().trim()
  if (!a || !b) return 0

  if (a === b) return 100
  if (a.startsWith(b)) return 80
  if (a.includes(b)) return 60

  const words = b.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0
  const hits = words.filter((word) => a.includes(word)).length
  return (hits / words.length) * 40
}

/**
 * Sorts by how well each item matches, newest first when two score the same.
 * Ranks a page at a time — items already on screen never get reshuffled when
 * the next page loads.
 */
export function rankByMatch<T>(
  items: T[],
  query: string,
  getTitle: (item: T) => string,
  getDate?: (item: T) => string | number | null | undefined,
): T[] {
  const term = query.trim()
  if (!term) return items

  return items
    .map((item, index) => ({
      item,
      index,
      score: matchScore(getTitle(item), term),
      time: getDate ? new Date(getDate(item) ?? 0).getTime() || 0 : 0,
    }))
    .sort((a, b) => b.score - a.score || b.time - a.time || a.index - b.index)
    .map((entry) => entry.item)
}
