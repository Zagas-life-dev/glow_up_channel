"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import ApiClient from "@/lib/api-client"
import AuthGuard from "@/components/auth-guard"
import { PageShell } from "@/components/layout/page-shell"
import { PageHeader } from "@/components/layout/page-header"

export default function CreateChannelPage() {
  const router = useRouter()
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
    } catch (err: any) {
      setError(err?.message || "Failed to create channel")
    } finally {
      setLoading(false)
    }
  }

  const content = (
    <PageShell>
      <div className="max-w-xl mx-auto space-y-6 pt-6 pb-10">
        <PageHeader
          title="Create a channel"
          description="Channel names act as slugs (e.g. #dev-talk) and must be unique."
          icon={<span className="text-lg font-bold">#</span>}
          variant="gradient"
        />
        <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/70 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Channel name (slug)</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="dev-talk"
                className="h-10 text-sm bg-muted/60 border-border/60 rounded-xl focus:border-orange-500/60 focus:ring-orange-500/30"
              />
              <p className="text-[11px] text-muted-foreground">
                Lowercase, hyphens recommended; this will be used for tagging.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this channel about?"
                className="min-h-[80px] text-sm bg-muted/60 border-border/60 rounded-xl focus:border-orange-500/60 focus:ring-orange-500/30"
                maxLength={500}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Type</label>
              <div className="inline-flex rounded-full bg-muted/60 border border-border/60 p-1">
                {(["public", "private"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${type === t
                        ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {t === "public" ? "Public" : "Private"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Public: anyone can join. Private: requests must be approved.
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/channels")}
                className="h-9 text-sm rounded-full border-border/60 hover:bg-muted/60"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || loading}
                className="h-9 text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full shadow-md shadow-orange-500/20 font-semibold"
              >
                {loading ? "Creating…" : "Create channel"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  )

  return <AuthGuard>{content}</AuthGuard>
}
