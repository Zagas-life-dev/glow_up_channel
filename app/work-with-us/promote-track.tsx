"use client"

import { useState } from "react"
import { RiCheckLine } from "react-icons/ri"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import {
  BUNDLES,
  DETAIL_FIELDS,
  MAX_PROMOTION_QUANTITY,
  PROMOTION_ITEMS,
  buildOrder,
  naira,
  type Contact,
  type SubmissionPayload,
} from "./config"
import { INTAKE } from "./copy"
import { loadContact } from "./draft"
import {
  Choice,
  ContactFields,
  DetailFields,
  NeedMore,
  PayFooter,
  QuantityStepper,
  Step,
  TalkToUs,
} from "./ui"

const GROUPS = [...new Set(PROMOTION_ITEMS.map((item) => item.group))]

/** One of the three signature bundles, shown as a card rather than a row. */
function BundleCard({
  bundle,
  selected,
  onClick,
}: {
  bundle: (typeof BUNDLES)[number]
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border p-5 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border/70 bg-card/80 hover:border-primary/50 hover:bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold tracking-tight">{bundle.label}</p>
          <p className="text-sm text-muted-foreground">{bundle.blurb}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="font-semibold text-primary">{naira(bundle.price)}</span>
          {selected && <RiCheckLine className="h-5 w-5 text-primary" aria-hidden />}
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
        {bundle.contents.map((line) => (
          <li key={line}>· {line}</li>
        ))}
      </ul>
      <span className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground">
        Choose {bundle.label}
      </span>
    </button>
  )
}

export default function PromoteTrack({
  initial,
  busy,
  error,
  onSubmit,
  onExit,
}: {
  /** A saved order to pick back up — its answers fill the form. */
  initial?: SubmissionPayload | null
  busy: boolean
  error: string | null
  onSubmit: (payload: SubmissionPayload) => void
  onExit: () => void
}) {
  const resume = initial?.kind === "promotion" ? initial : null
  const [stage, setStage] = useState<"pick" | "form">(resume ? "form" : "pick")
  const [bundleId, setBundleId] = useState<string | null>(resume?.bundleId ?? null)
  const [picked, setPicked] = useState<Record<string, number>>(() =>
    Object.fromEntries((resume?.promotions ?? []).map((item) => [item.id, item.quantity])),
  )
  const [details, setDetails] = useState<Record<string, string>>(resume?.entries[0] ?? {})
  const [contact, setContact] = useState<Contact>(() => resume?.contact ?? loadContact())

  const promotions = Object.entries(picked).map(([id, quantity]) => ({ id, quantity }))
  const payload: SubmissionPayload = {
    kind: "promotion",
    entries: [details],
    duration: "standard",
    bundleId,
    promotions,
    revenueShare: null,
    contact,
  }
  const order = buildOrder(payload)
  const chosen = Boolean(bundleId) || promotions.length > 0

  // A bundle already contains the individual items, so holding both would
  // charge twice for the same work. Picking either side clears the other.
  // A bundle is the whole decision, so tapping one goes straight to the form.
  const chooseBundle = (id: string) => {
    setBundleId(id)
    setPicked({})
    setStage("form")
  }

  const toggle = (id: string) => {
    setBundleId(null)
    setPicked((current) => {
      if (!current[id]) return { ...current, [id]: 1 }
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  if (stage === "pick") {
    return (
      <Step
        title="How far do you want this to travel?"
        description="Most people tap a bundle. Or build your own from the list underneath."
        onBack={onExit}
      >
        <div className="space-y-3">
          {BUNDLES.map((bundle) => (
            <BundleCard
              key={bundle.id}
              bundle={bundle}
              selected={bundleId === bundle.id}
              onClick={() => chooseBundle(bundle.id)}
            />
          ))}
        </div>

        <div className="flex items-center gap-4 pt-2">
          <span className="h-px flex-1 bg-border" />
          <span className="text-sm text-muted-foreground">or build your own</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-6">
          {GROUPS.map((group) => (
            <div key={group} className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {group}
              </h2>
              {PROMOTION_ITEMS.filter((item) => item.group === group).map((item) => (
                <div key={item.id} className="space-y-2">
                  <Choice
                    label={item.label}
                    blurb={item.blurb}
                    price={naira(item.price)}
                    selected={Boolean(picked[item.id])}
                    onClick={() => toggle(item.id)}
                  />
                  {picked[item.id] && (
                    <div className="flex items-center justify-between gap-4 pl-4">
                      <span className="text-sm text-muted-foreground">How many?</span>
                      <QuantityStepper
                        value={picked[item.id]}
                        onChange={(quantity) =>
                          setPicked((current) => ({ ...current, [item.id]: quantity }))
                        }
                        max={MAX_PROMOTION_QUANTITY}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <TalkToUs>Not sure which of these fits?</TalkToUs>

        <NeedMore>Running something long term, or want a mix we have not listed?</NeedMore>

        {/* Only once something is picked — an empty bar with a dead button is a question mark. */}
        {chosen && (
          <div className="sticky bottom-4 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-lg backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-semibold">{naira(order.total)}</span>
            </div>
            <Button size="lg" className="h-12 w-full" onClick={() => setStage("form")}>
              Continue
            </Button>
          </div>
        )}
      </Step>
    )
  }

  return (
    <Step
      title="Tell us what to promote"
      description={INTAKE.reassurance}
      onBack={() => setStage("pick")}
    >
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(payload)
        }}
      >
        <button
          type="button"
          onClick={() => setStage("pick")}
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card/80 p-4 text-left text-sm"
        >
          <span>
            <span className="block font-medium">
              {bundleId
                ? BUNDLES.find((bundle) => bundle.id === bundleId)?.label
                : `${promotions.length} item${promotions.length === 1 ? "" : "s"} picked`}
            </span>
            {bundleId && (
              <span className="mt-1 block text-muted-foreground">
                Includes a platform listing. Fill in what you can — we'll ask for anything else.
              </span>
            )}
          </span>
          <span className="flex-shrink-0 font-medium text-primary">Change</span>
        </button>

        <DetailFields fields={DETAIL_FIELDS.promotion} values={details} onChange={setDetails} />
        <ContactFields value={contact} onChange={setContact} />

        <PayFooter payload={payload} busy={busy} error={error} />
      </form>
    </Step>
  )
}
