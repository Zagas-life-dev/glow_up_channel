"use client"

import { useAuth } from "@/lib/auth-context"
import { hasPremiumAccess } from "@/lib/roles"

/**
 * Whether ads should be shown to the current user.
 * Ads are hidden for premium subscribers and admins/super-admins
 * (same rule as {@link hasPremiumAccess}); shown to everyone else.
 */
export function useShowAds(): boolean {
  const { user } = useAuth()
  return !hasPremiumAccess({ role: user?.role, isPremium: user?.isPremium })
}
