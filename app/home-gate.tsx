"use client"

import dynamic from "next/dynamic"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import LandingPage from "@/components/landing/landing-page"

/**
 * The signed-in feed, loaded only for readers who will see it. It pulls in the
 * ranking stack (lib/nlp, lib/ranking and the 196 KB taxonomy JSON, ~115 KB of JS
 * decoded). Imported statically, every signed-out visitor on "/" downloaded and
 * parsed it just to be shown the marketing page.
 */
const loadFeed = () => import("./home-client")
const HomeFeed = dynamic(loadFeed, { ssr: false, loading: () => <div className="min-h-screen" /> })

function hasStoredSession(): boolean {
  try {
    return Boolean(window.localStorage.getItem("accessToken"))
  } catch {
    return false
  }
}

export default function HomeGate() {
  const { isAuthenticated, isLoading } = useAuth()

  // A stored token means the feed is coming: start its download while auth settles.
  useEffect(() => {
    if (hasStoredSession()) void loadFeed()
  }, [])

  if (isLoading) return <div className="min-h-screen" />
  if (!isAuthenticated) return <LandingPage />
  return <HomeFeed />
}
