/**
 * The live platform counts the signed-out landing page prints.
 *
 * Backed by `GET /api/stats/public`, which is deliberately the only stats endpoint
 * that answers without a token. The backend caches the count for five minutes, so
 * calling this on every landing-page mount costs a cache read, not a collection scan.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export interface PublicPlatformStats {
  /** Active accounts, staff excluded. */
  activeUsers: number
}

/**
 * Returns null rather than throwing whenever the number cannot be trusted: no backend
 * configured, a failed request, a malformed body, or a count of zero (which in practice
 * means the query ran against the wrong database, not that nobody has signed up). The
 * caller is a marketing surface, so falling back to its static copy is the right failure
 * mode -- a landing page must never render "0 users" or an error.
 */
export async function fetchPublicPlatformStats(
  signal?: AbortSignal,
): Promise<PublicPlatformStats | null> {
  if (!BACKEND_URL) return null

  try {
    const response = await fetch(`${BACKEND_URL}/api/stats/public`, { signal })
    if (!response.ok) return null

    const body = await response.json()
    const activeUsers = body?.data?.activeUsers

    if (typeof activeUsers !== 'number' || !Number.isFinite(activeUsers) || activeUsers <= 0) {
      return null
    }

    return { activeUsers: Math.round(activeUsers) }
  } catch {
    return null
  }
}
