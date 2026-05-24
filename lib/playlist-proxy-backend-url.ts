/**
 * Resolves the Express API base URL for Next.js playlist proxy routes.
 * Prefer NEXT_PUBLIC_BACKEND_URL (same as the browser). Some deployments only set
 * a server-side BACKEND_URL — use that as fallback so POST/PATCH still work.
 */
export function getPlaylistProxyBackendUrl(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.BACKEND_URL?.trim() ||
    ""
  if (!raw) return null
  return raw.replace(/\/$/, "")
}
