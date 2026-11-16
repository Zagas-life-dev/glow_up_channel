"use client"

/**
 * Group invite link landing: signed in, it joins you as a member and opens the
 * group; signed out, it sends you to log in and brings you back here.
 */

import { CreatorPreviewGate } from "@/components/creator/creator-preview-gate"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { RiGroupLine, RiLoader4Line } from "react-icons/ri"
import { PageShell } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { joinGroup } from "@/lib/groups"

function JoinGroupPageInner() {
  const params = useParams()
  const router = useRouter()
  const token = String(params.token || "")
  const { isAuthenticated, isLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading || !isAuthenticated || !token) return
    let live = true
    joinGroup(token)
      .then((d) => {
        if (live) router.replace(`/playlists/${d.playlistId}`)
      })
      .catch((err) => live && setError((err as Error).message || "This invite link is not valid."))
    return () => {
      live = false
    }
  }, [isAuthenticated, isLoading, token, router])

  const next = `/playlists/join/${encodeURIComponent(token)}`

  return (
    <PageShell className="font-sans">
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-up-lg bg-up-fill">
          <RiGroupLine className="h-7 w-7 text-up-orange" aria-hidden />
        </div>
        {error ? (
          <>
            <h1 className="font-display text-xl font-bold text-foreground">Can't join</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button asChild className="mt-6 h-11 px-6">
              <Link href="/playlists">Go to playlists</Link>
            </Button>
          </>
        ) : !isLoading && !isAuthenticated ? (
          <>
            <h1 className="font-display text-xl font-bold text-foreground">You're invited to a group</h1>
            <p className="mt-2 text-sm text-muted-foreground">Log in or sign up to join and see what everyone is applying for.</p>
            <Button asChild className="mt-6 h-11 px-6">
              <Link href={`/login?callbackUrl=${encodeURIComponent(next)}`}>Log in to join</Link>
            </Button>
          </>
        ) : (
          <>
            <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Joining the group…</p>
          </>
        )}
      </div>
    </PageShell>
  )
}

/** Staff preview: admins and super admins only for now (lib/creator-preview.ts). */
export default function JoinGroupPage() {
  return (
    <CreatorPreviewGate>
      <JoinGroupPageInner />
    </CreatorPreviewGate>
  )
}
