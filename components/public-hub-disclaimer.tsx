"use client"

import Link from "next/link"
import { RiShuffleLine, RiArrowRightLine } from "react-icons/ri"
import { useAuth } from "@/lib/auth-context"

/**
 * Says plainly how a hub page is ordered.
 *
 * These pages list everything that is live — nothing is hidden for being a weak
 * match — but each page is drawn with the best matches for the reader and the
 * soonest deadlines most likely near the top, and redrawn on every visit (see
 * `lib/public-hub-order`). So an unrelated listing turning up lower down is
 * the page working as designed, not a bad recommendation.
 *
 * Signed-in readers are matched on their profile as well; visitors on location
 * and language alone, which is why the call to action for them is sign-up.
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
            Best for you, reshuffled each visit
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You&apos;re seeing every {label} that&apos;s live. Your best matches and
            the ones closing soonest are most likely near the top, and the order
            changes on every visit — so weaker matches still get their turn.
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
