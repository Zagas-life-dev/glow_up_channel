"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import ApiClient, { Channel } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PageShell } from "@/components/layout/page-shell"
import { PageHeader } from "@/components/layout/page-header"
import { SectionCard } from "@/components/layout/section-card"
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
        <PageHeader
          title="Channels"
          description="Join sub-communities focused on specific topics and conversations."
          icon={<Hash className="w-5 h-5 text-orange-400" />}
          variant="gradient"
          actions={
            isAuthenticated ? (
              <Link href="/channels/create">
                <Button className="bg-primary hover:bg-primary/90 text-foreground rounded-full h-9 px-4">
                  Create channel
                </Button>
              </Link>
            ) : null
          }
        />

        <SectionCard className="mt-4" description={null}>
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div className="inline-flex rounded-full bg-muted p-1">
              {(["all", "public", "private", "mine"] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setFilter(tab)
                    setPage(1)
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                    filter === tab
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "all"
                    ? "All"
                    : tab === "public"
                    ? "Public"
                    : tab === "private"
                    ? "Private"
                    : "My channels"}
                </button>
              ))}
            </div>
            <form onSubmit={onSearchSubmit} className="w-full md:w-64">
              <Input
                placeholder="Search channels"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-sm"
              />
            </form>
          </div>
        </SectionCard>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-2xl border bg-card animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <SectionCard
              className="text-center"
              icon={<AlertTriangle className="w-5 h-5 text-orange-500" aria-hidden />}
              title="Unable to load channels"
              description={error}
            />
          ) : channels.length === 0 ? (
            <SectionCard
              className="text-center"
              icon={<Hash className="w-5 h-5 text-orange-500" aria-hidden />}
              title="No channels found"
              description={
                isAuthenticated
                  ? "Be the first to create a channel for a topic you care about."
                  : "Sign in or refine your search to discover channels."
              }
            >
              {isAuthenticated && (
                <p className="text-xs text-muted-foreground mt-3">
                  Be the first to{" "}
                  <Link href="/channels/create" className="text-primary underline">
                    create a channel
                  </Link>
                  .
                </p>
              )}
            </SectionCard>
          ) : (
            <div className="space-y-3">
              {channels.map((channel) => (
                <Link
                  key={channel._id}
                  href={`/channels/${encodeURIComponent(channel.slug)}`}
                  className="flex items-start justify-between gap-4 rounded-2xl border bg-card px-4 py-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-sm md:text-base">{channel.name}</h2>
                      <Badge
                        variant={channel.type === "public" ? "outline" : "secondary"}
                        className="text-[10px] uppercase"
                      >
                        {channel.type}
                      </Badge>
                    </div>
                    {channel.description && (
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                        {channel.description}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {channel.memberCount} member{channel.memberCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  {channel.isOwner && (
                    <Badge variant="secondary" className="text-[10px] uppercase mt-1">
                      Owner
                    </Badge>
                  )}
                </Link>
              ))}

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground flex items-center">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
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
