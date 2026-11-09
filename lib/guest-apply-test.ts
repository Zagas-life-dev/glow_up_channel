/**
 * Guest-apply test (guest-apply-2026-11): signed-out visitors split 50/50.
 *
 *   wall  today's "Sign in to apply" button.
 *   open  the real "Apply on <site>" button; when the guest comes back to the tab,
 *         a "Did you apply? Track it" ask that leads to sign-up.
 *
 * The arm is drawn once per browser and kept in localStorage, separately from the
 * Stories buckets (those are server-side, signed-in users only). Events go to the
 * anonymous engagement endpoint with the arm, so the backend can compare applies and
 * sign-ups per arm (guestApplyTestService).
 */

import { getOrCreateAnonId } from "@/lib/anon-id"

export type GuestApplyArm = "wall" | "open"
export type GuestApplyAction = "apply_wall_tap" | "guest_apply" | "track_ask_shown" | "signup_start"
type Kind = "job" | "opportunity" | "event" | "resource"

const KEY = "up-guest-apply-arm"

export function guestApplyArm(random: () => number = Math.random): GuestApplyArm {
  if (typeof window === "undefined") return "wall"
  try {
    const stored = window.localStorage.getItem(KEY)
    if (stored === "wall" || stored === "open") return stored
    const arm: GuestApplyArm = random() < 0.5 ? "wall" : "open"
    window.localStorage.setItem(KEY, arm)
    return arm
  } catch {
    // No storage: no stable arm, so keep the current behaviour and log nothing.
    return "wall"
  }
}

export function recordGuestApplyEvent(action: GuestApplyAction, kind: Kind, id: string, arm: GuestApplyArm): void {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL
  if (!backend || typeof window === "undefined") return
  const anonId = getOrCreateAnonId()
  if (!anonId) return
  void fetch(`${backend.replace(/\/$/, "")}/api/feed/anonymous/engage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anonId, contentId: id, contentType: kind, action, arm }),
    keepalive: true,
  }).catch(() => {})
}
