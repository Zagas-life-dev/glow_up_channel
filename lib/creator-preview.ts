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

import { useAuth } from "@/lib/auth-context"
import { isAdminOrSuperAdmin } from "@/lib/roles"

export const STAFF_ONLY = true

export function canSeeCreatorFeatures(role: string | null | undefined): boolean {
  return !STAFF_ONLY || isAdminOrSuperAdmin(role)
}

/** `allowed` is false while sign-in is still loading, so nothing flashes for everyone. */
export function useCreatorPreview(): { allowed: boolean; isLoading: boolean } {
  const { user, isLoading } = useAuth()
  return { allowed: !isLoading && canSeeCreatorFeatures(user?.role), isLoading }
}
