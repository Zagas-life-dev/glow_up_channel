/**
 * Turn what people type into a profile link into a URL that will save and open.
 *
 * People type `mysite.com`, `linkedin.com/in/ada` or just `@ada`. The backend
 * used to reject the first outright, failing the whole profile save, and
 * silently drop the rest. This fills in what they meant instead: a missing
 * `https://`, or a bare handle expanded onto its platform.
 *
 * Only http(s) is allowed, so a stored link can never be a `javascript:` URL
 * in an href on someone's profile.
 *
 * Mirrored by hand in latest-glowup-channel/src/utils/profileLinks.js; keep
 * the two in step.
 */

export const SOCIAL_PLATFORMS = ["linkedin", "twitter", "instagram", "github", "youtube", "tiktok"] as const
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

const HANDLE_URL: Record<SocialPlatform, (handle: string) => string> = {
  linkedin: (h) => `https://www.linkedin.com/in/${h}`,
  twitter: (h) => `https://x.com/${h}`,
  instagram: (h) => `https://www.instagram.com/${h}`,
  github: (h) => `https://github.com/${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
}

// `@ada`, `ada`, `ada.lovelace`: no slash, so it cannot be a profile URL.
const HANDLE = /^@?([A-Za-z0-9_][A-Za-z0-9_.-]{0,99})$/

/**
 * Returns the link to store, `""` for an empty field, or `null` when the input
 * cannot be read as a link.
 */
export function normalizeProfileLink(raw: unknown, platform?: string): string | null {
  if (raw == null) return ""
  if (typeof raw !== "string") return null
  const value = raw.trim()
  if (!value) return ""
  if (/\s/.test(value)) return null

  if (platform && platform in HANDLE_URL) {
    const handle = HANDLE.exec(value)
    if (handle) return HANDLE_URL[platform as SocialPlatform](handle[1])
  }

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null
  if (url.username || url.password || !url.hostname.includes(".")) return null
  return withScheme
}

/** A short label for a stored link, or null if it would not open. */
export function profileLinkHost(link: string | null | undefined): string | null {
  const normalized = normalizeProfileLink(link)
  if (!normalized) return null
  return new URL(normalized).hostname.replace(/^www\./, "")
}
