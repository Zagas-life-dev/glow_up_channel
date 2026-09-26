"use client"

/**
 * One unrequested pop-up per visit.
 *
 * Each prompt that opens by itself (gift, extreme announcement, location
 * confirm, location permission, install) used to run on its own timer, so a
 * first visit could stack three of them. Now each one claims the visit's
 * single slot at the moment it would appear; whoever claims first owns the
 * visit and the rest wait for the next one — none of them is dismissed or
 * counted, so nothing is lost, only deferred.
 *
 * The later prompts already wait for the page to settle (2.5s and up), which
 * gives the gift and the extreme announcement — fetched on load — first claim.
 * The gift may also take the slot from an announcement, keeping the standing
 * rule that a gift always wins over an advertisement.
 *
 * Not in the queue, on purpose: the tracker's return sheet and the guest
 * sign-up nudge. Both answer something the reader just did.
 *
 * A "visit" is the tab's session (sessionStorage), so a reload does not hand
 * out a second slot.
 */

import { useEffect, useState } from "react"

export type Interruption = "gift" | "extreme" | "location-confirm" | "location-consent" | "install" | "push"

const KEY = "up-interruption-slot"

/** Who may take the slot from whom, while the holder has not been seen through. */
const TAKES_OVER: Partial<Record<Interruption, Interruption[]>> = {
  gift: ["extreme"],
}

let memoryHolder: Interruption | null = null

function readHolder(): Interruption | null {
  try {
    return (sessionStorage.getItem(KEY) as Interruption | null) ?? memoryHolder
  } catch {
    return memoryHolder
  }
}

function writeHolder(name: Interruption): void {
  memoryHolder = name
  try {
    sessionStorage.setItem(KEY, name)
  } catch {
    // Storage blocked: the in-memory holder still limits this page load.
  }
}

/** Claim the visit's slot. True when it is free, already ours, or ours to take. */
export function claimInterruption(name: Interruption): boolean {
  const holder = readHolder()
  if (holder === null || holder === name || TAKES_OVER[name]?.includes(holder)) {
    writeHolder(name)
    return true
  }
  return false
}

/**
 * `wants` is the prompt's own decision to appear; the result is whether it
 * may. Claims only when it wants to, so a prompt that never shows never
 * blocks the others.
 */
export function useInterruption(name: Interruption, wants: boolean): boolean {
  const [granted, setGranted] = useState(false)
  useEffect(() => {
    if (!wants) {
      setGranted(false)
      return
    }
    setGranted(claimInterruption(name))
  }, [name, wants])
  return wants && granted
}
