"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import ApiClient from "@/lib/api-client"
import AuthGuard from "@/components/auth-guard"
import { useAuth } from "@/lib/auth-context"
import { hasPremiumAccess } from "@/lib/roles"
import { PageShell } from "@/components/layout/page-shell"
import { cn } from "@/lib/utils"
import { ChannelsSurface } from "../_components/channels-surface"

export default function CreateChannelPage() {
  const router = useRouter()
  const { user } = useAuth()
  const canCreate = hasPremiumAccess({ isPremium: user?.isPremium, role: user?.role })
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<"public" | "private">("public")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setLoading(true)
    try {
      const channel = await ApiClient.createChannel({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
      })
      router.push(`/channels/${encodeURIComponent(channel.slug)}`)
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to create channel")
    } finally {
      setLoading(false)
    }
  }

  const content = (
    <ChannelsSurface withAtmosphere>
      <PageShell fullWidth className="relative">
        <div className="mx-auto max-w-xl px-0 pb-10 pt-2 sm:pt-4">
          <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border/50 bg-page/90 px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-page/75 sm:static sm:mx-0 sm:mb-6 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
            <Link
              href="/channels"
              className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <ArrowLeft className="h-4 w-4" />
              </span>
              <span className="hidden sm:inline">Back to channels</span>
            </Link>
          </div>

          <header className="mb-6 px-1 sm:px-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">New space</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
              Create a channel
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Names become URL slugs (e.g. <span className="font-mono text-xs text-foreground/80">dev-talk</span>) and must be unique.
            </p>
          </header>

          {!canCreate ? (
            <div className="rounded-[1.35rem] border border-border/70 bg-card/90 p-6 text-center backdrop-blur-sm sm:p-8">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Creating channels is a Premium feature. Upgrade to start your own topic spaces.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button type="button" asChild className="h-11 rounded-2xl">
                  <Link href="/premium">Upgrade to Premium</Link>
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/channels")} className="h-11 rounded-2xl">
                  Back to channels
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.35rem] border border-border/70 bg-card/85 p-4 backdrop-blur-sm sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channel name (slug)</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="dev-talk"
                    className="h-12 rounded-2xl border-border/70 bg-muted/40 text-base sm:h-11 sm:text-sm"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-muted-foreground">Lowercase and hyphens work best; used for links and discovery.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this channel about?"
                    className="min-h-[100px] rounded-2xl border-border/70 bg-muted/40 text-base sm:text-sm"
                    maxLength={500}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visibility</label>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-muted/30 p-1">
                    {(["public", "private"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={cn(
                          "min-h-11 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-[0.99]",
                          type === t
                            ? "bg-card text-primary shadow-sm ring-1 ring-primary/25"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t === "public" ? "Public" : "Private"}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Public: open join. Private: you approve requests.</p>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/channels")}
                    className="h-11 min-h-11 rounded-2xl border-border/70 sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!name.trim() || loading}
                    className="h-11 min-h-11 rounded-2xl bg-primary px-8 text-primary-foreground shadow-md shadow-primary/20 sm:w-auto"
                  >
                    {loading ? "Creating…" : "Create channel"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </PageShell>
    </ChannelsSurface>
  )

  return <AuthGuard>{content}</AuthGuard>
}
