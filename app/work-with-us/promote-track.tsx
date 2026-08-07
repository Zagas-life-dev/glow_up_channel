"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

import {
  DETAIL_FIELDS,
  MAX_PROMOTION_QUANTITY,
  PROMOTION_ITEMS,
  buildOrder,
  naira,
  type Contact,
  type SubmissionPayload,
} from "./config"
import { Choice, ContactFields, DetailFields, NeedMore, QuantityStepper, Step, SubmitButton } from "./ui"

const EMPTY_CONTACT: Contact = { name: "", email: "", phone: "", organisation: "" }

const GROUPS = [...new Set(PROMOTION_ITEMS.map((item) => item.group))]

export default function PromoteTrack({
  onDone,
  onExit,
}: {
  onDone: (payload: SubmissionPayload) => void
  onExit: () => void
}) {
  const [stage, setStage] = useState<"pick" | "form">("pick")
  const [picked, setPicked] = useState<Record<string, number>>({})
  const [details, setDetails] = useState<Record<string, string>>({})
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT)

  const promotions = Object.entries(picked).map(([id, quantity]) => ({ id, quantity }))
  const payload: SubmissionPayload = {
    kind: "promotion",
    entries: [details],
    promotions,
    revenueShare: null,
    contact,
  }
  const order = buildOrder(payload)

  const toggle = (id: string) =>
    setPicked((current) => {
      if (!current[id]) return { ...current, [id]: 1 }
      const next = { ...current }
      delete next[id]
      return next
    })

  if (stage === "pick") {
    return (
      <Step
        title="What do you want to promote?"
        description="Pick as many as you like — the prices add up as you go."
        onBack={onExit}
      >
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

        <NeedMore>Running something long term, or want a mix we have not listed?</NeedMore>

        <div className="sticky bottom-4 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-lg backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-semibold">{naira(order.total)}</span>
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={promotions.length === 0}
            onClick={() => setStage("form")}
          >
            Continue
          </Button>
        </div>
      </Step>
    )
  }

  return (
    <Step
      title="Tell us what to promote"
      description="The more you give us, the better we can put it together."
      onBack={() => setStage("pick")}
    >
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault()
          onDone(payload)
        }}
      >
        <DetailFields fields={DETAIL_FIELDS.promotion} values={details} onChange={setDetails} />
        <ContactFields value={contact} onChange={setContact} />
        <SubmitButton>Continue to payment</SubmitButton>
      </form>
    </Step>
  )
}
