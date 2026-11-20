"use client"

/**
 * Staff preview for the Creators Program and the new playlist features (creator
 * dashboard and earnings, subscribe to creators, the Subscriptions tab, playlist bells,
 * the inbox, group playlists, the program invite popup).
 *
 * While STAFF_ONLY is true, only admin and super_admin accounts see any of it, so they
 * can try it on the live site first. Everyone else sees the platform as it was.
 * To open it to everyone, set STAFF_ONLY to false; nothing else needs to change.
 *
 * This hides the features in the app. The backend endpoints still answer, so treat it
 * as a soft launch, not an access control.
 */

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { isAdminOrSuperAdmin } from "@/lib/roles"
import { getMyProgram } from "@/lib/creator"

export const STAFF_ONLY = true

export function canSeeCreatorFeatures(role: string | null | undefined): boolean {
  return !STAFF_ONLY || isAdminOrSuperAdmin(role)
}

/**
 * "Added to the Creators Program": invited or a member. Used for the Creator dashboard
 * link in the sidebar, the way Provider hub and Monitor show only for their roles.
 * Removed creators and people never invited do not get the link.
 */
export function isInCreatorProgram(status: string | null | undefined): boolean {
  return status === "invited" || status === "member"
}

// One program lookup per user per page session, shared by every caller.
const programStatusCache = new Map<string, Promise<string | null>>()

/** Program status for the signed-in user, or null while loading / signed out / not allowed. */
export function useCreatorProgramStatus(): string | null {
  const { user, isLoading } = useAuth()
  const allowed = !isLoading && canSeeCreatorFeatures(user?.role)
  const [status, setStatus] = useState<string | null>(null)
  const uid = user?._id ?? null

  useEffect(() => {
    if (!allowed || !uid) {
      setStatus(null)
      return
    }
    let live = true
    let pending = programStatusCache.get(uid)
    if (!pending) {
      pending = getMyProgram().then((p) => p.status).catch(() => null)
      programStatusCache.set(uid, pending)
    }
    pending.then((s) => live && setStatus(s))
    return () => {
      live = false
    }
  }, [allowed, uid])

  return status
}

/** `allowed` is false while sign-in is still loading, so nothing flashes for everyone. */
export function useCreatorPreview(): { allowed: boolean; isLoading: boolean } {
  const { user, isLoading } = useAuth()
  return { allowed: !isLoading && canSeeCreatorFeatures(user?.role), isLoading }
}
