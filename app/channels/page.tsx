"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import ApiClient, { Channel } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { PageShell } from "@/components/layout/page-shell"
import { Hash, AlertTriangle } from "lucide-react"

type FilterTab = "all" | "public" | "private" | "mine"

export default function ChannelsPage() {
  const { isAuthenticated } = useAuth()
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterTab>("all")

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const type = filter === "public" ? "public" : filter === "private" ? "private" : undefined
        const data = await ApiClient.getChannels({
          page,
          limit: 20,
          type: filter === "mine" ? undefined : (type as any),
          search: search || undefined,
        })
        if (!cancelled) {
          const all = data.channels
          setChannels(filter === "mine" ? all.filter((c) => c.isOwner) : all)
          setTotalPages(data.totalPages)
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load channels")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [page, filter, search])

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  return (
    <PageShell fullWidth>
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 sm:p-5 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                <Hash className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Channels</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Join sub-communities focused on specific topics and conversations.</p>
              </div>
            </div>
            {isAuthenticated && (
              <Link href="/channels/create" className="shrink-0">
                <Button className="w-full sm:w-auto rounded-xl h-10 px-5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20 font-medium border-0">
                  Create channel
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(["all", "public", "private", "mine"] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setFilter(tab); setPage(1) }}
                  className={cn(
                    "px-3 py-2 text-xs font-medium rounded-xl transition-all border",
                    filter === tab
                      ? "bg-card/80 backdrop-blur-sm border-border/60 text-foreground shadow-sm"
                      : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-card/60"
                  )}
                >
                  {tab === "all" ? "All" : tab === "public" ? "Public" : tab === "private" ? "Private" : "My channels"}
                </button>
              ))}
            </div>
            <form onSubmit={onSearchSubmit} className="w-full md:w-64">
              <Input
                placeholder="Search channels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 text-sm rounded-xl bg-card/80 border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </form>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-2xl border border-border/70 bg-card/80 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" aria-hidden />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Unable to load channels</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : channels.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <Hash className="w-6 h-6 text-orange-500" aria-hidden />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No channels found</h3>
              <p className="text-sm text-muted-foreground">
                {isAuthenticated ? "Be the first to create a channel for a topic you care about." : "Sign in or refine your search to discover channels."}
              </p>
              {isAuthenticated && (
                <p className="text-xs text-muted-foreground mt-3">
                  Be the first to{" "}
                  <Link href="/channels/create" className="text-primary hover:underline">
                    create a channel
                  </Link>
                  .
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {channels.map((channel) => (
                <Link
                  key={channel._id}
                  href={`/channels/${encodeURIComponent(channel.slug)}`}
                  className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm px-5 py-4 hover:border-border hover:shadow-sm hover:bg-card transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <Hash className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-sm md:text-base text-foreground group-hover:text-primary transition-colors">{channel.name}</h2>
                      <span className={cn(
                        "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full",
                        channel.type === "public"
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground border border-border/60"
                      )}>
                        {channel.type}
                      </span>
                      {channel.isOwner && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Owner
                        </span>
                      )}
                    </div>
                    {channel.description && (
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
                        {channel.description}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {channel.memberCount} member{channel.memberCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              ))}

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-xl border-border/60 bg-card/80 hover:bg-card h-9 px-4"
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl border-border/60 bg-card/80 hover:bg-card h-9 px-4"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
