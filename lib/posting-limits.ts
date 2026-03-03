import { hasPremiumAccess, isAdminOrSuperAdmin } from './roles'

/**
 * Posting limits for opportunity providers (total posts: active, inactive, and draft all count).
 * - Free: 5 posts max total.
 * - Premium / Admin / Super admin: 20 posts max total.
 */
export const POST_LIMIT_FREE = 5
export const POST_LIMIT_PREMIUM = 20

/**
 * Returns the posting limit for the user. Premium limit is granted to premium subscribers
 * and to admin/super_admin roles.
 */
export function getPostingLimit(
  isPremium: boolean | undefined,
  role?: string | undefined | null
): number {
  // Admins and super_admins have no posting limit
  if (isAdminOrSuperAdmin(role ?? null)) {
    return Infinity
  }
  // Premium users keep the higher limit, free users the base limit
  return hasPremiumAccess({ isPremium, role }) ? POST_LIMIT_PREMIUM : POST_LIMIT_FREE
}
