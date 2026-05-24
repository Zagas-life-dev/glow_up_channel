/**
 * Role and permission helpers for playlist and platform features.
 * Admins and super_admins get the same access as premium users for channels and premium features.
 */

const ADMIN_ROLES = ['admin', 'super_admin'] as const

/**
 * Returns true if the user has admin or super_admin role (full premium feature access, moderation, etc.).
 */
export function isAdminOrSuperAdmin(role: string | undefined | null): boolean {
  if (!role) return false
  return ADMIN_ROLES.includes(role.toLowerCase() as (typeof ADMIN_ROLES)[number])
}

/**
 * Returns true if the user has access to premium features (channels, premium limits, premium content).
 * Premium features are available to: premium subscribers OR admin OR super_admin.
 */
export function hasPremiumAccess(options: {
  role?: string | null
  isPremium?: boolean | null
}): boolean {
  const { role, isPremium } = options
  return isPremium === true || isAdminOrSuperAdmin(role)
}

/**
 * Returns true if the user can create or mark playlists as premium:
 * active premium subscriber (not past expiry) OR admin/super_admin.
 */
export function canCreatePremiumPlaylist(
  role: string | undefined | null,
  isPremium?: boolean | null,
  premiumExpiresAt?: string | null
): boolean {
  if (isAdminOrSuperAdmin(role)) return true
  if (isPremium !== true) return false
  if (!premiumExpiresAt) return true
  const end = new Date(premiumExpiresAt)
  if (Number.isNaN(end.getTime())) return true
  return end > new Date()
}

/**
 * Returns true if the user can view premium playlists (has active premium membership OR is admin/super_admin).
 */
export function canViewPremiumPlaylist(
  isPremium: boolean | undefined | null,
  role?: string | undefined | null
): boolean {
  return isPremium === true || isAdminOrSuperAdmin(role)
}
