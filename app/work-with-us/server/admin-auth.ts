const ADMIN_ROLES = ["admin", "super_admin"]

export type AdminCaller = { token: string; email: string; role: string }

/**
 * Why a caller was turned away.
 *
 * These are kept apart because they send the reader somewhere completely
 * different: `forbidden` is a permissions problem, `unauthenticated` is a
 * sign-in problem, and `unavailable` is not the reader's problem at all — the
 * backend that owns the JWT secret could not be reached. Collapsing all three
 * into one 403 "Admins only" is what made a backend outage look like a revoked
 * account, and sent reviewers hunting for the wrong fault while submissions sat
 * unread in the queue.
 */
export type AdminCheck =
  | { ok: true; caller: AdminCaller }
  | { ok: false; status: 401 | 403 | 503; error: string }

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
export async function requireAdmin(request: Request): Promise<AdminCheck> {
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  if (!token) {
    return { ok: false, status: 401, error: "Sign in with an admin account to see this." }
  }

  let base: string
  try {
    base = backendUrl()
  } catch {
    return {
      ok: false,
      status: 503,
      error:
        "This server has no backend URL configured, so admin access cannot be checked. Set NEXT_PUBLIC_BACKEND_URL.",
    }
  }

  let response: Response
  try {
    response = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
  } catch {
    // The backend is down or unreachable. Say so: the submissions themselves
    // are read straight from MongoDB and are fine, it is only the access check
    // that could not run.
    return {
      ok: false,
      status: 503,
      error: "Could not reach the backend to check your access. Nothing is lost — try again once it is up.",
    }
  }

  if (response.status === 401 || response.status === 403) {
    return { ok: false, status: 401, error: "Your session has expired. Sign in again." }
  }
  if (!response.ok) {
    return {
      ok: false,
      status: 503,
      error: `The backend could not confirm your access (HTTP ${response.status}). Try again shortly.`,
    }
  }

  const json = await response.json().catch(() => null)
  const user = json?.data?.user ?? json?.data ?? json?.user
  const role = String(user?.role ?? "").toLowerCase()
  if (!ADMIN_ROLES.includes(role)) {
    return { ok: false, status: 403, error: "Admins only." }
  }

  return { ok: true, caller: { token, email: String(user?.email ?? ""), role } }
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
