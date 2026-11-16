"use client"

/**
 * Creator dashboard (Creators Program spec). Every creator gets the analytics;
 * earnings and payouts arrive with the program ledger and cash-out stages.
 *
 * Tabs: Overview (headline numbers, progress to 1,000, traffic sources, top lists),
 * Playlists (per-list unique viewers, block progress, subscribers, active status,
 * earning picks for grandfathered creators), Requests (ask UP to add a listing),
 * Tips (team-editable).
 *
 * Bars are one series each (one hue, values always printed beside them), so there is
 * no legend; the colour was run through the dataviz validator: #FF6A00 light (contrast
 * WARN, relieved by the printed values) and #E85F00 dark.
 */

import { CreatorPreviewGate } from "@/components/creator/creator-preview-gate"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  RiBarChartBoxLine,
  RiEyeLine,
  RiUserFollowLine,
  RiPlayList2Line,
  RiPulseLine,
  RiLoader4Line,
  RiLinkM,
  RiLightbulbLine,
  RiCheckLine,
  RiLockLine,
} from "react-icons/ri"
import { toast } from "sonner"
import { PageShell } from "@/components/layout/page-shell"
import { EarningsPanel } from "@/components/creator/earnings-panel"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { formatCount } from "@/lib/playlist-engagement"
import {
  getCreatorDashboard,
  naira,
  getCreatorTips,
  getMyListingRequests,
  sendListingRequest,
  setEarningPicks,
  type CreatorDashboard,
  type DashboardPlaylist,
  type ListingRequest,
  type TrafficSource,
} from "@/lib/creator"

type Tab = "overview" | "earnings" | "playlists" | "requests" | "tips"
const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "earnings", label: "Earnings" },
  { value: "playlists", label: "Playlists" },
  { value: "requests", label: "Request a listing" },
  { value: "tips", label: "Tips" },
]

const SOURCE_LABEL: Record<TrafficSource, string> = {
  shared_link: "Shared links",
  direct_link: "Direct links",
  in_app: "Inside UP",
  signup: "New signups",
}

const BAR = "bg-[#FF6A00] dark:bg-[#E85F00]"

function Stat({ icon: Icon, label, value, hint }: { icon: typeof RiEyeLine; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-up-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </div>
      <div className="mt-1 font-display text-[28px] font-bold tabular-nums text-foreground">{value}</div>
      {hint ? <div className="text-[12px] text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

/** A thin horizontal bar with its value printed: the value is the label, not the colour. */
function Meter({ value, max, label, title }: { value: number; max: number; label: string; title: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div title={title}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={title}>
        <div className={cn("h-full rounded-full", BAR)} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-[12px] tabular-nums text-muted-foreground">{label}</div>
    </div>
  )
}

function ActivePill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[12px] font-medium",
        active ? "border-transparent bg-up-lime-tint text-up-lime-ink" : "border-border text-muted-foreground",
      )}
    >
      {active ? <RiPulseLine className="h-3.5 w-3.5" aria-hidden /> : null}
      {active ? "Active" : "Inactive"}
    </span>
  )
}

function Overview({ data }: { data: CreatorDashboard }) {
  const sourceTotal = Object.values(data.sources).reduce((a, b) => a + b, 0)
  const best = data.program.bestPublic
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={RiEyeLine} label="Unique viewers" value={formatCount(data.totals.uniqueViews)} hint="All public playlists" />
        <Stat icon={RiUserFollowLine} label="Your subscribers" value={formatCount(data.totals.creatorSubscribers)} />
        <Stat icon={RiPlayList2Line} label="Playlist subscribers" value={formatCount(data.totals.playlistSubscribers)} />
        <Stat
          icon={RiPulseLine}
          label="Active playlists"
          value={`${data.totals.activePlaylists} of ${data.totals.publicPlaylists}`}
          hint={`${data.config.activeMinViews30d}+ views in 30 days and a live listing`}
        />
      </div>

      {/* The Creators Program, by status: the road to the invite, the invite, or membership. */}
      <section className="rounded-up-lg border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold text-foreground">Creators Program</h2>
        {data.program.status === "invited" ? (
          <>
            <p className="mt-1 text-sm text-foreground">
              You're invited. {data.program.balances?.held ? `${naira(data.program.balances.held)} is waiting for you.` : ""} Accept the terms to unlock it.
            </p>
            <Link href="/creator?tab=earnings" className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
              See the invite
            </Link>
          </>
        ) : data.program.status === "member" ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              You're in. Every {data.config.blockSize.toLocaleString("en")} more unique viewers on a public playlist earns.
              {data.program.balances ? ` ${naira(data.program.balances.available)} available, ${naira(data.program.balances.pending)} pending.` : ""}
            </p>
            <Link href="/creator?tab=earnings" className="mt-2 inline-block text-sm font-semibold text-foreground underline">Earnings</Link>
          </>
        ) : data.program.status === "removed" ? (
          <p className="mt-1 text-sm text-muted-foreground">You are no longer in the program. Your playlists stay up but do not earn.</p>
        ) : best ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              When a public playlist of yours reaches {best.target.toLocaleString("en")} unique viewers, you are invited to the program.
              Your closest is <Link href={`/playlists/${best._id}`} className="font-semibold text-foreground underline">{best.name}</Link>.
            </p>
            <div className="mt-3">
              <Meter
                value={Math.min(best.uniqueViews, best.target)}
                max={best.target}
                title={`${best.name}: ${best.uniqueViews} of ${best.target} unique viewers`}
                label={`${formatCount(Math.min(best.uniqueViews, best.target))} of ${best.target.toLocaleString("en")} unique viewers`}
              />
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Make a public playlist to start counting unique viewers toward the program.</p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-up-lg border border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold text-foreground">Where viewers come from</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Unique viewers across your public playlists</p>
          {sourceTotal === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No viewers yet. Share a playlist link to get started.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(Object.keys(SOURCE_LABEL) as TrafficSource[]).map((key) => (
                <li key={key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-foreground">{SOURCE_LABEL[key]}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCount(data.sources[key])} · {Math.round((data.sources[key] / sourceTotal) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted" title={`${SOURCE_LABEL[key]}: ${data.sources[key]}`}>
                    <div className={cn("h-full rounded-full", BAR)} style={{ width: `${(data.sources[key] / sourceTotal) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-up-lg border border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold text-foreground">Top playlists</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">By unique viewers</p>
          {data.top.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ol className="mt-3 divide-y divide-border">
              {data.top.map((p, i) => (
                <li key={p._id} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                  <Link href={`/playlists/${p._id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:underline">
                    {p.name}
                  </Link>
                  <span className="text-sm tabular-nums text-foreground">{formatCount(p.uniqueViews)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

function PlaylistRow({ p }: { p: DashboardPlaylist }) {
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/playlists/${p._id}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground hover:underline">
          {p.name}
        </Link>
        {p.isPublic ? <ActivePill active={p.active} /> : (
          <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
            <RiLockLine className="h-3.5 w-3.5" aria-hidden /> Private, not counted
          </span>
        )}
        {p.role === "editor" ? <span className="text-[12px] text-muted-foreground">Collab</span> : null}
      </div>
      {p.isPublic ? (
        <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Meter
            value={p.nextBlock.done}
            max={p.nextBlock.size}
            title={`${p.name}: ${p.nextBlock.done} of ${p.nextBlock.size} toward the next block`}
            label={`${formatCount(p.uniqueViews)} unique viewers · ${p.nextBlock.remaining.toLocaleString("en")} to the next ${p.nextBlock.size.toLocaleString("en")}`}
          />
          <div className="flex gap-4 text-[12px] tabular-nums text-muted-foreground sm:justify-end">
            <span>{formatCount(p.subscribers)} {p.subscribers === 1 ? "subscriber" : "subscribers"}</span>
            <span>{formatCount(p.views30d)} views / 30d</span>
            <span>{p.liveItems} live</span>
          </div>
        </div>
      ) : null}
    </li>
  )
}

function EarningPicks({ data, onSaved }: { data: CreatorDashboard; onSaved: () => void }) {
  const [picked, setPicked] = useState<string[]>(() => data.limit.playlists.filter((p) => p.earning).map((p) => p._id))
  const [saving, setSaving] = useState(false)
  if (!data.limit.overLimit) return null
  const max = data.limit.limit
  const toggle = (id: string) =>
    setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length >= max ? list : [...list, id]))
  const save = async () => {
    setSaving(true)
    try {
      await setEarningPicks(picked)
      toast.success("Saved. These playlists count for the program.")
      onSaved()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <section className="rounded-up-lg border border-up-orange bg-up-orange-tint p-4">
      <h2 className="font-display text-lg font-bold text-foreground">Pick your {max} earning playlists</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You have {data.limit.count} public playlists from before the {max}-playlist limit. They stay public, but only {max} can earn.
        New publishes need you to be under {max}.
      </p>
      <ul className="mt-3 space-y-1">
        {data.limit.playlists.map((p) => {
          const on = picked.includes(p._id)
          return (
            <li key={p._id}>
              <button
                type="button"
                onClick={() => toggle(p._id)}
                aria-pressed={on}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 text-left text-sm",
                  on ? "border-up-orange bg-card font-semibold text-foreground" : "border-border bg-card/60 text-muted-foreground",
                )}
              >
                <span className={cn("flex h-5 w-5 items-center justify-center rounded border", on ? "border-up-orange bg-up-orange text-white" : "border-border")}>
                  {on ? <RiCheckLine className="h-4 w-4" /> : null}
                </span>
                {p.name}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex items-center gap-3">
        <Button type="button" onClick={save} disabled={saving || picked.length === 0} className="h-11">
          {saving ? <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save {picked.length} of {max}
        </Button>
      </div>
    </section>
  )
}

function Requests() {
  const [url, setUrl] = useState("")
  const [details, setDetails] = useState("")
  const [list, setList] = useState<ListingRequest[] | null>(null)
  const [sending, setSending] = useState(false)

  const load = useCallback(() => {
    getMyListingRequests().then((d) => setList(d.requests)).catch(() => setList([]))
  }, [])
  useEffect(load, [load])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await sendListingRequest(url, details)
      toast.success("Sent. The UP team will review it.")
      setUrl("")
      setDetails("")
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-3 rounded-up-lg border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold text-foreground">Ask UP to add a listing</h2>
        <p className="text-sm text-muted-foreground">Found a job, opportunity or event that is not on UP? Send the link. We review every request and tell you either way.</p>
        <label className="block text-sm font-medium text-foreground" htmlFor="req-url">Link</label>
        <input
          id="req-url"
          type="url"
          required
          inputMode="url"
          placeholder="https://"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
        <label className="block text-sm font-medium text-foreground" htmlFor="req-details">Anything we should know? (optional)</label>
        <textarea
          id="req-details"
          rows={3}
          maxLength={1000}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={sending || !url.trim()} className="h-11">
          {sending ? <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" /> : <RiLinkM className="mr-2 h-4 w-4" />}
          Send request
        </Button>
      </form>

      <section>
        <h2 className="mb-2 font-display text-lg font-bold text-foreground">Your requests</h2>
        {list === null ? (
          <RiLoader4Line className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-up-lg border border-border bg-card">
            {list.map((r) => (
              <li key={r._id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-foreground underline">
                    {r.url}
                  </a>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[12px] font-medium",
                      r.status === "approved" && "bg-up-lime-tint text-up-lime-ink",
                      r.status === "rejected" && "bg-muted text-muted-foreground",
                      r.status === "pending" && "bg-up-orange-tint text-up-orange-ink",
                    )}
                  >
                    {r.status === "pending" ? "Waiting for review" : r.status === "approved" ? "Approved" : "Not approved"}
                  </span>
                </div>
                {r.note ? <p className="mt-1 text-[13px] text-muted-foreground">{r.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Tips() {
  const [tips, setTips] = useState<{ title: string; body: string }[] | null>(null)
  useEffect(() => {
    getCreatorTips().then((d) => setTips(d.tips)).catch(() => setTips([]))
  }, [])
  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-bold text-foreground">Tips to push a playlist</h2>
      {tips === null ? (
        <RiLoader4Line className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <ul className="space-y-2">
          {tips.map((t) => (
            <li key={t.title} className="flex gap-3 rounded-up-lg border border-border bg-card p-4">
              <RiLightbulbLine className="mt-0.5 h-5 w-5 shrink-0 text-up-orange" aria-hidden />
              <div>
                <div className="text-sm font-semibold text-foreground">{t.title}</div>
                <div className="text-[13px] text-muted-foreground">{t.body}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[13px] text-muted-foreground">More creator tools are coming soon.</p>
    </div>
  )
}

function CreatorDashboard() {
  const router = useRouter()
  const params = useSearchParams()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const tab = (TABS.some((t) => t.value === params.get("tab")) ? params.get("tab") : "overview") as Tab
  const [data, setData] = useState<CreatorDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    getCreatorDashboard()
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((err) => setError((err as Error).message))
  }, [])

  useEffect(() => {
    if (isAuthenticated) load()
  }, [isAuthenticated, load])

  const setTab = (next: Tab) => router.replace(next === "overview" ? "/creator" : `/creator?tab=${next}`, { scroll: false })
  const publicFirst = useMemo(() => data?.playlists ?? [], [data])

  return (
    <PageShell className="font-sans">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center gap-2">
          <RiBarChartBoxLine className="h-6 w-6 text-up-orange" aria-hidden />
          <h1 className="font-display text-[26px] font-bold text-foreground">Creator dashboard</h1>
        </div>

        <div className="scrollbar-hide -mx-1 mb-5 flex gap-1 overflow-x-auto px-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors",
                tab === t.value ? "bg-foreground text-background" : "bg-up-fill text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {!isAuthenticated && !authLoading ? (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="font-semibold text-foreground underline">Sign in</Link> to see your creator dashboard.
          </p>
        ) : tab === "earnings" ? (
          <EarningsPanel />
        ) : tab === "requests" ? (
          <Requests />
        ) : tab === "tips" ? (
          <Tips />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !data ? (
          <div className="flex justify-center py-16">
            <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tab === "playlists" ? (
          <div className="space-y-5">
            <EarningPicks data={data} onSaved={load} />
            <p className="text-[13px] text-muted-foreground">
              {data.limit.count} of {data.limit.limit} public playlists used. Private playlists are unlimited and never count.
            </p>
            {publicFirst.length === 0 ? (
              <p className="text-sm text-muted-foreground">You have no playlists yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-up-lg border border-border bg-card px-4">
                {publicFirst.map((p) => (
                  <PlaylistRow key={p._id} p={p} />
                ))}
              </ul>
            )}
          </div>
        ) : (
          <Overview data={data} />
        )}
      </div>
    </PageShell>
  )
}

/** useSearchParams needs a Suspense boundary above it. */
function CreatorDashboardPageInner() {
  return (
    <Suspense fallback={null}>
      <CreatorDashboard />
    </Suspense>
  )
}

/** Staff preview: admins and super admins only for now (lib/creator-preview.ts). */
export default function CreatorDashboardPage() {
  return (
    <CreatorPreviewGate>
      <CreatorDashboardPageInner />
    </CreatorPreviewGate>
  )
}
