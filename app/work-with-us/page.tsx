"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { RiCheckboxCircleFill, RiLoader4Line, RiWhatsappLine } from "react-icons/ri"

import { PageShell } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { whatsappHref } from "@/lib/contact"
import { PARTNER_PROGRAMME_ENABLED } from "@/lib/feature-flags"

import {
  CONTACT,
  LISTING_TIERS,
  PROMOTION_ITEMS,
  buildOrder,
  naira,
  type Kind,
  type SubmissionPayload,
} from "./config"
import { SELECTOR, SUCCESS, UNPAID } from "./copy"
import { clearPending, loadPending, saveContact, savePending, type PendingOrder } from "./draft"
import PartnerTrack from "./partner-track"
import PromoteTrack from "./promote-track"
import SubmitTrack from "./submit-track"
import { Choice, Step, TalkToUs } from "./ui"

type Screen = "choose" | "submit" | "promote" | "partner" | "unpaid" | "notice" | "done"

type Result = { ref: string; amountNg: number; paid: boolean; track: string }

/** The one menu, in the order people most often want it. */
const MENU: { kind: Kind; price: string }[] = [
  { kind: "job", price: naira(LISTING_TIERS.standard.price) },
  { kind: "paid-event", price: naira(LISTING_TIERS.standard.price) },
  { kind: "free-opportunity", price: "Free" },
  { kind: "free-event", price: "Free" },
  { kind: "resource", price: "No upfront cost" },
  {
    kind: "promotion",
    price: `From ${naira(Math.min(...PROMOTION_ITEMS.map((item) => item.price)))}`,
  },
]

/** A short name for an order, for "You didn't finish paying for …". */
function describe(payload: SubmissionPayload): string {
  const title = payload.entries[0]?.title?.trim()
  const count = payload.entries.length
  if (title && count > 1) return `"${title}" and ${count - 1} more`
  return title ? `"${title}"` : SELECTOR.options[payload.kind].label.toLowerCase()
}

function Flow() {
  const searchParams = useSearchParams()
  const [stack, setStack] = useState<Screen[]>(["choose"])
  const [kind, setKind] = useState<Kind | null>(null)
  const [draft, setDraft] = useState<SubmissionPayload | null>(null)
  const [pending, setPending] = useState<PendingOrder | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const confirmed = useRef(false)

  const screen = stack[stack.length - 1]
  const go = useCallback((next: Screen) => {
    setError(null)
    setStack((current) => [...current, next])
    window.scrollTo(0, 0)
  }, [])
  const back = useCallback(() => {
    setError(null)
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current))
  }, [])

  const choose = (next: Kind) => {
    if (next === "promotion") return go("promote")
    setKind(next)
    go("submit")
  }

  /** Reopen the form for a saved order, answers filled in. */
  const edit = (payload: SubmissionPayload) => {
    setDraft(payload)
    setError(null)
    if (payload.kind === "promotion") {
      setStack(["choose", "promote"])
    } else {
      setKind(payload.kind)
      setStack(["choose", "submit"])
    }
    window.scrollTo(0, 0)
  }

  // Paystack sends people back here with ?reference=… — confirm it with our
  // server before we tell anyone the payment worked.
  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref")
    if (!reference) {
      // No payment to check, so offer back anything left half-paid.
      setPending(loadPending())
      return
    }
    if (confirmed.current) return
    confirmed.current = true
    setConfirming(true)

    fetch("/work-with-us/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}))
        if (response.ok) {
          clearPending()
          setResult({ ref: json.ref, amountNg: json.amountNg, paid: true, track: json.track ?? "" })
          setStack(["done"])
          return
        }
        // 400 is Paystack's own answer: not paid. Anything else means we could
        // not find out, and offering a retry then risks charging twice.
        const saved = loadPending()
        if (response.status === 400 && saved) {
          setDraft(saved.payload)
          setStack(["unpaid"])
          return
        }
        setNotice(json?.error || "We could not confirm that payment just now.")
        setStack(["notice"])
      })
      .catch(() => {
        setNotice("We could not confirm that payment just now. Nothing is lost.")
        setStack(["notice"])
      })
      .finally(() => {
        setConfirming(false)
        const url = new URL(window.location.href)
        url.searchParams.delete("reference")
        url.searchParams.delete("trxref")
        window.history.replaceState({}, "", url.toString())
      })
  }, [searchParams])

  // Pressing Back on Paystack's page can restore this one from the browser's
  // cache, frozen on "Opening secure payment…". Unstick the button, and offer
  // the half-paid order so it can be finished.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      setBusy(false)
      setPending(loadPending())
    }
    window.addEventListener("pageshow", onShow)
    return () => window.removeEventListener("pageshow", onShow)
  }, [])

  /**
   * Saves the order and, when there is something to pay, goes straight to
   * Paystack. There is no separate review screen — the form shows the total
   * and the terms right above the button.
   */
  const send = async (payload: SubmissionPayload) => {
    setBusy(true)
    setError(null)
    setDraft(payload)
    saveContact(payload.contact)
    try {
      const response = await fetch("/work-with-us/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json?.error || "Something went wrong. Please try again.")

      if (json.authorizationUrl) {
        // Remembered so a cancelled or abandoned payment is one tap to retry.
        savePending(payload)
        window.location.href = json.authorizationUrl
        return
      }
      clearPending()
      setPending(null)
      setResult({ ref: json.ref, amountNg: 0, paid: false, track: payload.kind })
      setStack(["done"])
      window.scrollTo(0, 0)
      setBusy(false)
    } catch (caught) {
      // fetch() itself throwing means no connection, whatever the browser calls it.
      setError(
        caught instanceof Error && !(caught instanceof TypeError)
          ? caught.message
          : "We couldn't reach UP. Check your internet connection and try again.",
      )
      setBusy(false)
    }
  }

  const startOver = () => {
    setDraft(null)
    setResult(null)
    setError(null)
    setStack(["choose"])
  }

  const discardPending = () => {
    clearPending()
    setPending(null)
    setDraft(null)
    setError(null)
  }

  if (confirming) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <RiLoader4Line className="h-7 w-7 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Confirming your payment…</p>
      </div>
    )
  }

  // --- One flat menu --------------------------------------------------------
  if (screen === "choose") {
    return (
      <Step title={SELECTOR.title} description={SELECTOR.microcopy}>
        {pending && (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
            <p className="font-medium">
              {UNPAID.resume} {describe(pending.payload)}.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{UNPAID.body}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                className="h-12 flex-1"
                disabled={busy}
                onClick={() => send(pending.payload)}
              >
                {busy
                  ? "Opening secure payment…"
                  : `${UNPAID.resumeCta} · ${naira(buildOrder(pending.payload).total)}`}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 flex-1"
                onClick={() => edit(pending.payload)}
              >
                {UNPAID.edit}
              </Button>
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={discardPending}
              className="mt-3 text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {UNPAID.discard}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {MENU.map((item) => (
            <Choice
              key={item.kind}
              label={SELECTOR.options[item.kind].label}
              blurb={SELECTOR.options[item.kind].blurb}
              price={item.price}
              onClick={() => choose(item.kind)}
            />
          ))}
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

  if (screen === "submit" && kind) {
    return (
      <SubmitTrack
        kind={kind}
        initial={draft}
        busy={busy}
        error={error}
        onSubmit={send}
        onExit={back}
      />
    )
  }

  if (screen === "promote") {
    return <PromoteTrack initial={draft} busy={busy} error={error} onSubmit={send} onExit={back} />
  }

  // Nothing can reach this while the programme is off — the choice that pushes
  // "partner" is gated above. Gated here too so the flag is the single switch:
  // if it is off, the track cannot render by any route, and a stale screen falls
  // through to the "start again" step at the bottom.
  if (screen === "partner" && PARTNER_PROGRAMME_ENABLED) {
    return <PartnerTrack onExit={back} />
  }

  // --- Back from Paystack without paying ------------------------------------
  if (screen === "unpaid" && draft) {
    const total = buildOrder(draft).total
    return (
      <Step title={UNPAID.title} description={UNPAID.body}>
        <div className="rounded-2xl border border-border/70 bg-card/80 p-5">
          <p className="text-sm text-muted-foreground">Your order</p>
          <p className="mt-1 font-medium">{describe(draft)}</p>
          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-semibold tabular-nums">{naira(total)}</span>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <Button
            size="lg"
            className="h-14 w-full text-base"
            disabled={busy}
            onClick={() => send(draft)}
          >
            {busy ? "Opening secure payment…" : `${UNPAID.retry} · ${naira(total)}`}
          </Button>
          <Button size="lg" variant="outline" className="h-12 w-full" onClick={() => edit(draft)}>
            {UNPAID.edit}
          </Button>
        </div>

        <a
          href={whatsappHref(
            `Hi UP, I'm trying to pay ${naira(total)} for ${describe(draft)} on the Work with us page and it isn't working.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <RiWhatsappLine className="h-5 w-5" aria-hidden />
          {UNPAID.help}
        </a>
      </Step>
    )
  }

  // --- We could not tell whether it was paid --------------------------------
  if (screen === "notice") {
    return (
      <Step title="We're still checking your payment">
        <div className="rounded-2xl border border-border/70 bg-card/80 p-5 text-sm">
          <p>{notice}</p>
          <p className="mt-3 text-muted-foreground">
            Please don&apos;t pay again. Message us and we&apos;ll confirm it for you.
          </p>
        </div>
        <Button asChild size="lg" className="h-14 w-full text-base">
          <a
            href={whatsappHref(`Hi UP, I paid on the Work with us page. ${notice}`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <RiWhatsappLine className="mr-2 h-5 w-5" aria-hidden />
            Message us on WhatsApp
          </a>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Or email{" "}
          <a href={`mailto:${CONTACT.email}`} className="font-medium text-primary hover:underline">
            {CONTACT.email}
          </a>
        </p>
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
          <a href={`tel:${CONTACT.phoneIntl}`} className="font-medium text-primary hover:underline">
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
      <Button size="lg" className="w-full" onClick={() => setStack(["choose"])}>
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
