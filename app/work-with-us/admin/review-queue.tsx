"use client"

import { useCallback, useEffect, useState } from "react"
import {
  RiCheckLine,
  RiCloseLine,
  RiExternalLinkLine,
  RiLoader4Line,
  RiMailSendLine,
  RiQuestionLine,
  RiRefreshLine,
} from "react-icons/ri"
import { toast } from "sonner"

import { AdminShell } from "@/components/admin/admin-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth-context"
import { isAdminOrSuperAdmin } from "@/lib/roles"

import { LIST_PATH, naira, type ContentType } from "../config"
import { STATUS_COPY } from "../copy"
import { TEMPLATES, gmailComposeUrl, type MailContext } from "./mail"

type Item = {
  ref: string
  orderRef: string
  itemType: "listing" | "promotion"
  kind: string
  contentType: string | null
  fields: Record<string, string>
  promotions?: { id: string; label: string; quantity: number; price: number }[]
  target?: { title: string; contentId: string | null; listingRef: string | null }
  status: string
  publishedId?: string | null
  adminNote?: string
  contact: { name: string; email: string; phone: string; organisation: string }
  createdAt: string
  order?: { amountNg: number; status: string; revenueShare: number | null } | null
}

const TABS = [
  // "All" comes first so the screen answers "has anyone used this?" before it
  // answers "what do I have to do?". Without it, an inbox whose submissions
  // were all abandoned at payment reads as though nothing was ever submitted.
  { id: "all", label: "All" },
  { id: "pending_review", label: "To review" },
  { id: "needs_clarification", label: "Waiting on them" },
  { id: "published", label: "Published" },
  { id: "running", label: "Running" },
  { id: "delivered", label: "Delivered" },
  { id: "rejected", label: "Rejected" },
  { id: "awaiting_payment", label: "Unpaid" },
] as const

const TAB_LABEL: Record<string, string> = Object.fromEntries(
  TABS.map((entry) => [entry.id, entry.label]),
)

const STATUS_TONE: Record<string, string> = {
  pending_review: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  published: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  running: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  delivered: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-600 border-red-500/30",
  needs_clarification: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  awaiting_payment: "bg-muted text-muted-foreground border-border",
}

function token(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("accessToken") ?? ""
}

/**
 * The customer conversation. Picking a template opens Gmail with the subject
 * and body already written, so the reviewer only edits the bracketed detail —
 * and the reply comes back to a real inbox rather than a no-reply address.
 */
function MailMenu({ item }: { item: Item }) {
  const [open, setOpen] = useState(false)

  const ctx: MailContext = {
    ref: item.ref,
    orderRef: item.orderRef,
    name: item.contact.name,
    title: item.fields.title || item.target?.title || "",
    product:
      item.itemType === "promotion"
        ? (item.promotions ?? []).map((promo) => promo.label).join(" + ") || "promotion"
        : `${item.contentType ?? "listing"} listing`,
    amountNg: item.order?.amountNg ?? 0,
    liveUrl:
      item.publishedId && item.contentType
        ? `${typeof window === "undefined" ? "" : window.location.origin}/${LIST_PATH[item.contentType as ContentType]}/${item.publishedId}`
        : undefined,
  }

  return (
    <div className="relative">
      <Button size="sm" variant="outline" onClick={() => setOpen((current) => !current)}>
        <RiMailSendLine className="mr-2 h-4 w-4" aria-hidden />
        Email them
      </Button>

      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-80 space-y-1 rounded-xl border border-border bg-popover p-2 shadow-lg">
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Opens Gmail with the message ready to edit and send.
          </p>
          {TEMPLATES.map((template) => (
            <a
              key={template.id}
              href={gmailComposeUrl(item.contact.email, template.subject(ctx), template.body(ctx))}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2 py-1.5 hover:bg-accent"
            >
              <span className="block text-sm font-medium">{template.label}</span>
              <span className="block text-xs text-muted-foreground">{template.hint}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReviewQueue() {
  const { user, isLoading: authLoading } = useAuth()
  const [tab, setTab] = useState<string>("pending_review")
  const [rows, setRows] = useState<Item[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [total, setTotal] = useState<number | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(true)
  // A toast is gone in four seconds, which is how "it will not load" ended up
  // with no reason attached. The reason stays on the screen until it is fixed.
  const [error, setError] = useState<string | null>(null)
  const [busyRef, setBusyRef] = useState<string | null>(null)

  const allowed = isAdminOrSuperAdmin(user?.role)

  const load = useCallback(async () => {
    // Without clearing the flag here the skeleton rows stayed up for ever on
    // any account the check said no to.
    if (!allowed) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/work-with-us/api/admin/items?status=${tab}`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      const json = await response.json().catch(() => null)
      if (!response.ok) throw new Error(json?.error || `Could not load submissions (HTTP ${response.status})`)
      setRows(json.items ?? [])
      setCounts(json.counts ?? {})
      setTotal(typeof json.total === "number" ? json.total : null)
      setTruncated(Boolean(json.truncated))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not load submissions"
      setError(message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [tab, allowed])

  useEffect(() => {
    if (!authLoading) void load()
  }, [authLoading, load])

  if (!authLoading && !allowed) {
    // "Access denied" was shown for both of these, so an admin whose account
    // simply had not loaded — the usual cause being the backend being down —
    // was told they had no permission, and stopped looking.
    return (
      <AdminShell title="Work with us">
        <div className="p-8 text-center text-sm text-muted-foreground">
          {user ? (
            <p>
              Access denied — {user.email || "this account"} is not an admin.
            </p>
          ) : (
            <>
              <p className="font-medium text-foreground">We could not confirm your account.</p>
              <p className="mt-2">
                Either your session has expired, or the backend is not reachable from here.
                Sign in again, and check the backend is up if it keeps happening.
              </p>
            </>
          )}
        </div>
      </AdminShell>
    )
  }

  const act = async (ref: string, action: "approve" | "reject" | "clarify" | "deliver") => {
    // The note is what you then paste into the email, so it is worth asking for.
    let note = ""
    if (action === "reject" || action === "clarify") {
      const reason = window.prompt(
        action === "reject"
          ? "Why are you rejecting this? (kept on the record)"
          : "What exactly do you need from them? Name the field, link, date or asset.",
      )
      if (reason === null) return
      note = reason.trim()
    }

    setBusyRef(ref)
    try {
      const response = await fetch("/work-with-us/api/admin/items/action", {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ref, action, note }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.error || "That did not work")

      toast.success(
        json.status === "published"
          ? "Published to the platform — now email them"
          : json.status === "running"
            ? `Promotion started${json.days ? ` for ${json.days} days` : ""} — now email them`
            : json.status === "needs_clarification"
              ? "Marked as waiting on them — now email them what you need"
              : `Marked ${json.status.replace(/_/g, " ")}`,
      )
      if (json.blockedPromotions?.length) {
        toast.warning(
          `Promotion ${json.blockedPromotions.join(", ")} was pointing at this — it needs a refund or a replacement listing.`,
          { duration: 8000 },
        )
      }
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not work")
    } finally {
      setBusyRef(null)
    }
  }

  return (
    <AdminShell
      title="Work with us"
      description="Everything submitted through the public flow. Approving a listing publishes it."
      onRefresh={load}
      refreshing={loading}
      width="wide"
    >
      <div className="space-y-6">

        <div className="flex flex-wrap gap-2">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={
                tab === entry.id
                  ? "rounded-xl border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium"
                  : "rounded-xl border border-border/70 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              }
            >
              {entry.label}
              {(entry.id === "all" ? total : counts[entry.id]) ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  {entry.id === "all" ? total : counts[entry.id]}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {truncated && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
            Showing the 200 most recent. Narrow by status to see older ones.
          </p>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center">
            <p className="text-sm font-medium">Could not load submissions</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{error}</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={load}>
              <RiRefreshLine className="mr-2 h-4 w-4" aria-hidden />
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card/60 p-8 text-center text-sm text-muted-foreground">
            {total === 0 ? (
              <p>No one has submitted anything through the public flow yet.</p>
            ) : (
              <>
                <p>
                  Nothing in {tab === "all" ? "the queue" : `"${TAB_LABEL[tab] ?? tab}"`}.
                </p>
                {/* The count is the point: an empty work queue is good news, an
                    empty account is not, and they must not look the same. */}
                <p className="mt-2">
                  {total} submission{total === 1 ? "" : "s"} in total —{" "}
                  <button
                    type="button"
                    onClick={() => setTab("all")}
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    see all of them
                  </button>
                  .
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((item) => (
              <article key={item.ref} className="rounded-2xl border border-border/70 bg-card/80 p-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium">
                        {item.fields.title || item.target?.title || item.ref}
                      </h2>
                      <Badge variant="outline" className={STATUS_TONE[item.status] ?? ""}>
                        {STATUS_COPY[item.status]?.label ?? item.status.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline">
                        {item.itemType === "promotion" ? "promotion" : item.contentType}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Order <span className="font-medium text-foreground">{item.orderRef}</span>
                      {item.ref !== item.orderRef ? ` · item ${item.ref}` : ""} · {item.contact.name}
                      {item.contact.organisation ? ` · ${item.contact.organisation}` : ""} ·{" "}
                      {item.contact.email} · {item.contact.phone}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {STATUS_COPY[item.status]?.customer ?? ""}
                    </p>
                  </div>
                  {item.order && item.order.amountNg > 0 && (
                    <span className="text-sm font-medium">{naira(item.order.amountNg)}</span>
                  )}
                </header>

                {item.itemType === "promotion" && (
                  <div className="mt-3 rounded-xl bg-muted/50 p-3 text-sm">
                    <p className="font-medium">
                      {(item.promotions ?? []).map((promo) => `${promo.label} ×${promo.quantity}`).join(", ")}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Promoting: {item.target?.title}
                      {item.target?.contentId
                        ? " — live on the platform"
                        : item.target?.listingRef
                          ? ` — waiting on listing ${item.target.listingRef}`
                          : ""}
                    </p>
                  </div>
                )}

                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  {Object.entries(item.fields)
                    .filter(([key]) => key !== "title")
                    .map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <dt className="shrink-0 text-muted-foreground">{key}</dt>
                        <dd className="min-w-0 break-words">{value}</dd>
                      </div>
                    ))}
                  {item.order?.revenueShare ? (
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-muted-foreground">revenue share</dt>
                      <dd>{item.order.revenueShare}%</dd>
                    </div>
                  ) : null}
                </dl>

                {item.adminNote && (
                  <p className="mt-3 text-sm text-muted-foreground">Note: {item.adminNote}</p>
                )}

                <footer className="mt-4 flex flex-wrap items-center gap-2">
                  {(item.status === "pending_review" || item.status === "needs_clarification") && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => act(item.ref, "approve")}
                        disabled={busyRef === item.ref}
                      >
                        {busyRef === item.ref ? (
                          <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <RiCheckLine className="mr-2 h-4 w-4" aria-hidden />
                        )}
                        {item.itemType === "promotion" ? "Approve and start" : "Approve and publish"}
                      </Button>
                      {item.status === "pending_review" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => act(item.ref, "clarify")}
                          disabled={busyRef === item.ref}
                        >
                          <RiQuestionLine className="mr-2 h-4 w-4" aria-hidden />
                          Needs clarification
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(item.ref, "reject")}
                        disabled={busyRef === item.ref}
                      >
                        <RiCloseLine className="mr-2 h-4 w-4" aria-hidden />
                        Reject
                      </Button>
                    </>
                  )}
                  {item.status === "running" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => act(item.ref, "deliver")}
                      disabled={busyRef === item.ref}
                    >
                      <RiCheckLine className="mr-2 h-4 w-4" aria-hidden />
                      Mark delivered
                    </Button>
                  )}
                  <MailMenu item={item} />

                  {item.publishedId && item.contentType && (
                    <Button size="sm" variant="ghost" asChild>
                      <a
                        href={`/${LIST_PATH[item.contentType as ContentType]}/${item.publishedId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <RiExternalLinkLine className="mr-2 h-4 w-4" aria-hidden />
                        View on site
                      </a>
                    </Button>
                  )}
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
