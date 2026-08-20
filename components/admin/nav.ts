import type { IconType } from "react-icons"
import {
  RiDashboardLine,
  RiFileTextLine,
  RiAddCircleLine,
  RiArchiveLine,
  RiInboxUnarchiveLine,
  RiGroupLine,
  RiUserFollowLine,
  RiBuilding2Line,
  RiMegaphoneLine,
  RiBillLine,
  RiBarChartBoxLine,
  RiMailSendLine,
  RiSettings3Line,
} from "react-icons/ri"

export interface AdminNavItem {
  label: string
  href: string
  icon: IconType
  /** Hidden from plain admins. */
  superAdminOnly?: boolean
  /** Match nested routes (e.g. /users/[id]) as this item. */
  matchNested?: boolean
}

export interface AdminNavGroup {
  label: string
  items: AdminNavItem[]
}

/**
 * Every admin route, grouped. This is the single source of truth for admin navigation —
 * the desktop sidebar, the mobile drawer, and page breadcrumbs all read from it, so a new
 * screen becomes reachable by adding one entry here rather than in three places.
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Overview", href: "/dashboard/admin", icon: RiDashboardLine }],
  },
  {
    label: "Content",
    items: [
      { label: "Moderation", href: "/dashboard/admin/content", icon: RiFileTextLine },
      { label: "Create content", href: "/dashboard/admin/create-content", icon: RiAddCircleLine },
      { label: "Past posts", href: "/dashboard/admin/past-posts", icon: RiArchiveLine },
      { label: "Work with us", href: "/dashboard/admin/work-with-us", icon: RiInboxUnarchiveLine },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Users", href: "/dashboard/admin/users", icon: RiGroupLine, superAdminOnly: true, matchNested: true },
      { label: "Pending approvals", href: "/dashboard/admin/users/pending", icon: RiUserFollowLine, superAdminOnly: true },
      { label: "Poster details", href: "/dashboard/admin/business-upload", icon: RiBuilding2Line, superAdminOnly: true },
    ],
  },
  {
    label: "Revenue",
    items: [
      { label: "Promotions", href: "/dashboard/admin/promotions", icon: RiMegaphoneLine, superAdminOnly: true },
      { label: "Receipts", href: "/dashboard/admin/receipts", icon: RiBillLine, superAdminOnly: true },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics", href: "/dashboard/admin/analytics", icon: RiBarChartBoxLine },
      { label: "Marketing email", href: "/dashboard/admin/marketing/email", icon: RiMailSendLine, superAdminOnly: true },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", href: "/dashboard/admin/settings", icon: RiSettings3Line, superAdminOnly: true }],
  },
]

/**
 * Longest-prefix match, so /users/pending highlights "Pending approvals" rather than "Users"
 * even though both are prefixes of the path.
 */
export function activeAdminHref(pathname: string): string | null {
  let best: string | null = null
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      const hit =
        pathname === item.href || (item.href !== "/dashboard/admin" && pathname.startsWith(item.href + "/"))
      if (hit && (best === null || item.href.length > best.length)) best = item.href
    }
  }
  return best
}

export function adminNavFor(isSuperAdmin: boolean): AdminNavGroup[] {
  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.superAdminOnly || isSuperAdmin),
  })).filter((group) => group.items.length > 0)
}

/** Page title for a route, used by the mobile top bar. */
export function adminTitleFor(pathname: string): string | undefined {
  const href = activeAdminHref(pathname)
  if (!href) return undefined
  for (const group of ADMIN_NAV) {
    for (const item of group.items) if (item.href === href) return item.label
  }
  return undefined
}
