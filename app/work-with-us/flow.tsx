"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { IconType } from "react-icons"
import {
  RiArrowLeftLine,
  RiArrowRightSLine,
  RiBookOpenLine,
  RiBriefcase4Line,
  RiCalendar2Line,
  RiCalendarLine,
  RiCheckLine,
  RiEmotionHappyLine,
  RiErrorWarningLine,
  RiGraduationCapLine,
  RiLeafLine,
  RiLoader4Line,
  RiLockLine,
  RiMegaphoneLine,
  RiPlantLine,
  RiRocket2Line,
  RiSeedlingLine,
  RiTeamLine,
  RiTicket2Line,
  RiUserSmileLine,
  RiWhatsappLine,
} from "react-icons/ri"

import { Button } from "@/components/ui/button"
import { whatsappHref } from "@/lib/contact"
import { PARTNER_PROGRAMME_ENABLED } from "@/lib/feature-flags"
import { cn } from "@/lib/utils"

import {
  BUNDLES,
  LISTING_BULK,
  LISTING_TIERS,
  MAX_LISTINGS,
  PROMOTION_ITEMS,
  buildOrder,
  naira,
  normaliseLink,
  type Contact,
  type Kind,
  type SubmissionPayload,
} from "./config"
import { FLOW, PAY } from "./copy"

// ---------------------------------------------------------------------------
// Answers, and how they become the payload the server already takes
// ---------------------------------------------------------------------------

type Goal = "post" | "promote" | "sell"
type PostKind = "job" | "event" | "opp"

/**
 * Everything asked so far, in the words of the questions rather than the
 * database's. `payloadFrom` turns it into the same SubmissionPayload the old
 * forms sent, so nothing on the server had to change for this flow.
 */
type Answers = {
  goal?: Goal
  kind?: PostKind
  /** Events only. */
  free?: boolean
  title?: string
  /** "" means they tapped "I don't have a link". */
  link?: string
  date?: string
  /** "" means "No deadline". */
  deadline?: string
  where?: string
  about?: string
  /** Paid posts only: 7 → standard, 30 → extended. */
  length?: 7 | 30
  /** A bundle id, or "custom" for pick-your-own. */
  size?: string
  pieces?: Record<string, boolean>
  split?: 20 | 30
  rtype?: string
  /** Digits only. */
  price?: string
  name?: string
  org?: string
  email?: string
  phone?: string
}

type StepId =
  | "goal"
  | "kind"
  | "free"
  | "size"
  | "pieces"
  | "split"
  | "title"
  | "link"
  | "date"
  | "deadline"
  | "where"
  | "rtype"
  | "price"
  | "about"
  | "length"
  | "name"
  | "reach"
  | "check"

const isPaidPost = (a: Answers) =>
  a.goal === "post" && (a.kind === "job" || (a.kind === "event" && a.free === false))

/** Which of the copy's per-thing variants applies: job, event, opp, sell or promote. */
function thing(a: Answers): "job" | "event" | "opp" | "sell" | "promote" {
  if (a.goal === "post") return a.kind ?? "job"
  return a.goal === "sell" ? "sell" : "promote"
}

const NOUN = { job: "job", event: "event", opp: "opportunity", sell: "course or guide", promote: "thing" }

/** The questions this person will be asked, in order, given what they have said. */
function path(a: Answers): StepId[] {
  const steps: StepId[] = ["goal"]
  if (a.goal === "post") {
    steps.push("kind")
    if (a.kind === "event") steps.push("free")
    steps.push("title", "link", a.kind === "event" ? "date" : "deadline")
    if (a.kind !== "opp") steps.push("where")
    steps.push("about")
    if (isPaidPost(a)) steps.push("length")
  } else if (a.goal === "promote") {
    steps.push("size")
    if (a.size === "custom") steps.push("pieces")
    steps.push("title", "link", "about")
  } else if (a.goal === "sell") {
    steps.push("split", "title", "rtype", "price", "link", "about")
  }
  if (a.goal) steps.push("name", "reach", "check")
  return steps
}

/** Whether a step still has nothing in it — used to finish a change from the check page. */
function unanswered(step: StepId, a: Answers): boolean {
  switch (step) {
    case "kind":
      return !a.kind
    case "free":
      return a.free === undefined
    case "size":
      return !a.size
    case "pieces":
      return !Object.values(a.pieces ?? {}).some(Boolean)
    case "split":
      return !a.split
    case "link":
      return a.link === undefined
    case "deadline":
      return a.deadline === undefined
    case "reach":
      return !a.email || !a.phone
    case "goal":
    case "check":
      return false
    default:
      return !a[step]
  }
}

function kindOf(a: Answers): Kind {
  if (a.goal === "promote") return "promotion"
  if (a.goal === "sell") return "resource"
  if (a.kind === "job") return "job"
  if (a.kind === "opp") return "free-opportunity"
  return a.free === false ? "paid-event" : "free-event"
}

/** One listing's form, in the field names config.ts's DETAIL_FIELDS uses. */
function entryFrom(a: Answers): Record<string, string> {
  const entry: Record<string, string> = {
    title: a.title ?? "",
    description: a.about ?? "",
    link: normaliseLink(a.link ?? ""),
  }
  const kind = kindOf(a)
  if (kind === "job") Object.assign(entry, { location: a.where ?? "", deadline: a.deadline ?? "" })
  if (kind === "free-opportunity") entry.deadline = a.deadline ?? ""
  if (kind === "free-event" || kind === "paid-event") {
    Object.assign(entry, { date: a.date ?? "", location: a.where ?? "" })
  }
  if (kind === "resource") {
    Object.assign(entry, { resourceType: a.rtype ?? "", price: a.price ? naira(Number(a.price)) : "" })
  }
  return Object.fromEntries(Object.entries(entry).filter(([, value]) => value))
}

function payloadFrom(a: Answers, earlier: Record<string, string>[]): SubmissionPayload {
  const kind = kindOf(a)
  const custom = a.size === "custom"
  return {
    kind,
    entries: a.goal === "post" ? [...earlier, entryFrom(a)] : [entryFrom(a)],
    duration: a.length === 30 ? "extended" : "standard",
    bundleId: kind === "promotion" && a.size && !custom ? a.size : null,
    promotions:
      kind === "promotion" && custom
        ? Object.entries(a.pieces ?? {})
            .filter(([, on]) => on)
            .map(([id]) => ({ id, quantity: 1 }))
        : [],
    revenueShare: kind === "resource" ? (a.split ?? null) : null,
    contact: {
      name: a.name?.trim() ?? "",
      email: a.email?.trim() ?? "",
      phone: a.phone?.trim() ?? "",
      organisation: a.org?.trim() ?? "",
    },
  }
}

/** The reverse, for picking a saved order back up — "Change my details". */
function answersFrom(payload: SubmissionPayload): { answers: Answers; earlier: Record<string, string>[] } {
  const last = payload.entries[payload.entries.length - 1] ?? {}
  const answers: Answers = {
    title: last.title,
    link: last.link ?? "",
    about: last.description,
    date: last.date,
    deadline: last.deadline ?? "",
    where: last.location,
    rtype: last.resourceType,
    price: last.price?.replace(/\D/g, "") || undefined,
    name: payload.contact.name,
    org: payload.contact.organisation,
    email: payload.contact.email,
    phone: payload.contact.phone,
  }
  switch (payload.kind) {
    case "job":
      Object.assign(answers, { goal: "post", kind: "job" })
      break
    case "free-opportunity":
      Object.assign(answers, { goal: "post", kind: "opp" })
      break
    case "free-event":
      Object.assign(answers, { goal: "post", kind: "event", free: true })
      break
    case "paid-event":
      Object.assign(answers, { goal: "post", kind: "event", free: false })
      break
    case "resource":
      Object.assign(answers, { goal: "sell", split: payload.revenueShare === 30 ? 30 : 20 })
      break
    case "promotion":
      answers.goal = "promote"
      answers.size = payload.bundleId ?? "custom"
      answers.pieces = Object.fromEntries(payload.promotions.map((p) => [p.id, true]))
      break
  }
  if (isPaidPost(answers)) answers.length = payload.duration === "extended" ? 30 : 7
  return { answers, earlier: answers.goal === "post" ? payload.entries.slice(0, -1) : [] }
}

const digits = (value?: string) => (value ?? "").replace(/\D/g, "")
const today = () => new Date().toISOString().slice(0, 10)
const prettyDate = (value?: string) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : ""

// ---------------------------------------------------------------------------
// Pieces of a screen
// ---------------------------------------------------------------------------

function Tile({
  icon: Icon,
  label,
  sub,
  price,
  list,
  selected,
  lime,
  onClick,
}: {
  icon?: IconType
  label: string
  sub?: string
  price?: string
  list?: string[]
  selected?: boolean
  lime?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={Boolean(selected)}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-[22px] border-2 bg-card p-4 text-left transition-colors",
        selected ? "border-up-orange bg-up-orange-tint" : "border-border hover:border-up-border-hover",
      )}
    >
      {Icon && (
        <span
          aria-hidden
          className={cn(
            "grid h-14 w-14 shrink-0 place-items-center rounded-up-lg text-[26px]",
            lime ? "bg-up-lime-tint" : "bg-up-fill",
          )}
        >
          <Icon />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold leading-snug">{label}</span>
        {sub && <span className="mt-0.5 block text-sm text-muted-foreground">{sub}</span>}
        {list && (
          <ul className="mt-2 space-y-0.5 text-[13px] text-muted-foreground">
            {list.map((line) => (
              <li key={line} className="flex gap-1.5">
                <RiCheckLine className="mt-0.5 h-3.5 w-3.5 shrink-0 text-up-orange-ink" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        )}
      </span>
      {price ? (
        <span className="shrink-0 self-start whitespace-nowrap pt-1 font-bold text-up-orange-ink">{price}</span>
      ) : (
        <RiArrowRightSLine className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </button>
  )
}

function Chip({ label, selected, onClick }: { label: string; selected?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border-2 bg-card px-4 py-2.5 text-base font-semibold transition-colors",
        selected ? "border-up-orange bg-up-orange-tint" : "border-border hover:border-up-border-hover",
      )}
    >
      {label}
    </button>
  )
}

const INPUT =
  "w-full rounded-up-lg border-2 bg-card px-4 text-lg font-medium outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-up-orange focus:ring-4 focus:ring-primary/15"

function Problem({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-2 flex items-start gap-1.5 font-semibold text-destructive">
      <RiErrorWarningLine className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      {children}
    </p>
  )
}

function BigButton({ children, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button size="lg" className="h-14 w-full rounded-up-lg text-lg font-bold" {...props}>
      {children}
    </Button>
  )
}

function SkipLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 w-full py-2 text-base font-semibold underline underline-offset-4"
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// The flow
// ---------------------------------------------------------------------------

export default function QuestionFlow({
  initial,
  contact,
  busy,
  error,
  onSubmit,
  onPartner,
}: {
  /** A saved order to pick back up — opens on the check page with its answers. */
  initial?: SubmissionPayload | null
  /** Remembered from last time, so nobody types their details twice. */
  contact: Contact
  busy: boolean
  error: string | null
  onSubmit: (payload: SubmissionPayload) => void
  onPartner?: () => void
}) {
  const resumed = useMemo(() => (initial ? answersFrom(initial) : null), [initial])

  const [a, setA] = useState<Answers>(
    () =>
      resumed?.answers ?? {
        name: contact.name || undefined,
        org: contact.organisation || undefined,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
      },
  )
  const [earlier, setEarlier] = useState<Record<string, string>[]>(resumed?.earlier ?? [])
  const [stack, setStack] = useState<StepId[]>(() => (resumed ? path(resumed.answers) : ["goal"]))
  const [returnToCheck, setReturnToCheck] = useState(false)
  const [problems, setProblems] = useState<Record<string, string>>({})
  const [together, setTogether] = useState(false)
  const top = useRef<HTMLDivElement>(null)

  const step = stack[stack.length - 1]
  const steps = path(a)
  const index = Math.max(0, steps.indexOf(step))
  const t = thing(a)

  // Each new question starts at the top — but not on first load, where the
  // page is already there.
  const moved = useRef(false)
  useEffect(() => {
    if (!moved.current) {
      moved.current = true
      return
    }
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" })
  }, [step, together])

  const set = (patch: Answers) => {
    setA((current) => ({ ...current, ...patch }))
    setProblems({})
  }

  /** On to the next question — or, mid-change, to whatever the change now needs. */
  const advance = (next: Answers) => {
    setProblems({})
    const order = path(next)
    if (returnToCheck) {
      const missing = order.find((id) => unanswered(id, next))
      if (!missing) setReturnToCheck(false)
      setStack((current) => [...current, missing ?? "check"])
      return
    }
    const following = order[order.indexOf(step) + 1]
    if (following) setStack((current) => [...current, following])
  }

  /** A tap answer: record it and move on in one go. */
  const pick = (patch: Answers) => {
    const next = { ...a, ...patch }
    setA(next)
    advance(next)
  }

  const back = () => {
    setProblems({})
    // "Let's make it together" sits on top of the split question, not in the stack.
    if (together) return setTogether(false)
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current))
  }

  const change = (id: StepId) => {
    setReturnToCheck(true)
    setProblems({})
    setStack((current) => [...current, id])
  }

  /** Checks the typed answer on this screen; moves on when it is fine. */
  const submitTyped = () => {
    const found: Record<string, string> = {}
    const blank = (value?: string) => !value?.trim()
    let next = a

    switch (step) {
      case "title":
        if ((a.title?.trim().length ?? 0) < 2) found.title = FLOW.title.error
        break
      case "link": {
        const fixed = normaliseLink(a.link ?? "")
        if (!fixed && a.goal === "post") found.link = FLOW.link.error
        else if (fixed && !/\w\.\w/.test(fixed)) found.link = FLOW.link.bad
        next = { ...a, link: fixed }
        break
      }
      case "date":
        if (blank(a.date)) found.date = FLOW.date.error
        break
      case "deadline":
        next = { ...a, deadline: a.deadline ?? "" }
        break
      case "where":
        if (blank(a.where)) found.where = FLOW.where.error
        break
      case "price":
        if (!digits(a.price)) found.price = FLOW.price.error
        next = { ...a, price: digits(a.price) }
        break
      case "about":
        if ((a.about?.trim().length ?? 0) < 10) found.about = FLOW.about.error
        break
      case "pieces":
        if (!Object.values(a.pieces ?? {}).some(Boolean)) found.pieces = FLOW.pieces.error
        break
      case "name":
        if (blank(a.name)) found.name = FLOW.name.error
        break
      case "reach":
        if (blank(a.email)) found.email = FLOW.reach.emailEmpty
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email!.trim())) found.email = FLOW.reach.emailBad
        if (digits(a.phone).length < 7) found.phone = FLOW.reach.phoneBad
        break
    }

    if (Object.keys(found).length > 0) {
      setProblems(found)
      return
    }
    setA(next)
    advance(next)
  }

  /** Files this listing and loops back for the next — same person, same kind. */
  const addAnother = () => {
    setEarlier((current) => [...current, entryFrom(a)])
    const next: Answers = {
      ...a,
      title: undefined,
      link: undefined,
      date: undefined,
      deadline: undefined,
      where: undefined,
      about: undefined,
    }
    setA(next)
    setReturnToCheck(true)
    setStack((current) => [...current, "title"])
  }

  const payload = payloadFrom(a, earlier)
  const order = buildOrder(payload)

  // --- Chrome around every screen -----------------------------------------
  const frame = (title: string, hint: string, body: ReactNode, footer?: ReactNode) => (
    <div ref={top} className="mx-auto w-full max-w-xl scroll-mt-24">
      <div className="flex items-center gap-3">
        {stack.length > 1 || together ? (
          <button
            type="button"
            onClick={back}
            aria-label={FLOW.back}
            className="grid h-11 w-11 place-items-center rounded-full bg-up-fill text-xl"
          >
            <RiArrowLeftLine aria-hidden />
          </button>
        ) : (
          <span className="h-11 w-11" />
        )}
        <span className="flex-1 text-sm font-semibold text-muted-foreground">
          {together ? "" : a.goal ? FLOW.step(index + 1, steps.length) : FLOW.start}
        </span>
        <a
          href={whatsappHref("Hi UP, I need help on the Work with us page.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-up-fill px-3.5 py-2.5 text-sm font-semibold"
        >
          <RiWhatsappLine className="h-4 w-4" aria-hidden />
          {FLOW.askPerson}
        </a>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-up-fill" aria-hidden>
        <div
          className="h-full rounded-full bg-up-orange transition-[width] duration-300"
          style={{ width: `${a.goal ? Math.round((index / steps.length) * 100) : 0}%` }}
        />
      </div>

      <div key={step} className="mt-7 animate-in fade-in slide-in-from-right-2 duration-200">
        <h1 id="wwu-q" className="font-display text-[26px] font-bold leading-tight sm:text-3xl">
          {title}
        </h1>
        {hint && <p className="mb-6 mt-2 text-[17px] text-muted-foreground">{hint}</p>}
        {body}
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  )

  const typed = (body: ReactNode, extra?: ReactNode) => (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        submitTyped()
      }}
    >
      {body}
      <div className="mt-6">
        <BigButton type="submit">{returnToCheck ? FLOW.saveAndBack : FLOW.next}</BigButton>
      </div>
      {extra}
    </form>
  )

  const textBox = (
    key: "title" | "link" | "where" | "price" | "name",
    placeholder: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <>
      <input
        id={`wwu-${key}`}
        aria-labelledby="wwu-q"
        className={cn(INPUT, "h-14", problems[key] ? "border-destructive" : "border-input")}
        placeholder={placeholder}
        value={a[key] ?? ""}
        onChange={(event) => set({ [key]: event.target.value })}
        autoFocus
        autoComplete="off"
        {...props}
      />
      {problems[key] && <Problem>{problems[key]}</Problem>}
    </>
  )

  // --- "Let's make it together" -------------------------------------------
  if (together) {
    return frame(
      FLOW.together.title,
      FLOW.together.body,
      <Button asChild size="lg" className="h-14 w-full rounded-up-lg text-lg font-bold">
        <a href={whatsappHref(FLOW.together.message)} target="_blank" rel="noopener noreferrer">
          <RiWhatsappLine className="mr-2 h-5 w-5" aria-hidden />
          {FLOW.together.cta}
        </a>
      </Button>,
    )
  }

  // --- The screens ----------------------------------------------------------
  switch (step) {
    case "goal":
      return frame(
        FLOW.goal.title,
        FLOW.goal.hint,
        <div role="radiogroup" aria-labelledby="wwu-q" className="grid gap-3">
          <Tile icon={RiMegaphoneLine} {...FLOW.goal.post} selected={a.goal === "post"} onClick={() => pick({ goal: "post" })} />
          <Tile icon={RiRocket2Line} {...FLOW.goal.promote} selected={a.goal === "promote"} onClick={() => pick({ goal: "promote" })} />
          <Tile icon={RiBookOpenLine} {...FLOW.goal.sell} selected={a.goal === "sell"} onClick={() => pick({ goal: "sell" })} />
          {PARTNER_PROGRAMME_ENABLED && onPartner && (
            <SkipLink onClick={onPartner}>{FLOW.goal.partner}</SkipLink>
          )}
        </div>,
      )

    case "kind":
      return frame(
        FLOW.kind.title,
        FLOW.kind.hint,
        <div role="radiogroup" aria-labelledby="wwu-q" className="grid gap-3">
          <Tile
            icon={RiBriefcase4Line}
            {...FLOW.kind.job}
            price={`from ${naira(LISTING_BULK.price)}`}
            selected={a.kind === "job"}
            onClick={() => pick({ kind: "job" })}
          />
          <Tile icon={RiTicket2Line} lime {...FLOW.kind.event} selected={a.kind === "event"} onClick={() => pick({ kind: "event" })} />
          <Tile
            icon={RiGraduationCapLine}
            {...FLOW.kind.opp}
            price={FLOW.check.free}
            selected={a.kind === "opp"}
            onClick={() => pick({ kind: "opp" })}
          />
        </div>,
      )

    case "free":
      return frame(
        FLOW.free.title,
        FLOW.free.hint,
        <div role="radiogroup" aria-labelledby="wwu-q" className="grid gap-3">
          <Tile icon={RiEmotionHappyLine} label={FLOW.free.no} price={FLOW.check.free} selected={a.free === true} onClick={() => pick({ free: true })} />
          <Tile
            icon={RiTicket2Line}
            label={FLOW.free.yes}
            price={`from ${naira(LISTING_TIERS.standard.price)}`}
            selected={a.free === false}
            onClick={() => pick({ free: false })}
          />
        </div>,
      )

    case "size": {
      const icons = [RiSeedlingLine, RiPlantLine, RiLeafLine]
      return frame(
        FLOW.size.title,
        FLOW.size.hint,
        <div role="radiogroup" aria-labelledby="wwu-q" className="grid gap-3">
          {BUNDLES.map((bundle, i) => (
            <Tile
              key={bundle.id}
              icon={icons[i]}
              label={`${FLOW.size.names[bundle.id] ?? ""} · ${bundle.label}`}
              sub={bundle.blurb}
              list={bundle.contents}
              price={naira(bundle.price)}
              selected={a.size === bundle.id}
              onClick={() => pick({ size: bundle.id, pieces: {} })}
            />
          ))}
          <SkipLink onClick={() => pick({ size: "custom" })}>{FLOW.size.custom}</SkipLink>
        </div>,
      )
    }

    case "pieces": {
      const chosen = a.pieces ?? {}
      const sum = PROMOTION_ITEMS.reduce((total, item) => total + (chosen[item.id] ? item.price : 0), 0)
      return frame(
        FLOW.pieces.title,
        FLOW.pieces.hint,
        <>
          <div className="grid gap-2.5">
            {PROMOTION_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="checkbox"
                aria-checked={Boolean(chosen[item.id])}
                onClick={() => set({ pieces: { ...chosen, [item.id]: !chosen[item.id] } })}
                className={cn(
                  "flex w-full items-center gap-3 rounded-up-xl border-2 bg-card p-4 text-left transition-colors",
                  chosen[item.id] ? "border-up-orange bg-up-orange-tint" : "border-border hover:border-up-border-hover",
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-md border-2",
                    chosen[item.id] ? "border-up-orange bg-up-orange text-up-navy" : "border-up-sep",
                  )}
                  aria-hidden
                >
                  {chosen[item.id] && <RiCheckLine />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{item.label}</span>
                  <span className="block text-sm text-muted-foreground">{item.blurb}</span>
                </span>
                <span className="shrink-0 font-bold text-up-orange-ink">{naira(item.price)}</span>
              </button>
            ))}
          </div>
          {problems.pieces && <Problem>{problems.pieces}</Problem>}
        </>,
        <BigButton onClick={submitTyped}>
          {returnToCheck ? FLOW.saveAndBack : FLOW.next}
          {sum > 0 && ` · ${naira(sum)}`}
        </BigButton>,
      )
    }

    case "split":
      return frame(
        FLOW.split.title,
        FLOW.split.hint,
        <div role="radiogroup" aria-labelledby="wwu-q" className="grid gap-3">
          <Tile icon={RiUserSmileLine} {...FLOW.split.me} selected={a.split === 20} onClick={() => pick({ split: 20 })} />
          <Tile icon={RiMegaphoneLine} {...FLOW.split.up} selected={a.split === 30} onClick={() => pick({ split: 30 })} />
          <Tile icon={RiTeamLine} {...FLOW.split.together} onClick={() => setTogether(true)} />
        </div>,
      )

    case "title":
      return frame(
        FLOW.title.question[t],
        FLOW.title.hint,
        typed(textBox("title", FLOW.title.placeholder[t], { maxLength: 200 })),
      )

    case "link": {
      const question =
        a.goal !== "post"
          ? FLOW.link.question.other
          : a.kind === "event"
            ? a.free === false
              ? FLOW.link.question.paidEvent
              : FLOW.link.question.freeEvent
            : FLOW.link.question[a.kind ?? "job"]
      return frame(
        question,
        FLOW.link.hint,
        typed(
          textBox("link", FLOW.link.placeholder, {
            inputMode: "url",
            autoCapitalize: "none",
            autoCorrect: "off",
            spellCheck: false,
            onBlur: () => set({ link: normaliseLink(a.link ?? "") }),
          }),
          a.goal !== "post" && (
            <SkipLink onClick={() => pick({ link: "" })}>{FLOW.link.skip}</SkipLink>
          ),
        ),
      )
    }

    case "date":
      return frame(
        FLOW.date.title,
        FLOW.date.hint,
        typed(
          <>
            <input
              type="date"
              aria-labelledby="wwu-q"
              min={today()}
              className={cn(INPUT, "h-14", problems.date ? "border-destructive" : "border-input")}
              value={a.date ?? ""}
              onChange={(event) => set({ date: event.target.value })}
            />
            {problems.date && <Problem>{problems.date}</Problem>}
          </>,
        ),
      )

    case "deadline":
      return frame(
        FLOW.deadline.title,
        FLOW.deadline.hint,
        typed(
          <input
            type="date"
            aria-labelledby="wwu-q"
            min={today()}
            className={cn(INPUT, "h-14 border-input")}
            value={a.deadline ?? ""}
            onChange={(event) => set({ deadline: event.target.value })}
          />,
          <SkipLink onClick={() => pick({ deadline: "" })}>{FLOW.deadline.skip}</SkipLink>,
        ),
      )

    case "where": {
      const chips = a.kind === "job" ? FLOW.where.jobChips : FLOW.where.eventChips
      return frame(
        a.kind === "job" ? FLOW.where.job : FLOW.where.event,
        FLOW.where.hint,
        typed(
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <Chip key={chip} label={chip} selected={a.where === chip} onClick={() => pick({ where: chip })} />
              ))}
            </div>
            {textBox("where", FLOW.where.placeholder, {
              value: chips.includes(a.where ?? "") ? "" : (a.where ?? ""),
              autoFocus: false,
              maxLength: 200,
            })}
          </>,
        ),
      )
    }

    case "rtype":
      return frame(
        FLOW.rtype.title,
        FLOW.rtype.hint,
        <div className="flex flex-wrap gap-2">
          {FLOW.rtype.chips.map((chip) => (
            <Chip key={chip} label={chip} selected={a.rtype === chip} onClick={() => pick({ rtype: chip })} />
          ))}
        </div>,
      )

    case "price":
      return frame(
        FLOW.price.title,
        FLOW.price.hint,
        typed(
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-4 text-lg font-semibold text-muted-foreground">₦</span>
            {textBox("price", FLOW.price.placeholder, { inputMode: "numeric", className: cn(INPUT, "h-14 pl-10", problems.price ? "border-destructive" : "border-input") })}
          </div>,
        ),
      )

    case "about":
      return frame(
        a.goal === "promote" ? FLOW.about.promote : FLOW.about.question(NOUN[t]),
        FLOW.about.hint,
        typed(
          <>
            <textarea
              aria-labelledby="wwu-q"
              rows={5}
              autoFocus
              maxLength={5000}
              className={cn(INPUT, "py-3.5 leading-relaxed", problems.about ? "border-destructive" : "border-input")}
              placeholder={FLOW.about.placeholder}
              value={a.about ?? ""}
              onChange={(event) => set({ about: event.target.value })}
            />
            {problems.about && <Problem>{problems.about}</Problem>}
            <p className="mt-3 rounded-up-md bg-up-fill px-3.5 py-2.5 text-sm text-muted-foreground">
              <span className="font-bold text-foreground">Example: </span>
              {FLOW.about.example[t]}
            </p>
          </>,
        ),
      )

    case "length":
      return frame(
        FLOW.length.title,
        FLOW.length.hint,
        <div role="radiogroup" aria-labelledby="wwu-q" className="grid gap-3">
          <Tile
            icon={RiCalendarLine}
            {...FLOW.length.week}
            price={naira(LISTING_TIERS.standard.price)}
            selected={a.length === 7}
            onClick={() => pick({ length: 7 })}
          />
          <Tile
            icon={RiCalendar2Line}
            {...FLOW.length.month}
            price={naira(LISTING_TIERS.extended.price)}
            selected={a.length === 30}
            onClick={() => pick({ length: 30 })}
          />
        </div>,
      )

    case "name":
      return frame(
        FLOW.name.title,
        FLOW.name.hint,
        typed(
          <>
            <label htmlFor="wwu-name" className="mb-2 block font-bold">
              {FLOW.name.name}
            </label>
            {textBox("name", FLOW.name.namePlaceholder, { autoComplete: "name", "aria-labelledby": undefined })}
            <label htmlFor="wwu-org" className="mb-2 mt-5 block font-bold">
              {FLOW.name.org} <span className="font-medium text-muted-foreground">{FLOW.name.orgHint}</span>
            </label>
            <input
              id="wwu-org"
              className={cn(INPUT, "h-14 border-input")}
              autoComplete="organization"
              value={a.org ?? ""}
              onChange={(event) => set({ org: event.target.value })}
            />
          </>,
        ),
      )

    case "reach":
      return frame(
        FLOW.reach.title,
        FLOW.reach.hint,
        typed(
          <>
            <label htmlFor="wwu-email" className="mb-2 block font-bold">
              {FLOW.reach.email}
            </label>
            <input
              id="wwu-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              placeholder="you@example.com"
              className={cn(INPUT, "h-14", problems.email ? "border-destructive" : "border-input")}
              value={a.email ?? ""}
              onChange={(event) => set({ email: event.target.value })}
            />
            {problems.email && <Problem>{problems.email}</Problem>}
            <label htmlFor="wwu-phone" className="mb-2 mt-5 block font-bold">
              {FLOW.reach.phone}
            </label>
            <input
              id="wwu-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0803 123 4567"
              className={cn(INPUT, "h-14", problems.phone ? "border-destructive" : "border-input")}
              value={a.phone ?? ""}
              onChange={(event) => set({ phone: event.target.value })}
            />
            {problems.phone && <Problem>{problems.phone}</Problem>}
          </>,
        ),
      )

    case "check":
      return frame(FLOW.check.title, FLOW.check.hint, renderCheck())
  }

  // --- The check page -------------------------------------------------------
  function renderCheck() {
    const bundle = BUNDLES.find((entry) => entry.id === a.size)
    const rows: [StepId, string, string][] = []
    const add = (id: StepId, label: string, value?: string) => {
      if (steps.includes(id)) rows.push([id, label, value ?? ""])
    }
    add("kind", "Posting", { job: "A job", event: "An event", opp: "An opportunity" }[a.kind ?? "job"])
    add("free", "Tickets", a.free ? "Free to attend" : "People pay")
    add("size", "Push", a.size === "custom" ? "My own pieces" : bundle && `${FLOW.size.names[bundle.id]} · ${bundle.label}`)
    add(
      "pieces",
      "Pieces",
      PROMOTION_ITEMS.filter((item) => a.pieces?.[item.id])
        .map((item) => item.label)
        .join(", "),
    )
    add("split", "UP's share", `${a.split}% of each sale`)
    add("title", "Name", a.title)
    add("link", "Link", a.link || "No link")
    add("date", "Date", prettyDate(a.date))
    add("deadline", "Last day to apply", a.deadline ? prettyDate(a.deadline) : "No deadline")
    add("where", "Where", a.where)
    add("rtype", "Kind", a.rtype)
    add("price", "Price", a.price ? naira(Number(a.price)) : "")
    add("about", "About", a.about && a.about.length > 110 ? `${a.about.slice(0, 110)}…` : a.about)
    add("length", "Stays up", a.length === 30 ? "1 month" : "1 week")
    add("name", "You", [a.name, a.org].filter(Boolean).join(" · "))
    add("reach", "Contact", [a.email, a.phone].filter(Boolean).join("\n"))

    const paid = order.total > 0
    const count = payload.entries.length
    const packNudge =
      isPaidPost(a) && a.length !== 30 && count < LISTING_BULK.from
        ? FLOW.check.pack(LISTING_BULK.from, naira(LISTING_BULK.price))
        : null

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(payload)
        }}
      >
        {earlier.length > 0 && (
          <div className="mb-4 rounded-up-xl border border-border bg-card p-4">
            <p className="text-sm font-bold text-muted-foreground">{FLOW.check.also}</p>
            <ul className="mt-2 divide-y divide-border">
              {earlier.map((entry, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate font-semibold">{entry.title}</span>
                  <button
                    type="button"
                    className="shrink-0 text-sm font-bold text-destructive"
                    onClick={() => setEarlier((current) => current.filter((_, j) => j !== i))}
                  >
                    {FLOW.check.remove}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="divide-y divide-border overflow-hidden rounded-up-xl border border-border bg-card">
          {rows.map(([id, label, value]) => (
            <div key={id} className="flex items-start gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
                <p className="whitespace-pre-line break-words font-semibold">{value}</p>
              </div>
              <button
                type="button"
                onClick={() => change(id)}
                className="shrink-0 py-1 text-[15px] font-bold text-up-orange-ink"
              >
                {FLOW.check.change}
              </button>
            </div>
          ))}
        </div>

        {paid && order.lines.length > 0 && (
          <ul className="mt-4 space-y-1.5 px-1 text-sm">
            {order.lines.map((line) => (
              <li key={line.label} className="flex justify-between gap-4">
                <span>
                  {line.label}
                  {line.quantity > 1 && (
                    <span className="text-muted-foreground">
                      {" "}
                      × {line.quantity} at {naira(line.unitPrice)}
                    </span>
                  )}
                </span>
                <span className="font-semibold tabular-nums">{naira(line.total)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between rounded-up-xl bg-up-navy px-4 py-4 text-up-on-navy">
          <span>{paid ? FLOW.check.toPay : FLOW.check.cost}</span>
          <span className="font-display text-2xl font-bold tabular-nums">
            {paid ? naira(order.total) : FLOW.check.free}
          </span>
        </div>
        <p className="mt-3 px-1 text-sm text-muted-foreground">{paid ? PAY.terms : PAY.freeTerms}</p>

        {a.goal === "post" && count < MAX_LISTINGS && (
          <div className="mt-2 text-center">
            <SkipLink onClick={addAnother}>+ {FLOW.check.addAnother(NOUN[t])}</SkipLink>
            {packNudge && <p className="text-sm text-muted-foreground">{packNudge}</p>}
          </div>
        )}

        {error && (
          <div role="alert" className="mt-4 rounded-up-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="font-semibold text-destructive">{error}</p>
            <a
              href={whatsappHref(`Hi UP, I'm stuck on the Work with us form: "${error}"`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 font-semibold text-up-orange-ink hover:underline"
            >
              <RiWhatsappLine className="h-4 w-4" aria-hidden />
              Get help on WhatsApp
            </a>
          </div>
        )}

        <div className="mt-6">
          <BigButton type="submit" disabled={busy}>
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
          </BigButton>
          {paid && <p className="mt-2 text-center text-sm text-muted-foreground">{PAY.paystackNote}</p>}
        </div>
      </form>
    )
  }
}
