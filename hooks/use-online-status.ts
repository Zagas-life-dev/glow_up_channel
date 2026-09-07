"use client"

import { useSyncExternalStore } from "react"

/**
 * Whether the device currently has a network connection.
 *
 * `useSyncExternalStore` rather than state-plus-effect because that is exactly
 * what this is: a subscription to a browser value that changes outside React.
 * It also solves the server-render problem for free — the server snapshot says
 * "online", so the markup React produces on the server and the markup it
 * hydrates on the client agree, and the real value is applied on the first
 * commit rather than after a paint.
 *
 * Note the limit of `navigator.onLine`: false is reliable (the device knows it
 * has no interface), true only means *an* interface exists, not that anything
 * is reachable. So this is the right signal for "definitely offline, hide the
 * write actions" and the wrong one for "the network is healthy" — the service
 * worker's own timeout covers that second case.
 */

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  )
}

/**
 * The app is read-only whenever it is offline: writes cannot reach the API and
 * nothing is queued for later, so the honest thing is to take the controls away
 * rather than let them fail. Named separately from `useOnlineStatus` because
 * call sites read better for it, and because if a write queue is ever added this
 * is the one place that has to change.
 */
export function useReadOnly(): boolean {
  return !useOnlineStatus()
}
