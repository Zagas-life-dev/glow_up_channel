"use client"

import * as React from "react"
import Link from "next/link"
import {
  RiArrowLeftLine,
  RiCheckLine,
  RiLoader4Line,
  RiLockLine,
  RiMailLine,
  RiPhoneLine,
  RiWhatsappLine,
} from "react-icons/ri"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { whatsappHref } from "@/lib/contact"
import { PARTNER_PROGRAMME_ENABLED } from "@/lib/feature-flags"
import { cn } from "@/lib/utils"

import {
  CONTACT,
  PARTNER,
  buildOrder,
  naira,
  normaliseLink,
  type Contact,
  type DetailField,
  type SubmissionPayload,
} from "./config"
import { PAY } from "./copy"

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

/**
 * Big enough to hit with a thumb, and 16px text everywhere so iOS never zooms
 * the page when a field is tapped.
 */
const INPUT_CLASS = "h-12 text-base md:text-base"

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
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/50 p-4">
      <p className="font-medium">Your details</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={FIELD_CLASS}>
          <Label htmlFor="wwu-name">Your name</Label>
          <Input
            id="wwu-name"
            className={INPUT_CLASS}
            autoComplete="name"
            value={value.name}
            onChange={set("name")}
            required
          />
        </div>
        <div className={FIELD_CLASS}>
          <Label htmlFor="wwu-phone">Phone number</Label>
          <Input
            id="wwu-phone"
            className={INPUT_CLASS}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={value.phone}
            onChange={set("phone")}
            required
          />
        </div>
      </div>
      <div className={FIELD_CLASS}>
        <Label htmlFor="wwu-email">Email</Label>
        <Input
          id="wwu-email"
          className={INPUT_CLASS}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={value.email}
          onChange={set("email")}
          required
        />
        <p className="text-sm text-muted-foreground">Your receipt and updates go here.</p>
      </div>
      <div className={FIELD_CLASS}>
        <Label htmlFor="wwu-org">
          Company or organisation
          <span className="ml-1 text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="wwu-org"
          className={INPUT_CLASS}
          autoComplete="organization"
          value={value.organisation}
          onChange={set("organisation")}
        />
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
        const value = values[field.name] ?? ""
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
                className="text-base md:text-base"
                value={value}
                onChange={set(field.name)}
                placeholder={field.placeholder}
                required={!field.optional}
              />
            ) : field.type === "url" ? (
              // A plain text box, not type="url": the browser's own check
              // rejects "mysite.com" with a message most people cannot act on.
              <Input
                id={id}
                className={INPUT_CLASS}
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={value}
                onChange={set(field.name)}
                onBlur={() => {
                  const fixed = normaliseLink(value)
                  if (fixed !== value) onChange({ ...values, [field.name]: fixed })
                }}
                placeholder={field.placeholder}
                required={!field.optional}
              />
            ) : (
              <Input
                id={id}
                className={INPUT_CLASS}
                type={field.type}
                value={value}
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

/**
 * The end of every form: total, terms, where the receipt goes, any error, and
 * one button that goes straight to Paystack. This used to be a whole "check it
 * over" screen; folding it in here takes a step out of every purchase.
 */
export function PayFooter({
  payload,
  busy,
  error,
}: {
  payload: SubmissionPayload
  busy: boolean
  error: string | null
}) {
  const order = buildOrder(payload)
  const paid = order.total > 0

  return (
    <div className="space-y-4">
      {paid && (
        <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
          <ul className="space-y-2">
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
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-semibold tabular-nums">{naira(order.total)}</span>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">{paid ? PAY.terms : PAY.freeTerms}</p>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
        >
          <p className="font-medium text-destructive">{error}</p>
          <a
            href={whatsappHref(`Hi UP, I'm stuck on the Work with us form: "${error}"`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            <RiWhatsappLine className="h-4 w-4" aria-hidden />
            Get help on WhatsApp
          </a>
        </div>
      )}

      <Button type="submit" size="lg" className="h-14 w-full text-base" disabled={busy}>
        {busy ? (
          <>
            <RiLoader4Line className="mr-2 h-5 w-5 animate-spin" aria-hidden />
            {paid ? "Opening secure payment…" : "Sending…"}
          </>
        ) : paid ? (
          <>
            <RiLockLine className="mr-2 h-5 w-5" aria-hidden />
            {PAY.payCta(naira(order.total))}
          </>
        ) : (
          PAY.freeCta
        )}
      </Button>
      {paid && <p className="text-center text-sm text-muted-foreground">{PAY.paystackNote}</p>}
    </div>
  )
}
