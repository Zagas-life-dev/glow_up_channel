"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import ApiClient, { type FounderBatchStatus } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { PageShell } from "@/components/layout/page-shell"
import {
  RiCheckboxCircleFill,
  RiArrowLeftLine,
  RiLoader4Line,
  RiEditBoxLine,
} from "react-icons/ri"

const BENEFITS = [
  "Everything an opportunity seeker can do",
  "Publish your own opportunities, events, jobs and resources",
  "Hold up to 20 published posts at a time",
  "Provider dashboard with analytics and promotions",
]

function formatDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}

function FounderBatchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading: authLoading, refreshUser } = useAuth()

  const [status, setStatus] = useState<FounderBatchStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const loadStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    try {
      setStatus(await ApiClient.getFounderBatchStatus())
    } catch (err) {
      console.error("Founder Batch status error:", err)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!authLoading) void loadStatus()
  }, [authLoading, loadStatus])

  // Paystack returns here with ?reference=... — confirm it server-side before the
  // tier is granted, then clear the param so a refresh cannot re-trigger it.
  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref")
    if (!reference || !isAuthenticated || verifying) return

    let cancelled = false
    setVerifying(true)
    ApiClient.verifyFounderBatch(reference)
      .then(async (result) => {
        if (cancelled) return
        toast.success(
          result.alreadyApplied ? "Founder Batch is already active" : "Founder Batch activated — you can post now",
        )
        await refreshUser()
        await loadStatus()
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Could not verify your payment")
        }
      })
      .finally(() => {
        if (cancelled) return
        setVerifying(false)
        const url = new URL(window.location.href)
        url.searchParams.delete("reference")
        url.searchParams.delete("trxref")
        window.history.replaceState({}, "", url.toString())
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAuthenticated])

  const startPurchase = async () => {
    try {
      setStarting(true)
      const { authorizationUrl } = await ApiClient.initializeFounderBatch(
        `${window.location.origin}/founder-batch`,
      )
      if (!authorizationUrl) throw new Error("Could not start payment")
      window.location.href = authorizationUrl
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start payment")
      setStarting(false)
    }
  }

  if (authLoading || loading || verifying) {
    return (
      <PageShell className="font-sans">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <RiLoader4Line className="h-7 w-7 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {verifying ? "Confirming your payment…" : "Loading…"}
          </p>
        </div>
      </PageShell>
    )
  }

  if (!isAuthenticated) {
    return (
      <PageShell className="font-sans">
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground">Sign in to join Founder Batch</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Founder Batch is added to an existing account.
          </p>
          <Button asChild className="mt-8 h-11 rounded-2xl px-8">
            <Link href={`/login?callbackUrl=${encodeURIComponent("/founder-batch")}`}>Sign in</Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  const price = status?.priceNgn ?? 80000
  const months = status?.termMonths ?? 12
  const expiresOn = formatDate(status?.expiresAt)

  return (
    <PageShell className="font-sans">
      <div className="mx-auto max-w-2xl py-6 sm:py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
            <RiArrowLeftLine className="h-4 w-4" aria-hidden />
          </span>
          Back
        </Link>

        <div className="rounded-[1.35rem] border border-border/70 bg-card/85 p-6 backdrop-blur-sm sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Founder Batch
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Publish on Glow Up
          </h1>

          {status?.isFounder ? (
            <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <RiCheckboxCircleFill className="h-4 w-4 text-primary" aria-hidden />
                Active{expiresOn ? ` until ${expiresOn}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Renewing before your end date adds another {months} months on top — you never lose paid time.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A {months}-month term that lets you publish your own content. When it ends your
              account stays, but posting stops and your published posts are hidden until you renew.
            </p>
          )}

          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-foreground">
              ₦{price.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">for {months} months</span>
          </div>

          <ul className="mt-6 space-y-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm text-foreground">
                <RiCheckboxCircleFill className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {benefit}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={startPurchase}
              disabled={starting}
              className="h-12 flex-1 rounded-2xl text-base font-semibold"
            >
              {starting ? (
                <>
                  <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Connecting to Paystack…
                </>
              ) : status?.isFounder ? (
                `Renew for ₦${price.toLocaleString()}`
              ) : (
                `Join for ₦${price.toLocaleString()}`
              )}
            </Button>
            {status?.canPublish && (
              <Button asChild variant="outline" className="h-12 rounded-2xl sm:flex-initial sm:px-6">
                <Link href="/dashboard/provider" className="flex items-center gap-2">
                  <RiEditBoxLine className="h-4 w-4" aria-hidden />
                  Go to dashboard
                </Link>
              </Button>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Secure payment via Paystack. One-off charge — it does not auto-renew.
          </p>
        </div>
      </div>
    </PageShell>
  )
}

export default function FounderBatchPage() {
  return (
    <Suspense fallback={null}>
      <FounderBatchContent />
    </Suspense>
  )
}
