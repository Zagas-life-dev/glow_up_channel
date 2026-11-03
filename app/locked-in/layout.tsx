import type { Metadata } from "next"
import { LockedInProvider } from "@/contexts/locked-in-context"

export const metadata: Metadata = {
  title: "Locked In",
  description: "Track streaks and stay consistent with your goals on UP.",
}

/**
 * Locked In is retired, so its provider lives here rather than in the root
 * layout: every other page used to pay an active-session lookup on load.
 */
export default function LockedInLayout({ children }: { children: React.ReactNode }) {
  return <LockedInProvider>{children}</LockedInProvider>
}
