"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"

/**
 * Which navigation set the bars should show: the member routes, or the
 * signed-out Back / Profile / Sign in / Sign up set.
 *
 * The reason this is not just `Boolean(user)`: `AuthProvider` starts with
 * `user = null` and only fills it in after `getCurrentUser()` comes back over
 * the network. Keying the whole nav off `user` alone would therefore show a
 * signed-in member the *visitor* bar for a full round trip on every cold load —
 * long enough to read, and the nav would then visibly rearrange under their
 * thumb.
 *
 * So while auth is still resolving, fall back to whether an access token exists
 * at all. That check is synchronous and local, and it is the same one
 * `initializeAuth` uses to decide whether to make the request in the first
 * place — if there is no token it will not even try, so "no token" is a final
 * answer rather than a guess. A token that turns out to be stale resolves to
 * the visitor bar a moment later, which is the rare case and the safe way to be
 * briefly wrong.
 *
 * The token is only consulted after mount. Server-rendered markup cannot see
 * localStorage, so reading it during the first client render would disagree
 * with the server's output and trip a hydration mismatch; deferring costs one
 * frame instead of one request.
 *
 * `userId` comes back alongside because the Profile tab needs a real id to link
 * to: there is no bare `/profile` route, so during the same resolving window a
 * placeholder href would 404 if tapped. The JWT already carries the id, so it
 * is read straight off the token rather than waited for.
 */
export function useNavAudience(): { isMember: boolean; userId: string | null } {
  const { user, isLoading } = useAuth()
  const [tokenUserId, setTokenUserId] = useState<string | null>(null)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    setHasToken(ApiClient.isAuthenticated())
    setTokenUserId(ApiClient.getCurrentUserFromToken()?._id ?? null)
  }, [])

  return {
    isMember: user ? true : isLoading && hasToken,
    userId: user?._id ?? tokenUserId,
  }
}
