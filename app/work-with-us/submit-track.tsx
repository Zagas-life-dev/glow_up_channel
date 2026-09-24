"use client"

import { useState } from "react"
import { RiAddLine, RiDeleteBinLine } from "react-icons/ri"

import { Button } from "@/components/ui/button"

import {
  DETAIL_FIELDS,
  LISTING_BULK,
  LISTING_TIERS,
  MAX_LISTINGS,
  RESOURCE_TERMS,
  REVENUE_SHARE_OPTIONS,
  SUBMIT_OPTIONS,
  allowsMultiple,
  listingUnitPrice,
  naira,
  type Contact,
  type Duration,
  type Kind,
  type SubmissionPayload,
} from "./config"
import { INTAKE } from "./copy"
import { loadContact } from "./draft"
import { Choice, ContactFields, DetailFields, NeedMore, PayFooter, Step } from "./ui"

const DURATIONS = Object.keys(LISTING_TIERS) as Duration[]

// Only the paid listings have a length to choose.
const paidListing = (kind: Kind) => kind === "job" || kind === "paid-event"

export default function SubmitTrack({
  kind,
  initial,
  busy,
  error,
  onSubmit,
  onExit,
}: {
  kind: Kind
  /** A saved order to pick back up — its answers fill the form. */
  initial?: SubmissionPayload | null
  busy: boolean
  error: string | null
  onSubmit: (payload: SubmissionPayload) => void
  onExit: () => void
}) {
  const resume = initial?.kind === kind ? initial : null
  const [stage, setStage] = useState<"terms" | "form">(
    kind === "resource" && !resume?.revenueShare ? "terms" : "form",
  )
  const [duration, setDuration] = useState<Duration>(resume?.duration ?? "standard")
  const [revenueShare, setRevenueShare] = useState<number | null>(resume?.revenueShare ?? null)
  const [entries, setEntries] = useState<Record<string, string>[]>(resume?.entries ?? [{}])
  const [contact, setContact] = useState<Contact>(() => resume?.contact ?? loadContact())

  const coCreated = Boolean(
    REVENUE_SHARE_OPTIONS.find((option) => option.value === revenueShare)?.contactOnly,
  )

  if (stage === "terms") {
    return (
      <Step
        title="Choose your terms"
        description="Listing a resource is free. We take a share of what it earns instead."
        onBack={onExit}
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
                if (!option.contactOnly) setStage("form")
              }}
            />
          ))}
        </div>

        {coCreated ? (
          <NeedMore>
            Building it together means agreeing the work and the costs in writing first, so this one
            starts with a conversation.
          </NeedMore>
        ) : null}

        <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm">
          <p className="font-medium">Either way</p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            {RESOURCE_TERMS.map((term) => (
              <li key={term}>· {term}</li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-muted-foreground">
          Your share is paid out on what the resource earns through UP. Nothing is listed until our
          team has reviewed it.
        </p>
      </Step>
    )
  }

  const option = SUBMIT_OPTIONS.find((item) => item.kind === kind)
  const noun = option?.noun ?? "listing"

  const multiple = allowsMultiple(kind)
  const payload: SubmissionPayload = {
    kind,
    entries,
    duration,
    bundleId: null,
    promotions: [],
    revenueShare: kind === "resource" ? revenueShare : null,
    contact,
  }
  const priced = paidListing(kind)
  const atMax = entries.length >= MAX_LISTINGS
  // The pack rate only exists on standard listings, so the nudge only shows there.
  const nextDropsPrice =
    priced && duration === "standard" && entries.length === LISTING_BULK.from - 1

  const updateEntry = (index: number, values: Record<string, string>) =>
    setEntries((current) => current.map((entry, i) => (i === index ? values : entry)))

  return (
    <Step
      title={`Tell us about your ${noun}`}
      description={INTAKE.reassurance}
      onBack={kind === "resource" ? () => setStage("terms") : onExit}
    >
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(payload)
        }}
      >
        {priced && (
          <div className="space-y-3">
            <p className="font-medium">How long should it stay up?</p>
            <div className="grid grid-cols-2 gap-3">
              {DURATIONS.map((value) => {
                const tier = LISTING_TIERS[value]
                return (
                  <Choice
                    key={value}
                    label={`${tier.days} days`}
                    price={naira(listingUnitPrice(entries.length, value))}
                    selected={duration === value}
                    onClick={() => setDuration(value)}
                  />
                )
              })}
            </div>
          </div>
        )}

        {entries.map((entry, index) => (
          <div
            key={index}
            className={
              multiple && entries.length > 1
                ? "space-y-4 rounded-2xl border border-border/70 bg-card/50 p-4"
                : "space-y-4"
            }
          >
            {multiple && entries.length > 1 && (
              <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-3">
                <h2 className="font-medium">
                  {noun.charAt(0).toUpperCase() + noun.slice(1)} {index + 1}
                  {entry.title ? (
                    <span className="ml-2 font-normal text-muted-foreground">{entry.title}</span>
                  ) : null}
                </h2>
                <button
                  type="button"
                  onClick={() => setEntries((current) => current.filter((_, i) => i !== index))}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive"
                >
                  <RiDeleteBinLine className="h-4 w-4" aria-hidden />
                  Remove
                </button>
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
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full"
              disabled={atMax}
              onClick={() => setEntries((current) => [...current, {}])}
            >
              <RiAddLine className="mr-2 h-4 w-4" aria-hidden />
              {atMax ? `That is the most we take at once (${MAX_LISTINGS})` : `Add another ${noun}`}
            </Button>
            {priced && duration === "standard" && (
              <p className="text-center text-sm text-muted-foreground">
                {nextDropsPrice
                  ? `Add one more and every ${noun} drops to ${naira(LISTING_BULK.price)}.`
                  : `${LISTING_BULK.from} or more and every ${noun} drops to ${naira(LISTING_BULK.price)}.`}
              </p>
            )}
          </div>
        )}

        <ContactFields value={contact} onChange={setContact} />

        <PayFooter payload={payload} busy={busy} error={error} />
      </form>
    </Step>
  )
}
