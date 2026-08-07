"use client"

import { useState } from "react"
import { RiAddLine, RiDeleteBinLine } from "react-icons/ri"

import { Button } from "@/components/ui/button"

import {
  DETAIL_FIELDS,
  LISTING_PRICING,
  MAX_LISTINGS,
  REVENUE_SHARE_OPTIONS,
  SUBMIT_OPTIONS,
  allowsMultiple,
  buildOrder,
  listingUnitPrice,
  naira,
  type Contact,
  type Kind,
  type SubmissionPayload,
} from "./config"
import { Choice, ContactFields, DetailFields, NeedMore, Step, SubmitButton } from "./ui"

const EMPTY_CONTACT: Contact = { name: "", email: "", phone: "", organisation: "" }

type Stage = "kind" | "terms" | "form"

export default function SubmitTrack({
  onDone,
  onExit,
}: {
  onDone: (payload: SubmissionPayload) => void
  onExit: () => void
}) {
  const [stage, setStage] = useState<Stage>("kind")
  const [kind, setKind] = useState<Kind | null>(null)
  const [revenueShare, setRevenueShare] = useState<number | null>(null)
  const [entries, setEntries] = useState<Record<string, string>[]>([{}])
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT)

  const chooseKind = (next: Kind) => {
    setKind(next)
    setEntries([{}])
    setStage(next === "resource" ? "terms" : "form")
  }

  if (stage === "kind" || !kind) {
    return (
      <Step
        title="What are you submitting?"
        description="Opportunities and free events are always free to list."
        onBack={onExit}
      >
        <div className="space-y-3">
          {SUBMIT_OPTIONS.map((option) => (
            <Choice
              key={option.kind}
              label={option.label}
              blurb={option.blurb}
              price={option.price}
              onClick={() => chooseKind(option.kind)}
            />
          ))}
        </div>
      </Step>
    )
  }

  if (stage === "terms") {
    return (
      <Step
        title="Choose your terms"
        description="We do not charge to list a resource. We take a share of what it earns instead."
        onBack={() => setStage("kind")}
      >
        <div className="space-y-3">
          {REVENUE_SHARE_OPTIONS.map((option) => (
            <Choice
              key={option.value}
              label={option.label}
              blurb={option.blurb}
              selected={revenueShare === option.value}
              onClick={() => {
                setRevenueShare(option.value)
                setStage("form")
              }}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Your share is paid out on what the resource earns through GlowUp. Nothing is listed until
          our team has reviewed it.
        </p>
      </Step>
    )
  }

  const option = SUBMIT_OPTIONS.find((item) => item.kind === kind)
  const label = option?.label ?? "Submission"
  const noun = option?.noun ?? "listing"

  const multiple = allowsMultiple(kind)
  const payload: SubmissionPayload = {
    kind,
    entries,
    promotions: [],
    revenueShare: kind === "resource" ? revenueShare : null,
    contact,
  }
  const total = buildOrder(payload).total
  const priced = total > 0 || kind === "job" || kind === "paid-event"
  const atMax = entries.length >= MAX_LISTINGS
  const nextDropsPrice = priced && entries.length === LISTING_PRICING.bulkFrom - 1

  const updateEntry = (index: number, values: Record<string, string>) =>
    setEntries((current) => current.map((entry, i) => (i === index ? values : entry)))

  return (
    <Step
      title={`Tell us about your ${label.toLowerCase()}`}
      description={
        multiple
          ? `One form for each ${noun} — add as many as you need.${
              priced ? " The price updates as you go." : ""
            }`
          : "We review every submission before it goes live."
      }
      onBack={() => setStage(kind === "resource" ? "terms" : "kind")}
    >
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault()
          onDone(payload)
        }}
      >
        {priced ? (
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-medium">
                {entries.length} {noun}
                {entries.length === 1 ? "" : "s"} · {naira(listingUnitPrice(entries.length))} each
              </p>
              <p className="text-lg font-semibold tabular-nums">{naira(total)}</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {nextDropsPrice
                ? `Add one more and every ${noun} drops to ${naira(LISTING_PRICING.bulk)}.`
                : `${LISTING_PRICING.bulkFrom} or more drops every ${noun} to ${naira(LISTING_PRICING.bulk)}.`}
            </p>
          </div>
        ) : (
          multiple && (
            <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
              <p className="font-medium">
                {entries.length} {noun}
                {entries.length === 1 ? "" : "s"} · free
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Send as many as you have. We review each one before it goes live.
              </p>
            </div>
          )
        )}

        {entries.map((entry, index) => (
          <div
            key={index}
            className={
              multiple ? "space-y-4 rounded-2xl border border-border/70 bg-card/50 p-4" : "space-y-4"
            }
          >
            {multiple && (
              <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-3">
                <h2 className="font-medium">
                  {noun.charAt(0).toUpperCase() + noun.slice(1)} {index + 1}
                  {entry.title ? (
                    <span className="ml-2 font-normal text-muted-foreground">{entry.title}</span>
                  ) : null}
                </h2>
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setEntries((current) => current.filter((_, i) => i !== index))}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <RiDeleteBinLine className="h-4 w-4" aria-hidden />
                    Remove
                  </button>
                )}
              </div>
            )}
            <DetailFields
              fields={DETAIL_FIELDS[kind]}
              values={entry}
              onChange={(values) => updateEntry(index, values)}
              idPrefix={`wwu-${index}`}
            />
          </div>
        ))}

        {multiple && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={atMax}
            onClick={() => setEntries((current) => [...current, {}])}
          >
            <RiAddLine className="mr-2 h-4 w-4" aria-hidden />
            {atMax ? `That is the most we take at once (${MAX_LISTINGS})` : `Add another ${noun}`}
          </Button>
        )}

        <ContactFields value={contact} onChange={setContact} />

        {priced && <NeedMore>Need something bigger, or a price for a batch?</NeedMore>}

        <SubmitButton>{total > 0 ? "Continue to payment" : "Continue"}</SubmitButton>
      </form>
    </Step>
  )
}
