/**
 * What the UI is allowed to offer a monitor.
 *
 * The frontend mirrors the backend's two role lists, and the mirror is what
 * keeps a Post or Promote button from being rendered for an account whose
 * request the API will refuse. A button that always fails is worse than no
 * button, so these are pinned rather than left to the pages that call them.
 */

import { describe, expect, it } from 'vitest'

import {
  LISTING_VIEWER_ROLES,
  MONITOR_CAPABLE_ROLES,
  PUBLISHER_ROLES,
  ROLES,
  canAccessMonitorPortal,
  canPublishContent,
  canViewListingAnalytics,
  isAdminOrSuperAdmin,
  isMonitor,
  roleLabel,
} from './roles'
import { getPostingLimit } from './posting-limits'

describe('monitor role', () => {
  it('is recognised by isMonitor and nothing else', () => {
    expect(isMonitor(ROLES.MONITOR)).toBe(true)
    expect(isMonitor(ROLES.FOUNDER_BATCH)).toBe(false)
    expect(isMonitor(ROLES.SEEKER)).toBe(false)
    expect(isMonitor(undefined)).toBe(false)
  })

  it('cannot publish', () => {
    // The gate every posting and promoting control is behind.
    expect(canPublishContent(ROLES.MONITOR)).toBe(false)
    expect(PUBLISHER_ROLES).not.toContain(ROLES.MONITOR)
  })

  it('can read listing analytics', () => {
    expect(canViewListingAnalytics(ROLES.MONITOR)).toBe(true)
    expect(LISTING_VIEWER_ROLES).toContain(ROLES.MONITOR)
  })

  it('is not an admin', () => {
    expect(isAdminOrSuperAdmin(ROLES.MONITOR)).toBe(false)
  })

  it('has a posting limit of zero, not the founder quota', () => {
    // Reporting "0 of 20 used" would describe a quota the role does not have.
    expect(getPostingLimit(ROLES.MONITOR)).toBe(0)
    expect(getPostingLimit(ROLES.FOUNDER_BATCH)).toBeGreaterThan(0)
  })

  it('renders with a name rather than a raw role string', () => {
    expect(roleLabel(ROLES.MONITOR)).toBe('Monitor')
  })
})

describe('read and write lists stay separate', () => {
  it('lets every publisher read analytics', () => {
    for (const role of PUBLISHER_ROLES) {
      expect(canViewListingAnalytics(role)).toBe(true)
    }
  })

  it('does not let a seeker read analytics', () => {
    expect(canViewListingAnalytics(ROLES.SEEKER)).toBe(false)
  })

  it('grants reading to strictly more roles than writing', () => {
    expect(LISTING_VIEWER_ROLES.length).toBeGreaterThan(PUBLISHER_ROLES.length)
  })
})

describe('monitor portal access', () => {
  it('lets monitors and admins in', () => {
    expect(canAccessMonitorPortal(ROLES.MONITOR)).toBe(true)
    expect(canAccessMonitorPortal(ROLES.ADMIN)).toBe(true)
    expect(canAccessMonitorPortal(ROLES.SUPER_ADMIN)).toBe(true)
  })

  it('keeps providers and seekers out', () => {
    // Reading analytics for what you own is not the same as being handed
    // another organisation's listing to watch.
    expect(canAccessMonitorPortal(ROLES.FOUNDER_BATCH)).toBe(false)
    expect(canAccessMonitorPortal(ROLES.SEEKER)).toBe(false)
    expect(canAccessMonitorPortal(undefined)).toBe(false)
  })

  it('is broader than isMonitor, which asks a different question', () => {
    // The nav and settings ask "can you open this?"; the page copy asks "is
    // this your own view?". Conflating them is how an admin gets told they
    // have no assignments when they are reading someone else's.
    expect(canAccessMonitorPortal(ROLES.ADMIN)).toBe(true)
    expect(isMonitor(ROLES.ADMIN)).toBe(false)
  })

  it('matches the list it is derived from', () => {
    for (const role of MONITOR_CAPABLE_ROLES) {
      expect(canAccessMonitorPortal(role)).toBe(true)
    }
  })
})
