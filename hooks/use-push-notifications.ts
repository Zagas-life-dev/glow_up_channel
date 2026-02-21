"use client"

import { useState, useEffect, useCallback } from "react"

const SW_URL = "/sw.js"

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
        const err = await keyRes.json().catch(() => ({}))
        setError(err?.error || "Could not get push key.")
        return false
      }
      const { publicKey } = await keyRes.json()
      if (!publicKey) {
        setError("VAPID public key not configured.")
        return false
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })

      const token =
        typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
      const subRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })
      if (!subRes.ok) {
        const err = await subRes.json().catch(() => ({}))
        setError(err?.error || "Failed to save subscription.")
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
      if (sub) await sub.unsubscribe()
      const token =
        typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })
      setIsSubscribed(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to unsubscribe")
    } finally {
      setIsLoading(false)
    }
  }, [isSupported])

  // Detect current subscription state
  useEffect(() => {
    if (!isSupported) return
    let cancelled = false
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((sub) => {
      if (!cancelled) setIsSubscribed(!!sub)
    })
    return () => {
      cancelled = true
    }
  }, [isSupported])

  return {
    permission,
    isSubscribed,
    isSupported,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
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
