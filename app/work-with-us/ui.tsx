"use client"

import * as React from "react"
import Link from "next/link"
import { RiArrowLeftLine, RiMailLine, RiPhoneLine, RiWhatsappLine } from "react-icons/ri"

import { PARTNER_PROGRAMME_ENABLED } from "@/lib/feature-flags"

import { CONTACT, PARTNER, naira } from "./config"

/** Title, back button and body for one step of the flow. */
export function Step({
  title,
  description,
  onBack,
  children,
}: {
  title: string
  description?: string
  onBack?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <RiArrowLeftLine className="h-4 w-4" aria-hidden />
          Back
        </button>
      )}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

/** Shown wherever someone might need more than the menu offers. */
export function NeedMore({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm">
      <p className="text-muted-foreground">{children}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <a
          href={`mailto:${CONTACT.email}`}
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
        >
          <RiMailLine className="h-4 w-4" aria-hidden />
          {CONTACT.email}
        </a>
        <a
          href={`tel:${CONTACT.phoneIntl}`}
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
        >
          <RiPhoneLine className="h-4 w-4" aria-hidden />
          {CONTACT.phone}
        </a>
        <a
          href={`https://wa.me/${CONTACT.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
        >
          <RiWhatsappLine className="h-4 w-4" aria-hidden />
          WhatsApp
        </a>
      </div>
      {PARTNER_PROGRAMME_ENABLED && (
        <p className="mt-3 text-muted-foreground">
          Listing a lot?{" "}
          <Link href={PARTNER.href} className="font-medium text-primary hover:underline">
            Become a partner
          </Link>{" "}
          for unlimited listings — {naira(PARTNER.price)}.
        </p>
      )}
    </div>
  )
}
