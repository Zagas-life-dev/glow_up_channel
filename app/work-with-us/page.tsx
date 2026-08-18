"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { RiCheckboxCircleFill, RiLoader4Line } from "react-icons/ri"
import { toast } from "sonner"

import { PageShell } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { PARTNER_PROGRAMME_ENABLED } from "@/lib/feature-flags"

import { CONTACT, buildOrder, naira, type SubmissionPayload } from "./config"
import { HERO, HOW_IT_WORKS, MODEL, PROOF, REVIEW, SELECTOR, SUCCESS, WHY_UP } from "./copy"
import PartnerTrack from "./partner-track"
import PromoteTrack from "./promote-track"
import SubmitTrack from "./submit-track"
import { Choice, Step, TalkToUs } from "./ui"

type Screen = "welcome" | "choose" | "submit" | "promote" | "partner" | "review" | "done"

type Result = { ref: string; amountNg: number; paid: boolean; track: string }

function Flow() {
  const searchParams = useSearchParams()
  const [stack, setStack] = useState<Screen[]>(["welcome"])
  const [draft, setDraft] = useState<SubmissionPayload | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [audience, setAudience] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const confirmed = useRef(false)

  const screen = stack[stack.length - 1]
  const go = useCallback((next: Screen) => setStack((current) => [...current, next]), [])
  const back = useCallback(
    () => setStack((current) => (current.length > 1 ? current.slice(0, -1) : current)),
    [],
  )

  // Paystack sends people back here with ?reference=… — confirm it with our
  // server before we tell anyone the payment worked.
  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref")
    if (!reference || confirmed.current) return
    confirmed.current = true
    setConfirming(true)

    fetch("/work-with-us/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then(async (response) => {
        const json = await response.json()
        if (!response.ok) throw new Error(json?.error || "We could not confirm that payment")
        return json
      })
      .then((json) => {
        setResult({ ref: json.ref, amountNg: json.amountNg, paid: true, track: json.track ?? "" })
        setStack(["done"])
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "We could not confirm that payment")
      })
      .finally(() => {
        setConfirming(false)
        const url = new URL(window.location.href)
        url.searchParams.delete("reference")
        url.searchParams.delete("trxref")
        window.history.replaceState({}, "", url.toString())
      })
  }, [searchParams])

  // Proof copy has to be a real number or absent — never a placeholder.
  useEffect(() => {
    let cancelled = false
    fetch("/work-with-us/api/stats")
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (!cancelled && typeof json?.users === "number" && json.users > 0) {
          setAudience(json.users)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const review = (payload: SubmissionPayload) => {
    setDraft(payload)
    go("review")
  }

  const send = async () => {
    if (!draft) return
    setBusy(true)
    try {
      const response = await fetch("/work-with-us/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.error || "Something went wrong")

      if (json.authorizationUrl) {
        window.location.href = json.authorizationUrl
        return
      }
      setResult({ ref: json.ref, amountNg: 0, paid: false, track: draft.kind })
      setStack(["done"])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  const startOver = () => {
    setDraft(null)
    setResult(null)
    setStack(["choose"])
  }

  if (confirming) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <RiLoader4Line className="h-7 w-7 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Confirming your payment…</p>
      </div>
    )
  }

  // --- The commercial landing page ------------------------------------------
  if (screen === "welcome") {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-10">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{HERO.title}</h1>
          <p className="text-lg text-muted-foreground">{HERO.body}</p>
          <p className="font-medium">{HERO.promise}</p>
        </div>

        <div className="space-y-3">
          <Button size="lg" className="w-full" onClick={() => go("choose")}>
            {HERO.cta}
          </Button>
          <TalkToUs>{HERO.secondary}</TalkToUs>
        </div>

        {audience !== null && (
          <div className="rounded-2xl border border-border/70 bg-card/60 p-5 text-sm">
            <p className="text-muted-foreground">{PROOF.intro}</p>
            <p className="mt-2 font-medium">{PROOF.figure(audience)}</p>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">{MODEL.title}</h2>
          <p className="text-muted-foreground">{MODEL.body}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {WHY_UP.map((benefit) => (
            <div key={benefit.title} className="rounded-2xl border border-border/70 bg-card/60 p-4">
              <p className="font-medium">{benefit.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{benefit.body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/80 p-5">
          <h2 className="font-medium">How it works</h2>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            {HOW_IT_WORKS.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="font-medium text-foreground tabular-nums">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <Button size="lg" className="w-full" onClick={() => go("choose")}>
          {HERO.cta}
        </Button>
      </div>
    )
  }

  // --- Outcome-first product selector ---------------------------------------
  if (screen === "choose") {
    return (
      <Step title={SELECTOR.title} description={SELECTOR.microcopy} onBack={back}>
        <div className="space-y-3">
          <Choice
            label={SELECTOR.submit.label}
            blurb={SELECTOR.submit.blurb}
            onClick={() => go("submit")}
          />
          <Choice
            label={SELECTOR.promote.label}
            blurb={SELECTOR.promote.blurb}
            onClick={() => go("promote")}
          />
          {PARTNER_PROGRAMME_ENABLED && (
            <Choice
              label={SELECTOR.partner.label}
              blurb={SELECTOR.partner.blurb}
              onClick={() => go("partner")}
            />
          )}
        </div>
        <TalkToUs>{SELECTOR.help}</TalkToUs>
      </Step>
    )
  }

  if (screen === "submit") {
    return <SubmitTrack onDone={review} onExit={back} />
  }

  if (screen === "promote") {
    return <PromoteTrack onDone={review} onExit={back} />
  }

  // Nothing can reach this while the programme is off — the choice that pushes
  // "partner" is gated above. Gated here too so the flag is the single switch:
  // if it is off, the track cannot render by any route, and a stale screen falls
  // through to the "start again" step at the bottom.
  if (screen === "partner" && PARTNER_PROGRAMME_ENABLED) {
    return <PartnerTrack onExit={back} />
  }

  // --- Review before payment ------------------------------------------------
  if (screen === "review" && draft) {
    const order = buildOrder(draft)
    return (
      <Step
        title={REVIEW.title}
        description={order.total > 0 ? "Here is what it comes to." : "Nothing to pay for this one."}
        onBack={back}
      >
        <div className="rounded-2xl border border-border/70 bg-card/80 p-5">
          {order.lines.length > 0 ? (
            <ul className="space-y-3">
              {order.lines.map((line) => (
                <li key={line.label} className="flex items-start justify-between gap-4 text-sm">
                  <span>
                    {line.label}
                    {line.quantity > 1 && (
                      <span className="text-muted-foreground">
                        {" "}
                        × {line.quantity} at {naira(line.unitPrice)}
                      </span>
                    )}
                  </span>
                  <span className="font-medium tabular-nums">{naira(line.total)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {draft.kind === "resource"
                ? `You chose the ${draft.revenueShare}% terms. We only earn when your resource earns.`
                : draft.entries.length > 1
                  ? `All ${draft.entries.length} listings are free.`
                  : "This listing is free."}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-semibold">{naira(order.total)}</span>
          </div>
        </div>

        {draft.entries.length > 1 && (
          <div className="rounded-2xl border border-border/70 bg-card/50 p-5">
            <p className="mb-3 text-sm font-medium">What you are sending</p>
            <ol className="space-y-1.5 text-sm text-muted-foreground">
              {draft.entries.map((entry, index) => (
                <li key={index}>
                  {index + 1}. {entry.title || "Untitled"}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm">
          <p>{REVIEW.notice}</p>
          <p className="mt-3 text-muted-foreground">{REVIEW.terms}</p>
        </div>

        <p className="text-sm text-muted-foreground">
          We will send everything to{" "}
          <span className="font-medium text-foreground">{draft.contact.email}</span>, including a
          copy of this order.
        </p>

        <Button size="lg" className="w-full" onClick={send} disabled={busy}>
          {busy ? "Please wait…" : order.total > 0 ? REVIEW.payCta : REVIEW.freeCta}
        </Button>
        {order.total > 0 && (
          <p className="text-center text-xs text-muted-foreground">{REVIEW.paystackNote}</p>
        )}
      </Step>
    )
  }

  // --- Payment success / order confirmation ---------------------------------
  if (screen === "done" && result) {
    const crossSell =
      result.track === "promotion" ? SUCCESS.crossSell.promotion : SUCCESS.crossSell.listing

    return (
      <Step title={result.paid ? SUCCESS.paidTitle : SUCCESS.freeTitle}>
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <RiCheckboxCircleFill className="h-8 w-8 text-primary" aria-hidden />
          <p className="mt-4 text-sm">{result.paid ? SUCCESS.paidBody : SUCCESS.freeBody}</p>

          <dl className="mt-5 space-y-1.5 border-t border-primary/20 pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Order ID</dt>
              <dd className="font-semibold tabular-nums">{result.ref}</dd>
            </div>
            {result.paid && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Amount paid</dt>
                <dd className="font-medium tabular-nums">{naira(result.amountNg)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">
                {result.paid ? "Paid — awaiting review" : "Awaiting review"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/80 p-5">
          <p className="font-medium">What happens next</p>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            {SUCCESS.next.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="font-medium text-foreground tabular-nums">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">
            A copy of everything is on its way to your email. No action is needed from you right now.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">{crossSell}</p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={startOver}>
            Submit something else
          </Button>
          <Button asChild className="flex-1">
            <Link href="/">Back to UP</Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {SUCCESS.support}{" "}
          <a href={`mailto:${CONTACT.email}`} className="font-medium text-primary hover:underline">
            {CONTACT.email}
          </a>{" "}
          or{" "}
          <a href={`tel:${CONTACT.phone}`} className="font-medium text-primary hover:underline">
            {CONTACT.phone}
          </a>
          .
        </p>
      </Step>
    )
  }

  // Nothing sensible to show (a stale link, say) — start again.
  return (
    <Step title="Let's start again" onBack={undefined}>
      <Button size="lg" className="w-full" onClick={() => setStack(["welcome"])}>
        Start over
      </Button>
    </Step>
  )
}

export default function WorkWithUsPage() {
  return (
    <PageShell className="font-sans">
      <div className="py-8 sm:py-12">
        <Suspense fallback={null}>
          <Flow />
        </Suspense>
      </div>
    </PageShell>
  )
}
