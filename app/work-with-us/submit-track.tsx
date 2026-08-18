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
  buildOrder,
  listingUnitPrice,
  naira,
  type Contact,
  type Duration,
  type Kind,
  type SubmissionPayload,
} from "./config"
import { INTAKE } from "./copy"
import {
  Choice,
  ContactFields,
  DetailFields,
  NeedMore,
  ProductCard,
  Step,
  SubmitButton,
  TalkToUs,
} from "./ui"

const EMPTY_CONTACT: Contact = { name: "", email: "", phone: "", organisation: "" }

type Stage = "kind" | "duration" | "terms" | "form"

const DURATIONS = Object.keys(LISTING_TIERS) as Duration[]

export default function SubmitTrack({
  onDone,
  onExit,
}: {
  onDone: (payload: SubmissionPayload) => void
  onExit: () => void
}) {
  const [stage, setStage] = useState<Stage>("kind")
  const [kind, setKind] = useState<Kind | null>(null)
  const [duration, setDuration] = useState<Duration>("standard")
  const [revenueShare, setRevenueShare] = useState<number | null>(null)
  const [entries, setEntries] = useState<Record<string, string>[]>([{}])
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT)

  // Only the paid listings have a length to choose — everything else is one hop
  // from the type straight to the form.
  const paidListing = (next: Kind) => next === "job" || next === "paid-event"

  const chooseKind = (next: Kind) => {
    setKind(next)
    setEntries([{}])
    setStage(next === "resource" ? "terms" : paidListing(next) ? "duration" : "form")
  }

  if (stage === "kind" || !kind) {
    return (
      <Step
        title="What are you putting in front of the community?"
        description="Opportunities and free events are always free to list."
        onBack={onExit}
      >
        <div className="space-y-3">
          {SUBMIT_OPTIONS.map((option) => (
            <ProductCard
              key={option.kind}
              label={option.label}
              outcome={option.blurb}
              price={option.price}
              includes={option.includes}
              timing={option.timing}
              cta={option.cta}
              onClick={() => chooseKind(option.kind)}
            />
          ))}
        </div>
        <TalkToUs>Not sure which one you need?</TalkToUs>
      </Step>
    )
  }

  const coCreated = Boolean(
    REVENUE_SHARE_OPTIONS.find((option) => option.value === revenueShare)?.contactOnly,
  )

  if (stage === "duration") {
    return (
      <Step
        title="How long should it stay up?"
        description="You can send several at once on the next screen — the price per listing drops from five up."
        onBack={() => setStage("kind")}
      >
        <div className="space-y-3">
          {DURATIONS.map((value) => {
            const tier = LISTING_TIERS[value]
            return (
              <Choice
                key={value}
                label={`${tier.label} · ${tier.days} days`}
                blurb={tier.blurb}
                price={naira(tier.price)}
                selected={duration === value}
                onClick={() => {
                  setDuration(value)
                  setStage("form")
                }}
              />
            )
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          {LISTING_BULK.from} or more standard listings drop to {naira(LISTING_BULK.price)} each, so
          five come to {naira(LISTING_BULK.price * LISTING_BULK.from)}.
        </p>
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
                if (option.contactOnly) {
                  setRevenueShare(option.value)
                  return
                }
                setRevenueShare(option.value)
                setStage("form")
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
  const label = option?.label ?? "Submission"
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
  const total = buildOrder(payload).total
  const priced = total > 0 || paidListing(kind)
  const atMax = entries.length >= MAX_LISTINGS
  const tier = LISTING_TIERS[duration]
  // The pack rate only exists on standard listings, so the nudge only shows there.
  const nextDropsPrice =
    priced && duration === "standard" && entries.length === LISTING_BULK.from - 1

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
      onBack={() => setStage(kind === "resource" ? "terms" : paidListing(kind) ? "duration" : "kind")}
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
                {entries.length === 1 ? "" : "s"} ·{" "}
                {naira(listingUnitPrice(entries.length, duration))} each
              </p>
              <p className="text-lg font-semibold tabular-nums">{naira(total)}</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {tier.label} · {tier.days} days each.{" "}
              {duration === "extended"
                ? "Extended listings are the same price however many you send."
                : nextDropsPrice
                  ? `Add one more and every ${noun} drops to ${naira(LISTING_BULK.price)}.`
                  : `${LISTING_BULK.from} or more drops every ${noun} to ${naira(LISTING_BULK.price)}.`}
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

        <p className="text-sm text-muted-foreground">{INTAKE.reassurance}</p>

        {priced && <NeedMore>Need something bigger, or a price for a batch?</NeedMore>}

        <SubmitButton>{total > 0 ? "Continue to payment" : "Continue"}</SubmitButton>
      </form>
    </Step>
  )
}
