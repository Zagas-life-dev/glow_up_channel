/**
 * Role and permission helpers.
 *
 * Mirrors USER_ROLES / PUBLISHER_ROLES in the backend's src/config/constants.js.
 * Permission checks should call these helpers rather than comparing role strings
 * inline, so a tier change is one edit here instead of a hunt across the app.
 */

export const ROLES = {
  SEEKER: 'opportunity_seeker',
  /** Paid, term-limited tier that may publish content. Expiry reverts it to SEEKER. */
  FOUNDER_BATCH: 'founder_batch',
  /** @deprecated Replaced by FOUNDER_BATCH; kept so historical records still render. */
  OPPORTUNITY_POSTER: 'opportunity_poster',
  /**
   * Read-only oversight of assigned listings. Seeker access plus the provider
   * analytics view, scoped to listings an admin assigned — no posting, editing,
   * promoting or wallet. Absent from PUBLISHER_ROLES by design.
   */
  MONITOR: 'monitor',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const

const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN] as const

/** Roles allowed to publish opportunities, events, jobs, and resources. */
export const PUBLISHER_ROLES: readonly string[] = [
  ROLES.FOUNDER_BATCH,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
]

/**
 * Roles allowed to read per-listing analytics.
 *
 * A superset of PUBLISHER_ROLES; mirrors LISTING_VIEWER_ROLES in the backend.
 * Monitors read the same numbers but write nothing, so the read list and the
 * write list are deliberately separate — widening one must not widen the other.
 */
export const LISTING_VIEWER_ROLES: readonly string[] = [
  ...PUBLISHER_ROLES,
  ROLES.MONITOR,
]

/**
 * Roles that may hold monitor assignments and reach the monitor portal.
 *
 * Mirrors MONITOR_CAPABLE_ROLES in the backend. Admins are included: they can be
 * assigned listings directly and can open the portal as any monitor. Providers
 * are not — reading analytics for what you own is a different thing from being
 * handed another organisation's listing to watch.
 */
export const MONITOR_CAPABLE_ROLES: readonly string[] = [
  ROLES.MONITOR,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
]

/** Founder Batch commercial terms; mirrors FOUNDER_BATCH in backend constants. */
export const FOUNDER_BATCH = {
  PRICE_NGN: 80000,
  TERM_MONTHS: 12,
  POST_LIMIT: 20,
} as const

/** Returns true for admin or super_admin. */
export function isAdminOrSuperAdmin(role: string | undefined | null): boolean {
  if (!role) return false
  return (ADMIN_ROLES as readonly string[]).includes(role.toLowerCase())
}

/** Returns true if the account currently holds the Founder Batch tier. */
export function isFounderBatch(role: string | undefined | null): boolean {
  return role === ROLES.FOUNDER_BATCH
}

/**
 * Returns true if the account may publish content.
 *
 * The backend expires a lapsed Founder Batch term by rewriting the role back to
 * opportunity_seeker, so holding the role is itself proof the term is still active —
 * no expiry date needs checking here.
 */
export function canPublishContent(role: string | undefined | null): boolean {
  if (!role) return false
  return PUBLISHER_ROLES.includes(role.toLowerCase())
}

/** Returns true if the account is a read-only listing monitor. */
export function isMonitor(role: string | undefined | null): boolean {
  return role === ROLES.MONITOR
}

/**
 * Returns true if the account may read per-listing analytics.
 *
 * Not a substitute for canPublishContent: this is the read gate, and using it
 * to show a Post or Promote control would hand a monitor a button the API will
 * refuse.
 */
export function canViewListingAnalytics(role: string | undefined | null): boolean {
  if (!role) return false
  return LISTING_VIEWER_ROLES.includes(role.toLowerCase())
}

/**
 * Returns true if the account may reach the monitor portal.
 *
 * Broader than isMonitor, which asks whether the account *is* a monitor — the
 * difference matters for copy, since an admin here is usually reading someone
 * else's view rather than their own.
 */
export function canAccessMonitorPortal(role: string | undefined | null): boolean {
  if (!role) return false
  return MONITOR_CAPABLE_ROLES.includes(role.toLowerCase())
}

/** Human-readable label for a role value. */
export function roleLabel(role: string | undefined | null): string {
  switch (role) {
    case ROLES.FOUNDER_BATCH: return 'Founder Batch'
    case ROLES.SEEKER: return 'Opportunity Seeker'
    case ROLES.OPPORTUNITY_POSTER: return 'Provider (legacy)'
    case ROLES.MONITOR: return 'Monitor'
    case ROLES.ADMIN: return 'Admin'
    case ROLES.SUPER_ADMIN: return 'Super Admin'
    default: return role || 'Unknown'
  }
}
