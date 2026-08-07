"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { RiCheckboxCircleFill, RiLoader4Line } from "react-icons/ri"
import { toast } from "sonner"

import { PageShell } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"

import { CONTACT, buildOrder, naira, type SubmissionPayload } from "./config"
import PartnerTrack from "./partner-track"
import PromoteTrack from "./promote-track"
import SubmitTrack from "./submit-track"
import { Choice, Step } from "./ui"

type Screen = "welcome" | "choose" | "submit" | "promote" | "partner" | "review" | "done"

type Result = { ref: string; amountNg: number; paid: boolean }

function Flow() {
  const searchParams = useSearchParams()
  const [stack, setStack] = useState<Screen[]>(["welcome"])
  const [draft, setDraft] = useState<SubmissionPayload | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
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
        setResult({ ref: json.ref, amountNg: json.amountNg, paid: true })
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
      setResult({ ref: json.ref, amountNg: 0, paid: false })
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

  if (screen === "welcome") {
    return (
      <Step
        title="Work with us"
        description="This is where you bring us what you have — an opportunity for the community, something you want promoted, or a longer partnership."
      >
        <div className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-5 text-sm">
          <p className="font-medium">In a few minutes you can:</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>· Put an opportunity, job, event or resource in front of our community</li>
            <li>· Promote what you are building across the platform and our socials</li>
            <li>· Become a partner and stop paying per listing</li>
          </ul>
          <p className="text-muted-foreground">
            You pick what you need, fill one form, and pay if there is anything to pay. Our team
            reviews everything before it goes live.
          </p>
        </div>
        <Button size="lg" className="w-full" onClick={() => go("choose")}>
          Get started
        </Button>
      </Step>
    )
  }

  if (screen === "choose") {
    return (
      <Step title="What would you like to do?" onBack={back}>
        <div className="space-y-3">
          <Choice
            label="Submit an opportunity, job, event or resource"
            blurb="Opportunities and free events are free. Jobs, paid events and resources have their own terms."
            onClick={() => go("submit")}
          />
          <Choice
            label="Promotion"
            blurb="Get in front of the community on the platform, in our socials and in our compilations."
            onClick={() => go("promote")}
          />
          <Choice
            label="Become a partner"
            blurb="Unlimited listings and a long-term arrangement with us."
            onClick={() => go("partner")}
          />
        </div>
      </Step>
    )
  }

  if (screen === "submit") {
    return <SubmitTrack onDone={review} onExit={back} />
  }

  if (screen === "promote") {
    return <PromoteTrack onDone={review} onExit={back} />
  }

  if (screen === "partner") {
    return <PartnerTrack onExit={back} />
  }

  if (screen === "review" && draft) {
    const order = buildOrder(draft)
    return (
      <Step
        title="Check it over"
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

        <p className="text-sm text-muted-foreground">
          We will send updates to <span className="font-medium text-foreground">{draft.contact.email}</span>.
        </p>

        <Button size="lg" className="w-full" onClick={send} disabled={busy}>
          {busy ? "Please wait…" : order.total > 0 ? `Pay ${naira(order.total)}` : "Send it in"}
        </Button>
        {order.total > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            You will be taken to Paystack to pay, then brought straight back here.
          </p>
        )}
      </Step>
    )
  }

  if (screen === "done" && result) {
    return (
      <Step title={result.paid ? "Payment received" : "That is in"}>
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <RiCheckboxCircleFill className="h-8 w-8 text-primary" aria-hidden />
          <p className="mt-4 text-sm">
            {result.paid
              ? `We have your ${naira(result.amountNg)} payment and your submission.`
              : "We have your submission."}{" "}
            Our team reviews everything before it goes live, and we will email you either way.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Your reference is <span className="font-semibold text-foreground">{result.ref}</span> —
            quote it if you get in touch.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={startOver}>
            Submit something else
          </Button>
          <Button asChild className="flex-1">
            <Link href="/">Back to GlowUp</Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Questions?{" "}
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
