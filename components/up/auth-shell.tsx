import type { ReactNode } from "react"
import type { IconType } from "react-icons"
import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * The frame every account page sits in (UP Design v1): a full-height navy
 * panel with the card-stack motif on the left, the form on the right. On
 * phones the panel shrinks to a navy header with a rounded bottom edge.
 *
 * Headlines mark the word that should be orange with <em>, e.g.
 * `<>Welcome back to <em>UP</em></>` — solid orange, never gradient text.
 */
export interface AuthPoint {
  icon: IconType
  title: string
  text: string
}

function StackArt({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute h-[260px] w-[360px]", className)}>
      <i className="absolute left-10 top-5 h-[150px] w-[220px] -rotate-[8deg] rounded-[22px] bg-[#1C2554]" />
      <i className="absolute left-[120px] top-[70px] h-[140px] w-[200px] rotate-[5deg] rounded-[22px] bg-up-orange" />
      <i className="absolute left-[70px] top-[150px] h-[86px] w-[120px] -rotate-[4deg] rounded-[22px] bg-up-lime" />
    </div>
  )
}

function Mark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="UP home"
      className={cn(
        "relative grid h-11 w-11 place-items-center rounded-up-md bg-up-orange font-display text-xl font-extrabold text-up-navy",
        className,
      )}
    >
      UP
    </Link>
  )
}

export function AuthShell({
  badge,
  headline,
  mobileHeadline,
  subtitle,
  points = [],
  children,
}: {
  /** Small pill above the headline, with a lime dot. */
  badge?: string
  headline: ReactNode
  /** Shorter headline for the phone header; defaults to `headline`. */
  mobileHeadline?: ReactNode
  subtitle?: ReactNode
  points?: AuthPoint[]
  children: ReactNode
}) {
  return (
    <div className="-mt-4 min-h-screen bg-page lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Desktop navy panel */}
      <aside className="relative hidden overflow-hidden bg-up-navy px-14 py-12 text-up-on-navy lg:flex lg:flex-col dark:shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)]">
        <StackArt className="-right-[60px] top-10" />
        <Mark />
        <div className="relative mt-auto pt-16">
          {badge ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-up-border-on-navy px-3 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-up-on-navy-muted">
              <i className="h-2 w-2 rounded-full bg-up-lime" aria-hidden />
              {badge}
            </span>
          ) : null}
          <h1 className="mt-[18px] max-w-[560px] font-display text-[44px] font-bold leading-[1.1] [&_em]:not-italic [&_em]:text-up-orange">
            {headline}
          </h1>
          {subtitle ? (
            <p className="mt-4 max-w-[460px] text-[17px] leading-relaxed text-up-orange">{subtitle}</p>
          ) : null}
        </div>
        {points.length > 0 ? (
          <div className="relative mb-6 mt-8 grid gap-3">
            {points.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex max-w-[460px] items-start gap-3.5 rounded-up-lg bg-up-navy-subtle px-4 py-3.5 shadow-[inset_0_0_0_1px_var(--up-border-on-navy)]"
              >
                <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-up-sm bg-[rgba(255,106,0,0.18)] text-up-orange">
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <div>
                  <b className="block text-sm">{title}</b>
                  <span className="text-[13px] text-up-on-navy-muted">{text}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </aside>

      {/* Phone header */}
      <div className="relative overflow-hidden rounded-b-[28px] bg-up-navy px-5 pb-7 pt-[max(1.25rem,env(safe-area-inset-top))] text-up-on-navy lg:hidden">
        <StackArt className="-right-10 -top-3.5 origin-top-right scale-[0.45]" />
        <Mark className="h-[38px] w-[38px] text-[15px]" />
        <p className="relative mt-9 max-w-[64%] font-display text-[26px] font-bold leading-[1.15] [&_em]:not-italic [&_em]:text-up-orange">
          {mobileHeadline ?? headline}
        </p>
      </div>

      <main className="flex items-center justify-center px-5 py-8 lg:p-10">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  )
}

/** Card title + subtitle at the top of an auth form. */
export function AuthHeading({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-[22px] font-bold leading-tight text-foreground lg:text-[28px]">{title}</h2>
      {children ? <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{children}</p> : null}
    </div>
  )
}

/** Error line shown above an auth form. */
export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="mb-4 rounded-up-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
      {children}
    </div>
  )
}
