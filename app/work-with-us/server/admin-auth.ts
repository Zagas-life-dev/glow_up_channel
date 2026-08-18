const ADMIN_ROLES = ["admin", "super_admin"]

export type AdminCaller = { token: string; email: string; role: string }

function backendUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL
  if (!url) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set")
  return url.replace(/\/$/, "")
}

/**
 * Confirms the caller is an admin by asking the backend who the token belongs to.
 * We never validate the JWT here — the backend owns that secret — so this route
 * can only ever be as trusting as the backend is.
 */
export async function requireAdmin(request: Request): Promise<AdminCaller | null> {
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  if (!token) return null

  try {
    const response = await fetch(`${backendUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!response.ok) return null

    const json = await response.json()
    const user = json?.data?.user ?? json?.data ?? json?.user
    const role = String(user?.role ?? "").toLowerCase()
    if (!ADMIN_ROLES.includes(role)) return null

    return { token, email: String(user?.email ?? ""), role }
  } catch {
    return null
  }
}

/** Calls the backend as the admin who is signed in. */
export async function backendPost(
  caller: AdminCaller,
  path: string,
  body: unknown,
): Promise<{ ok: true; data: any } | { ok: false; error: string; status: number }> {
  try {
    const response = await fetch(`${backendUrl()}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${caller.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    const json = await response.json().catch(() => null)
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: json?.message || `Backend refused (HTTP ${response.status})`,
      }
    }
    return { ok: true, data: json?.data ?? json }
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: error instanceof Error ? error.message : "Could not reach the backend",
    }
  }
}
