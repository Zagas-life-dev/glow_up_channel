"use client"

/** Groups and shared tracking. Backend: latest-glowup-channel/src/routes/groups.js. */

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"

function authHeaders(): HeadersInit {
  const out: Record<string, string> = { "Content-Type": "application/json" }
  try {
    const token = localStorage.getItem("accessToken")
    if (token) out.Authorization = `Bearer ${token}`
  } catch {
    // Storage blocked.
  }
  return out
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    method,
    headers: authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) {
    throw Object.assign(new Error(json?.message || "Request failed"), { status: res.status, code: json?.code })
  }
  return (json.data ?? {}) as T
}

export type GroupActivity = {
  _id: string
  type: "member_joined" | "member_left" | "item_added" | "item_removed" | "status_changed" | "deadline_soon"
  actor: { _id: string; firstName: string | null } | null
  title: string | null
  status: string | null
  createdAt: string
}

export type GroupTrackingItem = {
  contentId: string
  contentType: string
  myStatus: string | null
  members: { userId: string; firstName: string | null; label: string }[]
  applied: number
}

export type DirectStatus = "started" | "submitted" | "not_for_me"

const p = (id: string) => `/playlists/${encodeURIComponent(id)}`

export const createInviteLink = (id: string) => request<{ inviteLink: { token: string; expiresAt: string } }>("POST", `${p(id)}/invite-link`)
export const revokeInviteLink = (id: string) => request<object>("DELETE", `${p(id)}/invite-link`)
export const joinGroup = (token: string) => request<{ playlistId: string; already: boolean }>("POST", `/playlists/join/${encodeURIComponent(token)}`)
export const getGroupActivity = (id: string) => request<{ activity: GroupActivity[] }>("GET", `${p(id)}/activity`)
export const getGroupTracking = (id: string) =>
  request<{ memberCount: number; myStatusVisible: boolean | null; items: GroupTrackingItem[] }>("GET", `${p(id)}/tracking`)
export const getMyStatuses = (id: string) => request<{ statuses: Record<string, string> }>("GET", `${p(id)}/my-status`)
export const setGroupStatus = (id: string, contentType: string, contentId: string, status: DirectStatus) =>
  request<{ status: string }>("POST", `${p(id)}/status`, { contentType, contentId, status })
export const setStatusVisible = (id: string, statusVisible: boolean) =>
  request<{ statusVisible: boolean }>("PATCH", `${p(id)}/members/me`, { statusVisible })
export const leavePlaylist = (id: string) => request<object>("DELETE", `${p(id)}/members/me`)

/** The viewer's own status as a badge on any playlist item. */
export const MY_STATUS_LABEL: Record<string, string> = {
  pending: "Looking",
  started: "Started",
  submitted: "Submitted",
  accepted: "Got it",
  declined: "Closed",
  no_response: "Closed",
  not_for_me: "Not for me",
  used: "Used",
  not_useful: "Not useful",
  other: "Didn't apply",
  unknown: "No answer",
}

export function inviteUrl(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  return `${origin}/playlists/join/${token}`
}
