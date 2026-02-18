export type FeedItem<T> =
  | { type: "post"; post: T }
  | { type: "ad"; key: string }

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
