"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Bell, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { PageShell } from "@/components/layout/page-shell"
import PageSkeleton from "@/components/skeletons/page-skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
  const headers: Record<string, string> = {}
  if (token) headers["Authorization"] = `Bearer ${token}`
  return headers
}

type NotificationItem = {
  _id: string
  type: string
  actor?: { _id: string; firstName?: string; email?: string }
  target?: { type: string; id: string; preview?: string }
  message?: string
  isRead: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    fetch(`${API_BASE_URL}/api/notifications?page=${page}&limit=20`, {
      headers: getAuthHeaders()
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data?.success && Array.isArray(data?.data?.notifications)) {
          setNotifications((prev) => (page === 1 ? data.data.notifications : [...prev, ...data.data.notifications]))
          setHasMore(!!data.data.hasMore)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, page])

  if (authLoading) return <PageSkeleton />
  if (!user) {
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto pt-safe pt-4 px-4">
          <p className="text-muted-foreground">Sign in to view notifications.</p>
          <Button asChild className="mt-4 rounded-xl">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell className="pb-20 md:pb-8">
      <div className="max-w-2xl mx-auto pt-safe pt-4 px-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link
            href="/"
            className="p-2.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </h1>
          <div className="w-10" />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
          {loading && page === 1 ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No notifications yet.</p>
              <p className="mt-1">When someone mentions you or interacts with your content, it will show here.</p>
              <Link href="/profile/settings?tab=notifications" className="text-primary hover:underline text-sm mt-3 inline-block">
                Manage notification settings
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {notifications.map((n) => (
                <li
                  key={n._id}
                  className={cn(
                    "p-4 hover:bg-muted/30 transition-colors",
                    !n.isRead && "bg-primary/5"
                  )}
                >
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        {n.message || (n.actor?.firstName || n.actor?.email ? `${n.actor.firstName || n.actor.email} — ${n.type}` : n.type)}
                      </p>
                      {n.target?.preview && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.target.preview}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleDateString(undefined, { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!loading && notifications.length > 0 && hasMore && (
            <div className="p-3 border-t border-border/60 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setPage((p) => p + 1)}
              >
                Load more
              </Button>
            </div>
          )}
        </div>

        <p className="text-center mt-4">
          <Link href="/profile/settings?tab=notifications" className="text-sm text-primary hover:underline">
            Notification settings
          </Link>
        </p>
      </div>
    </PageShell>
  )
}
