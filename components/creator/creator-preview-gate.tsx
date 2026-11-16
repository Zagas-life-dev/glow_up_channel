"use client"

/**
 * Wraps a page that is still in staff preview (see lib/creator-preview.ts). Admins and
 * super admins get the page; everyone else gets a short "coming soon" card, so a shared
 * link never shows a broken or half-loaded page.
 */

import Link from "next/link"
import { RiSparkling2Line } from "react-icons/ri"
import { Button } from "@/components/ui/button"
import { useCreatorPreview } from "@/lib/creator-preview"

export function CreatorPreviewGate({ children }: { children: React.ReactNode }) {
  const { allowed, isLoading } = useCreatorPreview()

  if (isLoading) return <div className="min-h-[50vh]" aria-busy="true" />
  if (allowed) return <>{children}</>

  return (
    <div className="mx-auto mt-16 max-w-sm px-4 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-up-md bg-up-fill">
        <RiSparkling2Line className="h-5 w-5 text-up-orange" aria-hidden />
      </div>
      <h1 className="font-display text-xl font-bold text-foreground">Coming soon</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        We&apos;re putting the finishing touches on this. Check back soon.
      </p>
      <Button asChild className="mt-6 h-11 px-6">
        <Link href="/playlists">Browse playlists</Link>
      </Button>
    </div>
  )
}
