import { isAdminOrSuperAdmin, isMonitor } from './roles'
import { FOUNDER_BATCH } from './roles'

/**
 * Posting limit for Founder Batch members (total posts: active, inactive and draft
 * all count). Admin/super_admin are unlimited.
 */
export const POST_LIMIT = FOUNDER_BATCH.POST_LIMIT

/**
 * Returns the posting limit for the user's role.
 *
 * A monitor's limit is zero rather than the default: it cannot publish at all,
 * and reporting "0 of 20 used" would describe a quota it does not have.
 */
export function getPostingLimit(role?: string | undefined | null): number {
  if (isAdminOrSuperAdmin(role ?? null)) {
    return Infinity
  }
  if (isMonitor(role ?? null)) {
    return 0
  }
  return POST_LIMIT
}
