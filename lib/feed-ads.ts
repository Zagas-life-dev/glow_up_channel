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
 *
 * Slots exist at a fixed cadence; which of them carry promoted content is the
 * interesting part. The old rule was "slot 1 of every 3-slot cycle", which read
 * as a density choice but behaved as a delivery cap: promoted cards were laid
 * down back-to-back from the top of the feed until stock ran out, and every
 * slot after that was dead. With a handful of active promotions — the normal
 * case — that meant all of them landed in the first screen or two and a reader
 * who scrolled past saw no paid content again.
 *
 * Instead the stock is spread across the whole feed: the interval between
 * promoted cards is derived from how many there are, floored at `postsBetween`
 * so density never exceeds the slot cadence. Five promotions over a hundred
 * posts appear every twenty; twenty-five promotions appear every four. The
 * promoter gets presence for the length of the session rather than a burst at
 * the top, and the reader gets an even sprinkle rather than an ad break.
 *
 * Slots that do not draw promoted content are still emitted as reserved slots,
 * which render as nothing.
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

  // How many posts apart promoted cards should sit. `+ 1` so the last one is
  // not pinned to the very end of the feed. Guarded against a zero/negative
  // `postsBetween`, which would otherwise make every position a slot.
  const cadence = Math.max(1, postsBetween)
  const spread =
    promotedItems.length > 0
      ? Math.max(cadence, Math.floor(items.length / (promotedItems.length + 1)))
      : cadence

  items.forEach((item, i) => {
    if (i > 0 && i % cadence === 0) {
      // A slot carries promoted content when it is the first slot at or past
      // the next multiple of `spread`, and stock remains.
      const takesPromoted =
        promotedIndex < promotedItems.length &&
        Math.floor(i / spread) > promotedIndex

      if (takesPromoted) {
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
    }
    result.push({ type: "post", post: item })
  })

  return result
}
