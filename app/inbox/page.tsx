"use client"

/**
 * In-app inbox for the Playlist Features notifications (playlist updates, creator
 * updates, later group activity). Every one of them also goes out as a push.
 * Not linked from the navigation yet: placement waits for the navigation restructure.
 */

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { RiInboxLine, RiLoader4Line, RiCheckDoubleLine } from "react-icons/ri"
import { PageShell } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { getInbox, markInboxRead, type InboxItem } from "@/lib/subscriptions"

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function InboxPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [items, setItems] = useState<InboxItem[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getInbox()
      setItems(data.items)
      setUnread(data.unread)
      setError(null)
    } catch (err) {
      setError((err as Error).message || "Couldn't load your inbox")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) void load()
    else if (!authLoading) setLoading(false)
  }, [isAuthenticated, authLoading, load])

  const markAll = async () => {
    await markInboxRead().catch(() => {})
    setItems((list) => list.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })))
    setUnread(0)
  }

  return (
    <PageShell className="font-sans">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="font-display text-[26px] font-bold text-foreground">
            Inbox{unread > 0 ? <span className="ml-2 text-base font-semibold text-up-orange">{unread} new</span> : null}
          </h1>
          {unread > 0 ? (
            <Button type="button" variant="outline" onClick={markAll} className="h-10">
              <RiCheckDoubleLine className="mr-1.5 h-4 w-4" />
              Mark all read
            </Button>
          ) : null}
        </div>

        {!isAuthenticated && !authLoading ? (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="font-semibold text-foreground underline">Sign in</Link> to see your updates.
          </p>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <RiInboxLine className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nothing yet. Save a public playlist or subscribe to a creator to get updates here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-up-lg border border-border bg-card">
            {items.map((item) => (
              <li key={item._id}>
                <Link
                  href={item.url || "/"}
                  onClick={() => {
                    if (!item.readAt) void markInboxRead([item._id]).catch(() => {})
                  }}
                  className={cn("flex min-h-14 gap-3 px-4 py-3 transition-colors hover:bg-up-fill", !item.readAt && "bg-up-orange-tint/40")}
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", item.readAt ? "bg-transparent" : "bg-up-orange")} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                    <span className="block text-[13px] text-muted-foreground">{item.body}</span>
                  </span>
                  <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{timeAgo(item.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}
