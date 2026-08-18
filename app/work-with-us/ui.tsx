"use client"

import * as React from "react"
import Link from "next/link"
import { RiArrowLeftLine, RiCheckLine, RiWhatsappLine, RiMailLine, RiPhoneLine } from "react-icons/ri"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PARTNER_PROGRAMME_ENABLED } from "@/lib/feature-flags"
import { cn } from "@/lib/utils"

import { CONTACT, PARTNER, naira, type Contact, type DetailField } from "./config"

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

/** A big clickable option. Used for every "pick one" screen. */
export function Choice({
  label,
  blurb,
  price,
  selected,
  onClick,
}: {
  label: string
  blurb?: string
  price?: string
  selected?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start justify-between gap-4 rounded-2xl border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border/70 bg-card/80 hover:border-primary/50 hover:bg-card",
      )}
    >
      <span className="min-w-0 space-y-1">
        <span className="block font-medium">{label}</span>
        {blurb && <span className="block text-sm text-muted-foreground">{blurb}</span>}
      </span>
      <span className="flex flex-shrink-0 items-center gap-2">
        {price && <span className="text-sm font-medium text-primary">{price}</span>}
        {selected && <RiCheckLine className="h-5 w-5 text-primary" aria-hidden />}
      </span>
    </button>
  )
}

/**
 * A product card in the pipeline's formula (§4.1): name, one-line outcome,
 * price, what's included, timing, one CTA — in that order. The outcome sits
 * above the deliverables on purpose; the buyer decides on the outcome.
 */
export function ProductCard({
  label,
  outcome,
  price,
  includes,
  timing,
  cta,
  onClick,
}: {
  label: string
  outcome: string
  price: string
  includes: string[]
  timing: string
  cta: string
  onClick: () => void
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-medium">{label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{outcome}</p>
        </div>
        <span className="flex-shrink-0 text-sm font-semibold text-primary">{price}</span>
      </div>

      <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
        {includes.map((line) => (
          <li key={line} className="flex gap-2">
            <RiCheckLine className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
            {line}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted-foreground">{timing}</p>

      <Button className="mt-4 w-full" variant="outline" onClick={onClick}>
        {cta}
      </Button>
    </div>
  )
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 50,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  const clamp = (next: number) => onChange(Math.min(max, Math.max(min, next)))
  return (
    <div className="inline-flex items-center rounded-xl border border-border/70">
      <button
        type="button"
        onClick={() => clamp(value - 1)}
        disabled={value <= min}
        className="h-9 w-9 text-lg leading-none disabled:opacity-40"
        aria-label="Less"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-medium tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => clamp(value + 1)}
        disabled={value >= max}
        className="h-9 w-9 text-lg leading-none disabled:opacity-40"
        aria-label="More"
      >
        +
      </button>
    </div>
  )
}

const FIELD_CLASS = "space-y-2"

export function ContactFields({
  value,
  onChange,
}: {
  value: Contact
  onChange: (value: Contact) => void
}) {
  const set = (key: keyof Contact) => (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: event.target.value })

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={FIELD_CLASS}>
          <Label htmlFor="wwu-name">Your name</Label>
          <Input id="wwu-name" value={value.name} onChange={set("name")} required />
        </div>
        <div className={FIELD_CLASS}>
          <Label htmlFor="wwu-org">Organisation</Label>
          <Input
            id="wwu-org"
            value={value.organisation}
            onChange={set("organisation")}
            placeholder="Optional"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={FIELD_CLASS}>
          <Label htmlFor="wwu-email">Email</Label>
          <Input id="wwu-email" type="email" value={value.email} onChange={set("email")} required />
        </div>
        <div className={FIELD_CLASS}>
          <Label htmlFor="wwu-phone">Phone</Label>
          <Input id="wwu-phone" type="tel" value={value.phone} onChange={set("phone")} required />
        </div>
      </div>
    </div>
  )
}

/**
 * Renders the fields listed for a kind in config.ts. `idPrefix` keeps input ids
 * unique when the same form is shown more than once on a page.
 */
export function DetailFields({
  fields,
  values,
  onChange,
  idPrefix = "wwu",
}: {
  fields: DetailField[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
  idPrefix?: string
}) {
  const set = (name: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...values, [name]: event.target.value })

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.name}`
        return (
          <div key={field.name} className={FIELD_CLASS}>
            <Label htmlFor={id}>
              {field.label}
              {field.optional && <span className="ml-1 text-muted-foreground">(optional)</span>}
            </Label>
            {field.type === "textarea" ? (
              <Textarea
                id={id}
                rows={4}
                value={values[field.name] ?? ""}
                onChange={set(field.name)}
                placeholder={field.placeholder}
                required={!field.optional}
              />
            ) : (
              <Input
                id={id}
                type={field.type === "url" ? "url" : field.type}
                value={values[field.name] ?? ""}
                onChange={set(field.name)}
                placeholder={field.placeholder}
                required={!field.optional}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * The "Talk to UP" path. The pipeline is specific that this sits *beside* the
 * primary CTA, never instead of it — it recovers buyers who need help choosing
 * without turning a ₦5,000 listing into a sales call.
 */
export function TalkToUs({ children }: { children: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
      <span className="text-muted-foreground">{children}</span>
      <a
        href={`https://wa.me/${CONTACT.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
      >
        <RiWhatsappLine className="h-4 w-4" aria-hidden />
        WhatsApp
      </a>
      <a
        href={`mailto:${CONTACT.email}`}
        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
      >
        <RiMailLine className="h-4 w-4" aria-hidden />
        Email
      </a>
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

export function SubmitButton({
  children,
  busy,
  disabled,
}: {
  children: React.ReactNode
  busy?: boolean
  disabled?: boolean
}) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={busy || disabled}>
      {busy ? "Please wait…" : children}
    </Button>
  )
}
