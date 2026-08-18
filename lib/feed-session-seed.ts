"use client"

/**
 * The per-feed-session shuffle seed.
 *
 * The backend orders the feed by re-running a seeded shuffle on every request
 * and then slicing the requested page out of the result. That makes the seed
 * load-bearing for pagination: if it changed between page 1 and page 2, the
 * cursor would be looked up in a differently ordered array and infinite scroll
 * would duplicate and skip items. So the seed cannot simply be random per
 * request.
 *
 * It also cannot be *too* stable, which was the old behaviour — the server
 * derived it from `hash(userId : 30-minute window)`, so every refresh inside
 * half an hour returned a byte-identical feed.
 *
 * The resolution is to scope the seed to a browsing session: mint one per page
 * load and replay it for every page of that session.
 *
 *   - refresh (F5)          -> new boot id -> new seed -> genuinely new order
 *   - scrolling for more    -> same seed   -> pagination stays correct
 *   - navigating away/back  -> same seed   -> the restored feed still paginates
 *
 * Boot id is reused rather than reinvented so this stays in lockstep with the
 * session feed caches in `page-state-session` and `content-cache-session`,
 * which are invalidated on exactly the same boundary. A seed that outlived
 * those caches (or vice versa) would mean restoring cached items ordered under
 * a seed the next page request no longer uses.
 */

import { getBootId } from "@/lib/page-state-session"

const SEED_KEY = "glowup_feed_seed"

interface StoredSeed {
  boot: string
  seed: number
}

/**
 * Fallback for private-mode browsers and anywhere sessionStorage throws. Held
 * for the life of the JS module, which is the same lifetime as the page — so
 * pagination still works, and a refresh still re-mints.
 */
let memorySeed: number | null = null

function mintSeed(): number {
  // uint32, which is what the server's PRNG consumes. `crypto` where available
  // so two tabs opened in the same millisecond do not collide onto one order.
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return crypto.getRandomValues(new Uint32Array(1))[0]
  }
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/**
 * The seed for this feed session, minting one on first call.
 *
 * Returns null during SSR — callers should omit the seed from the request
 * rather than send a placeholder, so the server falls back to its own seed
 * instead of every server-rendered visitor sharing one ordering.
 */
export function getFeedSessionSeed(): number | null {
  if (typeof window === "undefined") return null

  const storage = getStorage()
  if (!storage) {
    if (memorySeed === null) memorySeed = mintSeed()
    return memorySeed
  }

  try {
    const boot = getBootId()
    const raw = storage.getItem(SEED_KEY)
    if (raw) {
      const stored = JSON.parse(raw) as StoredSeed
      if (stored.boot === boot && Number.isFinite(stored.seed)) return stored.seed
    }

    const seed = mintSeed()
    storage.setItem(SEED_KEY, JSON.stringify({ boot, seed } satisfies StoredSeed))
    return seed
  } catch {
    if (memorySeed === null) memorySeed = mintSeed()
    return memorySeed
  }
}

/**
 * Force a new ordering without a page reload — for an explicit "refresh feed"
 * control or pull-to-refresh.
 *
 * Callers must clear the feed and re-fetch from page one afterwards. Keeping
 * already-rendered items while changing the seed would break the cursor for
 * the same reason a per-request seed would.
 */
export function rotateFeedSessionSeed(): number {
  const seed = mintSeed()
  memorySeed = seed

  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(SEED_KEY, JSON.stringify({ boot: getBootId(), seed } satisfies StoredSeed))
    } catch {
      // in-memory seed above still applies
    }
  }
  return seed
}
