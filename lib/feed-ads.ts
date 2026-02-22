export type FeedItem<T> =
  | { type: "post"; post: T }
  | { type: "ad"; key: string }

/** Sponsored slot: either a promoted content card or an ad. */
export type SponsoredSlot<P> =
  | { type: "sponsored"; kind: "promoted"; content: P; key: string }
  | { type: "sponsored"; kind: "ad"; key: string }

/** Feed item for feeds that support promoted + ads (3-slot cycle: promoted, ad, ad). */
export type FeedItemWithSponsored<T, P> =
  | { type: "post"; post: T }
  | SponsoredSlot<P>

/**
 * Builds an array of feed items with ad slots interleaved after every `adEvery` posts.
 * Use with PostCard + FeedAd: map post items to PostCard, ad items to FeedAd.
 */
export function buildFeedWithAds<T>(
  items: T[],
  options: { adEvery: number }
): FeedItem<T>[] {
  const { adEvery } = options
  const result: FeedItem<T>[] = []
  let adIndex = 0

  items.forEach((post, i) => {
    if (i > 0 && i % adEvery === 0) {
      result.push({ type: "ad", key: `ad-${adIndex++}` })
    }
    result.push({ type: "post", post })
  })

  return result
}

/**
 * Builds a feed with sponsored slots every `postsBetween` items.
 * 3-slot cycle: Slot 1 = promoted (or ad if none), Slot 2 = ad, Slot 3 = ad, then repeat.
 * When promotedItems are exhausted, promoted slots render as ad.
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
