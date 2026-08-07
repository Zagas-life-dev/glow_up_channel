"use client"

import Link from "next/link"
import { RiCheckboxCircleFill } from "react-icons/ri"

import { Button } from "@/components/ui/button"

import { PARTNER, naira } from "./config"
import { NeedMore, Step } from "./ui"

const BENEFITS = [
  "Publish your own opportunities, events, jobs and resources",
  "List as much as you want — no per-listing fee",
  "A provider dashboard with analytics and promotions",
  "First call on partner-only features as we build them",
]

export default function PartnerTrack({ onExit }: { onExit: () => void }) {
  return (
    <Step
      title="Become a partner"
      description={`Our founding partner programme is open for ${naira(PARTNER.price)} — the first ${PARTNER.seats} only.`}
      onBack={onExit}
    >
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Founding partner
        </p>
        <p className="mt-2 text-4xl font-bold tracking-tight">{naira(PARTNER.price)}</p>
        <ul className="mt-6 space-y-3">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3 text-sm">
              <RiCheckboxCircleFill className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              {benefit}
            </li>
          ))}
        </ul>
        <Button asChild size="lg" className="mt-8 w-full">
          <Link href={PARTNER.href}>See the full offer</Link>
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Partnership is attached to an account, so you will sign in on the next page.
        </p>
      </div>

      <NeedMore>Want to talk it through first, or need terms built around your organisation?</NeedMore>
    </Step>
  )
}
