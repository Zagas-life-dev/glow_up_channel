"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { RiExternalLinkLine } from "react-icons/ri"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { authHref, savePendingIntent } from "@/lib/pending-intent"
import { guestApplyArm, recordGuestApplyEvent, type GuestApplyArm } from "@/lib/guest-apply-test"

type Kind = "job" | "opportunity" | "event" | "resource"

/**
 * The Apply button a signed-out visitor sees on a listing page, by test arm
 * (lib/guest-apply-test). Signed-in readers keep the page's own button.
 *
 * The arm is read after mount, so the server render and first paint are the
 * current "Sign in to apply"; the open arm swaps in the real button straight after.
 */
export default function GuestApplyButton({
  kind,
  id,
  href,
  label,
  wallLabel = "Sign in to apply",
}: {
  kind: Kind
  id: string
  /** The cleaned external application URL. */
  href: string
  /** e.g. "Apply on jobs.example.com", or "Register" for events. */
  label: string
  /** The wall arm's text. */
  wallLabel?: string
}) {
  const [arm, setArm] = useState<GuestApplyArm>("wall")
  const leftToApply = useRef(false)
  const returnTo = `/${kind === "opportunity" ? "opportunities" : `${kind}s`}/${id}`

  useEffect(() => {
    // Reading localStorage has to wait for the client; this is a one-time sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setArm(guestApplyArm())
  }, [])

  // Open arm: when the guest comes back from the application, offer to track it.
  useEffect(() => {
    if (arm !== "open") return
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !leftToApply.current) return
      leftToApply.current = false
      recordGuestApplyEvent("track_ask_shown", kind, id, arm)
      const signup = authHref("/signup", { returnTo, action: "track", kind, id })
      toast("Did you apply?", {
        description: "Track it on UP and we'll remind you before it closes. Free, takes a minute.",
        duration: 15000,
        action: {
          label: "Track it",
          onClick: () => {
            recordGuestApplyEvent("signup_start", kind, id, arm)
            savePendingIntent({ returnTo, action: "track", kind, id, source: "guest_apply_track" })
            window.location.assign(signup)
          },
        },
      })
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [arm, kind, id, returnTo])

  if (arm === "open") {
    return (
      <Button asChild size="lg" className="h-14 w-full rounded-full text-base font-bold">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            leftToApply.current = true
            recordGuestApplyEvent("guest_apply", kind, id, arm)
          }}
        >
          <span className="truncate">{label}</span>
          <RiExternalLinkLine className="h-4 w-4 flex-shrink-0" aria-hidden />
        </a>
      </Button>
    )
  }

  return (
    <Button asChild size="lg" className="h-14 w-full rounded-full text-base font-bold">
      <Link
        href={authHref("/login", { returnTo, action: "apply", kind, id })}
        onClick={() => {
          recordGuestApplyEvent("apply_wall_tap", kind, id, arm)
          recordGuestApplyEvent("signup_start", kind, id, arm)
          savePendingIntent({ returnTo, action: "apply", kind, id, source: "apply_wall" })
        }}
      >
        {wallLabel}
        <RiExternalLinkLine className="h-4 w-4" aria-hidden />
      </Link>
    </Button>
  )
}
