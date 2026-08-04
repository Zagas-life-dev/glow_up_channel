/** Sponsored slot: a provider-promoted content card, or a reserved slot with nothing to show. */
export type SponsoredSlot<P> =
  | { type: "sponsored"; kind: "promoted"; content: P; key: string }
  | { type: "sponsored"; kind: "ad"; key: string }

/** Feed item for feeds that support promoted content. */
export type FeedItemWithSponsored<T, P> =
  | { type: "post"; post: T }
  | SponsoredSlot<P>

/**
 * Builds a feed with sponsored slots every `postsBetween` items.
 * 3-slot cycle: only slot 1 of each cycle carries promoted content; the other two
 * are reserved slots that render as nothing. Once promotedItems are exhausted,
 * every slot renders as nothing.
 */
export function buildFeedWithSponsored<T, P>(
  items: T[],
  promotedItems: P[],
  options: { postsBetween: number }
): FeedItemWithSponsored<T, P>[] {
  const { postsBetween } = options
  const result: FeedItemWithSponsored<T, P>[] = []
  let adIndex = 0
  let promotedIndex = 0

  items.forEach((item, i) => {
    if (i > 0 && i % postsBetween === 0) {
      const slotIndex = Math.floor((i / postsBetween) - 1) % 3
      if (slotIndex === 0) {
        if (promotedIndex < promotedItems.length) {
          const content = promotedItems[promotedIndex++]
          result.push({
            type: "sponsored",
            kind: "promoted",
            content,
            key: `sponsored-promoted-${promotedIndex - 1}`,
          })
        } else {
          result.push({ type: "sponsored", kind: "ad", key: `ad-${adIndex++}` })
        }
      } else {
        result.push({ type: "sponsored", kind: "ad", key: `ad-${adIndex++}` })
      }
    }
    result.push({ type: "post", post: item })
  })

  return result
}
