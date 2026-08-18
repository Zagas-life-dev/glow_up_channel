"use client"

import Link from "next/link"
import { RiShuffleLine, RiArrowRightLine } from "react-icons/ri"
import { useAuth } from "@/lib/auth-context"
import { SectionCard } from "@/components/layout/section-card"

/**
 * Says plainly that a hub page is not personalized.
 *
 * These pages list everything that is live, ordered only by how soon it closes
 * (see `lib/public-hub-order`). Nothing here is filtered to the reader, which
 * means an unrelated listing turning up is the page working as designed, not a
 * bad recommendation — worth stating, because everything else in the product
 * that looks like a feed *is* ranked for the person reading it.
 *
 * Signed-in readers see the same note, since the page really does behave the
 * same for them; only the call to action changes, pointing at the feed they
 * already have rather than at sign-up.
 */
export default function PublicHubDisclaimer({ label }: { label: string }) {
  const { isAuthenticated } = useAuth()

  return (
    <SectionCard className="mb-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/20 to-rose-500/15">
          <RiShuffleLine className="h-5 w-5 text-orange-500" aria-hidden />
        </div>
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-foreground">
            This page isn&apos;t personalized
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            No recommendation algorithm runs here. You&apos;re seeing every {label}{" "}
            that&apos;s live, ordered by how soon it closes and reshuffled on each
            visit — so anything at all can show up, whether or not it fits you.
          </p>
          {isAuthenticated ? (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-500 transition-colors hover:text-orange-400"
            >
              Go to your personalized feed
              <RiArrowRightLine className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link
                href="/signup"
                className="font-medium text-orange-500 transition-colors hover:text-orange-400"
              >
                Sign up
              </Link>
              {" or "}
              <Link
                href="/login"
                className="font-medium text-orange-500 transition-colors hover:text-orange-400"
              >
                sign in
              </Link>
              {" to get a feed picked for you."}
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  )
}
