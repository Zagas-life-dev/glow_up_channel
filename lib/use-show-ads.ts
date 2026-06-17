"use client"

import { useAuth } from "@/lib/auth-context"
import { hasPremiumAccess } from "@/lib/roles"

/**
 * Whether ads should be shown to the current user.
 * Ads are hidden for premium subscribers and admins/super-admins
 * (same rule as {@link hasPremiumAccess}); shown to everyone else.
 *
 * Returns false while auth is still resolving. This matters for global script
 * ads (Social Bar, Pop-under): once Adsterra injects its widget it can't be
 * removed by unmounting, so we must not load it until we KNOW the user isn't
 * premium/admin — otherwise it loads during the initial loading flash and
 * sticks around for premium users.
 */
export function useShowAds(): boolean {
  const { user, isLoading } = useAuth()
  if (isLoading) return false
  return !hasPremiumAccess({ role: user?.role, isPremium: user?.isPremium })
}
