"use client"

import Link from "next/link"
import { RiShuffleLine, RiArrowRightLine } from "react-icons/ri"
import { useAuth } from "@/lib/auth-context"

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
    <div className="mb-5 rounded-up-xl bg-up-fill px-[18px] py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-up-sm bg-card text-foreground">
          <RiShuffleLine className="h-[18px] w-[18px]" aria-hidden />
        </div>
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-bold text-foreground">
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
              className="inline-flex items-center gap-1.5 text-sm font-bold text-up-orange-ink underline-offset-4 transition-colors hover:underline"
            >
              Go to your personalized feed
              <RiArrowRightLine className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link
                href="/signup"
                className="font-bold text-up-orange-ink underline-offset-4 transition-colors hover:underline"
              >
                Sign up
              </Link>
              {" or "}
              <Link
                href="/login"
                className="font-bold text-up-orange-ink underline-offset-4 transition-colors hover:underline"
              >
                sign in
              </Link>
              {" to get a feed picked for you."}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
