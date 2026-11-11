"use client"

/**
 * Creator subscriptions, the playlist bell, and the in-app inbox.
 * Backend: latest-glowup-channel/src/routes/creators.js and PATCH /api/playlists/saved/:id/notify.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"

function authHeaders(): HeadersInit {
  const out: Record<string, string> = { "Content-Type": "application/json" }
  try {
    const token = localStorage.getItem("accessToken")
    if (token) out.Authorization = `Bearer ${token}`
  } catch {
    // Storage blocked: carry on signed out.
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
  return json.data as T
}

export type CreatorSubscription = { subscribed: boolean; alsoPlaylists: boolean; subscriberCount: number }

export function getCreatorSubscription(creatorId: string) {
  return request<CreatorSubscription>("GET", `/creators/${encodeURIComponent(creatorId)}/subscription`)
}

export function subscribeToCreator(creatorId: string, alsoPlaylists: boolean) {
  return request<CreatorSubscription & { playlistsSubscribed: number }>(
    "POST",
    `/creators/${encodeURIComponent(creatorId)}/subscribe`,
    { alsoPlaylists },
  )
}

export function unsubscribeFromCreator(creatorId: string) {
  return request<CreatorSubscription>("DELETE", `/creators/${encodeURIComponent(creatorId)}/subscribe`)
}

export type SubscribedCreator = {
  creatorId: string
  firstName: string | null
  lastName: string | null
  profileImage: string | null
  subscriberCount: number
  alsoPlaylists: boolean
  since: string
  publicPlaylistCount: number
  /** Their newest public playlists, up to 3. */
  playlists: { _id: string; name: string; itemCount: number; coverImage: string | null; saveCount: number; updatedAt: string | null }[]
}

/** Creators I subscribe to, newest subscription first, with their newest public playlists. */
export function getMySubscriptions() {
  return request<{ creators: SubscribedCreator[] }>("GET", "/creators/subscriptions")
}

export function setPlaylistBell(playlistId: string, notify: boolean) {
  return request<{ bell: boolean }>("PATCH", `/playlists/saved/${encodeURIComponent(playlistId)}/notify`, { notify })
}

export type InboxItem = {
  _id: string
  kind: string
  title: string
  body: string
  url: string
  createdAt: string
  readAt: string | null
}

export function getInbox(before?: string) {
  const q = before ? `?before=${encodeURIComponent(before)}` : ""
  return request<{ items: InboxItem[]; unread: number }>("GET", `/inbox${q}`)
}

export function markInboxRead(ids?: string[]) {
  return request<{ marked: number }>("POST", "/inbox/read", ids ? { ids } : {})
}
