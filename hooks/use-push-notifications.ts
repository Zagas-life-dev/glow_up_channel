"use client"

import { useState, useEffect, useCallback } from "react"
import { ApiClient } from "@/lib/api-client"

const SW_URL = "/sw.js"

/** POST/DELETE with the stored access token; on a 401 refresh it once and retry,
 *  because the raw token in localStorage is often a stale one and a 401 here used
 *  to mean the device was never saved. */
async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    return fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })
  }
  let res = await send()
  if (res.status === 401 && (await ApiClient.refreshTokenIfNeeded().catch(() => false))) {
    res = await send()
  }
  return res
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null)
  return data?.error || data?.message || fallback
}

/** iPhones and iPads only deliver web push to the installed app. */
function iosNeedsInstall(): boolean {
  if (typeof window === "undefined") return false
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  return ios && !standalone
}

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported"

export interface UsePushNotificationsResult {
  permission: PushPermissionState
  isSubscribed: boolean
  isSupported: boolean
  isLoading: boolean
  error: string | null
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<void>
  requestPermission: () => Promise<PushPermissionState>
  /** True on iOS Safari outside the installed app, where push cannot work. */
  needsInstall: boolean
  /** Asks the server to push a test message to this user's saved devices. */
  sendTest: () => Promise<{ ok: boolean; message: string }>
}

function getPermissionState(permission: NotificationPermission | null): PushPermissionState {
  if (typeof Notification === "undefined" || permission == null) return "unsupported"
  if (permission === "granted") return "granted"
  if (permission === "denied") return "denied"
  return "default"
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [permission, setPermission] = useState<PushPermissionState>("unsupported")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window

  const updatePermission = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    setPermission(getPermissionState(Notification.permission))
  }, [])

  useEffect(() => {
    if (!isSupported) return
    updatePermission()
  }, [isSupported, updatePermission])

  const requestPermission = useCallback(async (): Promise<PushPermissionState> => {
    if (!isSupported || typeof Notification === "undefined") {
      setPermission("unsupported")
      return "unsupported"
    }
    const result = await Notification.requestPermission()
    setPermission(getPermissionState(result))
    return getPermissionState(result)
  }, [isSupported])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Push notifications are not supported in this browser.")
      return false
    }
    setError(null)
    setIsLoading(true)
    try {
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" })
      await reg.update()
      await navigator.serviceWorker.ready

      let perm = Notification.permission
      if (perm === "default") {
        perm = await Notification.requestPermission()
        setPermission(getPermissionState(perm))
      }
      if (perm !== "granted") {
        setError("Notification permission was denied.")
        return false
      }

      const keyRes = await fetch("/api/push/vapid-public-key")
      if (!keyRes.ok) {
        setError(await errorMessage(keyRes, "Could not get push key."))
        return false
      }
      const { publicKey } = await keyRes.json()
      if (!publicKey) {
        setError("VAPID public key not configured.")
        return false
      }

      const applicationServerKey = urlBase64ToUint8Array(publicKey) as BufferSource
      let subscription: PushSubscription
      try {
        subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
      } catch (e) {
        // An old subscription made under a different key blocks a new one.
        if (e instanceof DOMException && e.name === "InvalidStateError") {
          await (await reg.pushManager.getSubscription())?.unsubscribe()
          subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
        } else {
          throw e
        }
      }

      const subRes = await authedFetch("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })
      if (!subRes.ok) {
        // Do not leave the browser holding a subscription the server never stored.
        await subscription.unsubscribe().catch(() => {})
        setError(await errorMessage(subRes, "Failed to save subscription."))
        return false
      }
      setIsSubscribed(true)
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to subscribe"
      setError(msg)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported])

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return
    setIsLoading(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      const endpoint = sub?.endpoint
      if (sub) await sub.unsubscribe()
      await authedFetch("/api/push/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint }),
      }).catch(() => {})
      setIsSubscribed(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to unsubscribe")
    } finally {
      setIsLoading(false)
    }
  }, [isSupported])

  // Detect current subscription state, and re-save it on the server. A browser
  // keeps its subscription across sign-outs, token expiry and a wiped database;
  // the server row does not follow. The upsert is idempotent, so doing it once
  // per load keeps the two in step without the user touching anything.
  useEffect(() => {
    if (!isSupported) return
    let cancelled = false
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        if (cancelled) return
        setIsSubscribed(!!sub)
        if (!sub || Notification.permission !== "granted") return
        if (!localStorage.getItem("accessToken")) return
        await authedFetch("/api/push/subscribe", {
          method: "POST",
          body: JSON.stringify({ subscription: sub.toJSON() }),
        }).catch(() => {})
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isSupported])

  const sendTest = useCallback(async () => {
    try {
      const res = await authedFetch("/api/push/test", { method: "POST" })
      const data = await res.json().catch(() => null)
      if (!res.ok) return { ok: false, message: data?.error || data?.message || "Test failed." }
      return { ok: (data?.sent ?? 0) > 0, message: data?.message || "Test sent." }
    } catch {
      return { ok: false, message: "Could not reach the server." }
    }
  }, [])

  const [needsInstall, setNeedsInstall] = useState(false)
  useEffect(() => setNeedsInstall(iosNeedsInstall()), [])

  return {
    permission,
    isSubscribed,
    isSupported,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
    needsInstall,
    sendTest,
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}
