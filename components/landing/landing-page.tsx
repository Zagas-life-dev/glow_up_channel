"use client"

/**
 * The signed-out front door.
 *
 * Every string below is lifted from the UP Master Copy Library v1.0: hero and
 * section copy from §2 (Website Copy), the direct-answer and FAQ blocks from §7
 * (GEO/AEO), and the palette, typography and voice rules from §1 (Brand
 * Guidelines). Copy is adapted rather than quoted verbatim on one point of house
 * style, which is that this page carries no em dashes. Sentences are recast with
 * commas, colons, or a full stop instead.
 *
 * Per §0, the stats and partner list live in one reference block at the top:
 * change them there and every section inherits the new value.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import {
  RiFocus3Line,
  RiBriefcaseLine,
  RiCalendarLine,
  RiBookLine,
  RiPlayList2Fill,
  RiArrowRightLine,
} from 'react-icons/ri'
import { usePage } from '@/contexts/page-context'
import { cn } from '@/lib/utils'
// Shared with the server-rendered FAQPage JSON-LD in `app/page.tsx`.
import { FAQS } from '@/lib/seo/faq'

/* ─────────────────────────── §0 Brand foundation ─────────────────────────── */

/** Verified stats. Update here first; every section reads from this block. */
const STATS = [
  { figure: '8,200+', label: 'Platform Users' },
  { figure: '7,500+', label: 'Opportunities Shared' },
  { figure: '700+', label: 'Young Africans Upskilled' },
  { figure: '5,800+', label: 'Community Members' },
] as const

/**
 * The organizations UP works with, in one place. Each logo was taken from the
 * organization's own site rather than a logo aggregator, so the marks stay the
 * ones their owners actually publish:
 *   nileuniversity.edu.ng, wemabank.com, lagosstate.gov.ng, wtcabuja.com,
 *   zedcrest.com.
 * The tiles are white because four of the five marks are drawn for a light
 * background. Zedcrest publish a white-on-dark wordmark only, so the local copy
 * carries the same paths re-filled with `--ink` for the light tile.
 */
const PARTNERS = [
  {
    name: 'Nile University',
    logo: '/partners/nile-university.svg',
    href: 'https://nileuniversity.edu.ng',
  },
  {
    name: 'Wema Bank',
    logo: '/partners/wema-bank.svg',
    href: 'https://www.wemabank.com',
  },
  {
    name: 'Lagos State Ministry of Science and Technology',
    logo: '/partners/lagos-state.png',
    href: 'https://lagosstate.gov.ng',
  },
  {
    name: 'World Trade Center Abuja',
    logo: '/partners/world-trade-center.png',
    href: 'https://www.wtcabuja.com',
  },
  {
    name: 'Zedcrest',
    logo: '/partners/zedcrest.svg',
    href: 'https://zedcrest.com',
  },
] as const

/**
 * §1.1 colour system. These are fixed brand values, not theme tokens: a
 * marketing surface reads the same for every visitor, so this page does not
 * follow the app's light/dark switch. §1.3 rules out gradients and texture, so
 * every surface here is a flat fill.
 */
const BRAND_VARS = {
  '--ink': '#0B1222',
  '--orange': '#FE6700',
  '--paper': '#FDF5ED',
} as React.CSSProperties

/* ────────────────────────────── §2 Website copy ───────────────────────────── */

const PILLARS = [
  {
    name: 'Opportunities',
    icon: RiFocus3Line,
    header: "Claim What's Already Yours",
    description:
      'Scholarships, grants, and fellowships, sourced continuously and matched to your profile, so access reaches you before the deadline does.',
    cta: 'Get Access to Opportunities',
    href: '/opportunities',
  },
  {
    name: 'Jobs',
    icon: RiBriefcaseLine,
    header: 'Your Next Role Starts Here',
    description:
      'Real roles for real ambition, from your first internship to the move that changes everything. Built for young African talent that is ready now.',
    cta: 'Find Your Role',
    href: '/jobs',
  },
  {
    name: 'Events',
    icon: RiCalendarLine,
    header: 'Be In The Room',
    description:
      'The conferences, workshops, and gatherings where the next generation of African leaders actually shows up. Know before everyone else does.',
    cta: "See What's Next",
    href: '/events',
  },
  {
    name: 'Resources',
    icon: RiBookLine,
    header: 'Sharpen Before You Show Up',
    description:
      'Courses, tools, and guides built for people moving with intent. No filler, just what actually levels you up.',
    cta: 'Unlock Resources',
    href: '/resources',
  },
  {
    name: 'Playlists',
    icon: RiPlayList2Fill,
    header: 'Your Momentum, Organized',
    description:
      'Build your own path. Save what matters, track what comes next, and keep moving without losing your place.',
    cta: 'Build Your Playlist',
    href: '/playlists',
  },
] as const

const PARTNER_TRACKS = [
  {
    title: 'For Corporate Sponsors',
    body: 'Align your brand with real ambition. Through integrated resource hubs and sponsored placements, your organization becomes part of the toolkit young Africans use to actually get ahead, not an ad they scroll past.',
  },
  {
    title: 'For University Career Hubs',
    body: 'Give your students a continuously updated, high-intent opportunity engine at zero cost to your institution, and gain real visibility into what they are engaging with, backed by verified data most career offices have never had access to. Nile University already trusts UP with their students. Your institution can be next.',
  },
  {
    title: 'For Strategic & Distribution Partners',
    body: 'Stop buying scattered placements and start owning a relationship. As a strategic partner, you get integrated, continuous, verified access to the demographic every serious organization on the continent is trying to reach. It is the same access Wema Bank, World Trade Center Abuja, Zedcrest, and the Lagos State Ministry of Science and Technology have already claimed.',
  },
] as const

/* ───────────────────────────── §7 GEO / AEO bank ──────────────────────────── */

const WHAT_IS_UP =
  'UP is a platform that helps young Africans aged 18 to 35 and older discover and access scholarships, jobs, internships, grants, events, and free learning resources in one place. Operated by Outside Solutions Ltd., UP has shared over 7,500 opportunities and serves more than 8,200 users, matching each opportunity to the individual based on their skills, interests, and goals.'


/** §1.7 footer navigation labels, mapped to the routes that exist. */
const FOOTER_LINKS = [
  { label: 'For You', href: '/signup' },
  { label: 'Opportunities', href: '/opportunities' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'Events', href: '/events' },
  { label: 'Resources', href: '/resources' },
  { label: 'Playlists', href: '/playlists' },
  { label: 'Strategic Partnerships', href: '/work-with-us' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const

/*
 * Structured data for this page is emitted on the server, not here:
 *  - the Organization node lives in the root layout (`lib/seo/brand.ts`), so
 *    the whole site resolves to one entity rather than two competing ones;
 *  - the FAQPage is emitted by `app/page.tsx` from `lib/seo/faq.ts`, because
 *    this component sits behind a client-side auth branch and anything
 *    rendered from here never reaches a crawler.
 */

/* ──────────────────────────────── primitives ──────────────────────────────── */

function SectionHeading({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2
      className={cn(
        'font-up-display text-[28px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[36px] lg:text-[44px]',
        className,
      )}
    >
      {children}
    </h2>
  )
}

function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-up-display inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[var(--orange)] px-8 text-[16px] font-bold text-white transition-opacity hover:opacity-90"
    >
      {children}
    </Link>
  )
}

/* ───────────────────────────────── the page ───────────────────────────────── */

export default function LandingPage() {
  const { setHideNavbar, setHideFooter } = usePage()

  // A front door carries its own header and footer. The in-app sidebar and
  // bottom tab bar are for people who are already inside.
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  return (
    <div
      style={BRAND_VARS}
      className="font-up-body min-h-screen bg-[var(--paper)] text-[var(--ink)]"
    >

      {/* Header */}
      <header className="bg-[var(--ink)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <span className="font-up-display text-2xl font-bold tracking-[-0.03em] text-[var(--paper)]">
            UP
          </span>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="font-up-display rounded-full px-4 py-2 text-[15px] font-semibold text-[var(--paper)]/80 transition-colors hover:text-[var(--paper)]"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="font-up-display inline-flex h-11 items-center rounded-full bg-[var(--orange)] px-5 text-[15px] font-bold text-white transition-opacity hover:opacity-90"
            >
              Get Access
            </Link>
          </nav>
        </div>
      </header>

      {/* §1.1 Hero */}
      <section className="bg-[var(--ink)] text-[var(--paper)]">
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-10 lg:px-8 lg:pb-20 lg:pt-16">
          <h1 className="font-up-display max-w-4xl text-[44px] font-bold leading-[1.02] tracking-[-0.035em] sm:text-[68px] lg:text-[92px]">
            Get access. Get UP.
          </h1>
          <p className="mt-6 max-w-2xl text-[18px] leading-[1.5] text-[var(--paper)]/70 sm:text-[22px]">
            Real opportunities, resources and support for young Africans preparing to lead the future of global work.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PrimaryCta href="/signup">Get Access</PrimaryCta>
            <Link
              href="/work-with-us"
              className="font-up-display inline-flex h-14 items-center justify-center gap-2 rounded-full border border-[var(--paper)]/25 px-8 text-[16px] font-semibold text-[var(--paper)] transition-colors hover:border-[var(--paper)]/60"
            >
              Work With US
              <RiArrowRightLine className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Stat bar, directly beneath the hero */}
        <div className="border-t border-[var(--paper)]/10">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-5 py-9 lg:grid-cols-4 lg:px-8">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="font-up-display block text-[30px] font-bold leading-none tracking-[-0.02em] text-[var(--orange)] lg:text-[36px]">
                    {stat.figure}
                  </span>
                  <span className="mt-2 block text-[14px] text-[var(--paper)]/60">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* §1.2 Why UP Exists */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <SectionHeading>Why UP Exists</SectionHeading>
          <div className="mt-6 space-y-6 text-[17px] leading-[1.65] text-[var(--ink)]/80 lg:mt-0 lg:text-[19px]">
            <p>
              Talent is everywhere. Access isn&rsquo;t.
            </p>
            <p>
              Africa is home to one of the world's youngest and fastest-growing populations. As the global workforce evolves, African talent will play an increasingly important role in shaping the future of work.
            </p>
            <p>
              But potential alone isn't enough.
            </p>
            <p>
              Young Africans need access to opportunity, a map for where to go, and the support to get there.
            </p>
            <p className="font-medium text-[var(--ink)]">
              That's why UP exists. <br />

              
            </p>
                        <p className="font-medium text-[var(--ink)]">
              We bring together the opportunities, events, jobs, resources and guidance that help young Africans discover what's possible, navigate what's next, and prepare for the world they're stepping into.
            </p>
            <p className="font-medium text-[var(--ink)]">
              From scholarships and grants to internships and jobs. From conferences and webinars to courses, guides and practical resources.
            </p>
            <p className="font-medium text-[var(--ink)]">UP is building the access layer for the next generation of African talent.</p>
            <p>
              Because access changes what's possible.
A map gives you direction.
Support helps you keep moving
            </p>
             <p className="font-medium text-[var(--ink)]">
              And when you have all three, the only way is UP.
             </p>
             <p className="font-medium text-[var(--ink)]">
              Get access. Get UP.
             </p>
          </div>
        </div>
      </section>

      {/* §1.3 Five core feature pillars */}
      <section className="border-y border-[var(--ink)]/10 bg-[var(--paper)]">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon
              return (
                <Link
                  key={pillar.name}
                  href={pillar.href}
                  className="group flex flex-col rounded-3xl border border-[var(--ink)]/12 bg-white p-6 transition-colors hover:border-[var(--ink)]/30"
                >
                  <Icon className="h-7 w-7 text-[var(--orange)]" aria-hidden />
                  <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]/45">
                    {pillar.name}
                  </p>
                  <h3 className="font-up-display mt-2 text-[22px] font-bold leading-[1.2] tracking-[-0.01em]">
                    {pillar.header}
                  </h3>
                  <p className="mt-3 flex-1 text-[15px] leading-[1.6] text-[var(--ink)]/70">
                    {pillar.description}
                  </p>
                  <span className="font-up-display mt-6 inline-flex items-center gap-2 text-[15px] font-bold text-[var(--orange)]">
                    {pillar.cta}
                    <RiArrowRightLine
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* §1.5 Trusted by */}
      <section className="bg-[var(--ink)] text-[var(--paper)]">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
          <SectionHeading className="max-w-3xl">
            Trusted By Organizations Building Africa&rsquo;s Next Generation
          </SectionHeading>
          <p className="mt-5 max-w-2xl text-[17px] leading-[1.6] text-[var(--paper)]/70">
            From higher education to finance to trade to government, UP is already the access layer
            institutions turn to.
          </p>

          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PARTNERS.map((partner) => (
              <li key={partner.name}>
                <a
                  href={partner.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl bg-white px-4 py-6 transition-transform hover:-translate-y-0.5"
                >
                  <span className="flex h-14 w-full items-center justify-center">
                    <img
                      src={partner.logo}
                      alt={`${partner.name} logo`}
                      loading="lazy"
                      className="max-h-14 max-w-full object-contain"
                    />
                  </span>
                  <span className="font-up-display text-center text-[13px] font-semibold leading-snug text-[var(--ink)]/70 text-black">
                    {partner.name}
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-8 max-w-3xl text-[15px] leading-[1.6] text-[var(--paper)]/60">
            We&rsquo;ve partnered with leading universities, financial institutions, trade centers,
            and government bodies to put real opportunity directly in front of the young Africans
            actively pursuing it.
          </p>
        </div>
      </section>

      {/*
        §1.6 Social Proof & Testimonials is intentionally not rendered. The copy
        library specifies "insert real, consented submissions only" and there are
        no consented quotes in the document or the codebase. Inventing them
        would put fabricated praise in front of users. Drop real submissions in
        here and the section can go live between Trusted By and What Is UP.
      */}

      {/* §7 What is UP + FAQ */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
        <SectionHeading className="max-w-3xl">What is UP?</SectionHeading>
        <p className="mt-6 max-w-3xl text-[18px] leading-[1.65] text-[var(--ink)]/80 lg:text-[20px]">
          {WHAT_IS_UP}
        </p>

        <dl className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <dt className="font-up-display text-[17px] font-bold leading-snug">{faq.q}</dt>
              <dd className="mt-2 text-[15px] leading-[1.6] text-[var(--ink)]/70">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* §1.4 Strategic partner & sponsor */}
      <section className="border-t border-[var(--ink)]/10">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
          <SectionHeading className="max-w-3xl">
            The Bridge to Africa&rsquo;s Most Driven Generation
          </SectionHeading>

          <div className="mt-6 max-w-3xl space-y-5 text-[17px] leading-[1.65] text-[var(--ink)]/80">
            <p>
              UP isn&rsquo;t a listings board, and we&rsquo;re not JUST a distribution channel.
              We&rsquo;re the ecosystem where Africa&rsquo;s most ambitious 18-to-35+ talent shows
              up daily, with intent: over 8,200 users and a community of 5,800+, actively seeking
              the access that gets them to their next level. We&rsquo;ve already shared over 7,500
              opportunities and directly upskilled more than 700 young Africans in in-demand
              digital skills, and organizations like Nile University, Wema Bank, the Lagos State
              Ministry of Science and Technology, World Trade Center Abuja, and Zedcrest are
              already building with us.
            </p>
            <p>
              We don&rsquo;t just place your opportunity in front of an audience. We integrate it
              into the platform young Africans already trust to move their careers forward, with
              verified engagement data proving exactly who saw it, saved it, and acted on it. When
              you partner with UP, you&rsquo;re not buying a placement. You&rsquo;re becoming part
              of the access that gets someone to where they&rsquo;re going.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {PARTNER_TRACKS.map((track) => (
              <div
                key={track.title}
                className="rounded-3xl border border-[var(--ink)]/12 bg-white p-6"
              >
                <h3 className="font-up-display text-[18px] font-bold">{track.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.6] text-[var(--ink)]/70">{track.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <PrimaryCta href="/work-with-us">Become a Strategic Partner</PrimaryCta>
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="bg-[var(--orange)] text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
          <p className="font-up-display text-[36px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[52px] lg:text-[64px]">
            Get Access. Get UP.
          </p>
          <p className="mt-5 max-w-2xl text-[17px] leading-[1.6] text-white/85 lg:text-[19px]">
            Real opportunities, matched to you; with the resources, community and support to help you move forward.
          </p>
          <Link
            href="/signup"
            className="font-up-display mt-9 inline-flex h-14 items-center justify-center rounded-full bg-[var(--ink)] px-8 text-[16px] font-bold text-[var(--paper)] transition-opacity hover:opacity-90"
          >
            Get Access
          </Link>
               <Link
              href="/work-with-us"
              className="font-up-display inline-flex h-14 items-center justify-center gap-2 rounded-full border border-[var(--paper)]/25 px-8 text-[16px] font-semibold text-[var(--paper)] transition-colors hover:border-[var(--paper)]/60"
            >
              Work With US
              <RiArrowRightLine className="h-4 w-4" aria-hidden />
            </Link>
        </div>
      </section>

      {/* §1.7 Footer */}
      <footer className="bg-[var(--ink)] text-[var(--paper)]">
        <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8">
          <p className="font-up-display text-[28px] font-bold tracking-[-0.02em]">
            {/* Access opens UP. */}Get access. Get UP.
          </p>

          <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[15px] text-[var(--paper)]/70 transition-colors hover:text-[var(--paper)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-10 grid gap-6 border-t border-[var(--paper)]/10 pt-8 text-[14px] leading-[1.6] text-[var(--paper)]/55 sm:grid-cols-2">
            <p>
              We take your data seriously. Read how UP collects, uses, and protects your
              information in our{' '}
              <Link href="/privacy-policy" className="underline hover:text-[var(--paper)]">
                Privacy Policy
              </Link>
              .
            </p>
            <p>
              By using UP, you agree to our{' '}
              <Link href="/terms-of-service" className="underline hover:text-[var(--paper)]">
                Terms of Service
              </Link>
              , the ground rules that keep this platform safe, fair, and built for the community
              it serves.
            </p>
          </div>

          <p className="mt-8 text-[13px] text-[var(--paper)]/45">
            UP is a product of Outside Solutions Ltd. © 2026 Outside Solutions Ltd. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
