import { isAdminOrSuperAdmin } from './roles'
import { FOUNDER_BATCH } from './roles'

/**
 * Posting limit for Founder Batch members (total posts: active, inactive and draft
 * all count). Admin/super_admin are unlimited.
 */
export const POST_LIMIT = FOUNDER_BATCH.POST_LIMIT

/** Returns the posting limit for the user's role. */
export function getPostingLimit(role?: string | undefined | null): number {
  if (isAdminOrSuperAdmin(role ?? null)) {
    return Infinity
  }
  return POST_LIMIT
}
