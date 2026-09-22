"use client"

/**
 * The signed-out front door.
 *
 * Two things meet in this file.
 *
 * The *design* is the official landing artboards in `docs/main-html` (desktop,
 * 1440) and `docs/mobile-html` (mobile, 390). They are the source of truth for
 * every visual value below: colours, type sizes, spacing, radii, shadows and the
 * section shapes. Where the two artboards disagree the difference is expressed
 * as a `lg:` variant, so one component carries both. The artboards specify 390
 * and 1440 only; the band between them is an interpolation, not a design, so
 * `lg` (1024px) drives the structural changes the artboards actually differ on
 * and `md`/`sm` fill the tablet gap for sections that simply stack.
 *
 * The *copy* is the UP Master Copy Library v1.0, carried over whole from the
 * previous landing page: the hero line, the manifesto (§1.2), the pillars and
 * their headers (§1.3), the partner roster and sponsor tracks (§1.4, §1.5), and
 * the direct-answer and FAQ blocks (§7). The artboards abbreviate this copy to
 * show the layout; they do not replace it. Where an artboard shows a placeholder
 * sentence and the library has the real one, the library wins. House style is
 * that this page carries no em dashes.
 *
 * Three departures from the artboards, all deliberate:
 *  - Playlists takes the ink feature slot the artboards give to Word of the
 *    Week, because it is the one pillar a card in the grid undersold. The grid
 *    is back to the designed four.
 *  - The partner roster and the artboards' single named partner are merged into
 *    one grid: every organization with its logo, sector and a short line.
 *  - On an ink background the *body* text reads `--accent`, not `--paper`.
 *    Titles and subtitles keep the regular paper colour, and so do navigation
 *    and footer links, so navigation still reads as navigation.
 *
 * Per §0 the stats, partners and pillars live in reference blocks at the top:
 * change them there and every section inherits the new value.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePage } from '@/contexts/page-context'
import { cn } from '@/lib/utils'
// Shared with the server-rendered FAQPage JSON-LD in `app/page.tsx`.
import { FAQS } from '@/lib/seo/faq'

/* ─────────────────────────── §0 Brand foundation ─────────────────────────── */

/**
 * The design's palette, lifted verbatim from the artboards.
 *
 * These are fixed brand values, not theme tokens: a marketing surface reads the
 * same for every visitor, so this page does not follow the app's light/dark
 * switch. Every surface is a flat fill; the design uses no gradients.
 *
 * Two notes for whoever changes these next:
 *  - `--ink` and `--accent` are the artboards' values (#0B1233 / #FF6A00), which
 *    sit a hair off the logo-sampled brand pair (#0B1222 / #FF6700). Both
 *    artboards agree on them, so they are implemented as designed; flip these
 *    two lines to snap the page back to the logo values.
 *  - `--lime-tint` is a third colour the design introduces, for the Jobs and
 *    Resources tiles and the event chip. It is deliberately the only place a
 *    third hue appears.
 */
const BRAND_VARS = {
  '--ink': '#0B1233',
  '--paper': '#FBFAF7',
  '--accent': '#FF6A00',
  '--accent-tint': 'rgba(255,106,0,0.12)',
  '--accent-chip': 'rgba(255,106,0,0.14)',
  '--lime-tint': 'rgba(214,255,63,0.35)',
  '--card': '#FFFFFF',
  '--line': '#E7E4DC',
  '--muted': '#5B5847',
  '--eyebrow': '#B8551E',
  '--skeleton': '#D8D5CC',
  '--ink-30': 'rgba(11,18,51,.3)',
  '--ink-60': 'rgba(11,18,51,.6)',
  '--ink-75': 'rgba(11,18,51,.75)',
  '--paper-30': 'rgba(251,250,247,.3)',
  '--paper-55': 'rgba(251,250,247,.55)',
  '--paper-65': 'rgba(251,250,247,.65)',
  '--paper-72': 'rgba(251,250,247,.72)',
  '--paper-75': 'rgba(251,250,247,.75)',
} as React.CSSProperties

/**
 * Verified stats. Update here first; every section reads from this block.
 *
 * The member and community figures are the current verified numbers and the two
 * the artboards publish. The opportunity and upskilling figures come from the
 * copy library and have no equivalent tile in the artboards, so they extend the
 * designed row from three cells rather than being dropped.
 */
const STATS = [
  { figure: '10,000+', label: 'Active members using UP right now' },
  { figure: '22,000+', label: 'Young people across the wider UP community' },
  { figure: '7,500+', label: 'Opportunities shared to date' },
  { figure: '700+', label: 'Young Africans upskilled in digital skills' },
] as const

/**
 * Every organization UP works with, in one list: the five from §1.5 and the
 * delivery partner the artboards name, merged so the page makes one claim
 * instead of two.
 *
 * Each logo was taken from the organization's own site rather than a logo
 * aggregator, so the marks stay the ones their owners actually publish:
 *   nileuniversity.edu.ng, wemabank.com, lagosstate.gov.ng, wtcabuja.com,
 *   zedcrest.com.
 * The tiles are white because four of the five marks are drawn for a light
 * background. Zedcrest publish a white-on-dark wordmark only, so the local copy
 * carries the same paths re-filled with the ink colour for the light tile.
 *
 * MicroTech Africa has no logo file in `public/partners`, so it falls back to
 * the monogram tile the artboards already draw for it. Drop a mark in beside the
 * others and set `logo` to light it up.
 *
 * `blurb` says what the organization is and what the relationship is. It stays
 * at sector level on purpose: §1.4 supports "already building with us" and the
 * Nile University and MicroTech specifics, and nothing further is claimed.
 */
const PARTNERS = [
  {
    name: 'Nile University',
    sector: 'Higher education',
    logo: '/partners/nile-university.svg',
    monogram: null,
    href: 'https://nileuniversity.edu.ng',
    blurb:
      'Already trusts UP with their students, using it as the opportunity engine behind their career support.',
  },
  {
    name: 'MicroTech Africa',
    sector: 'Skills and training',
    logo: null,
    monogram: 'MT',
    href: null,
    blurb:
      'Brings its scholarship bootcamps straight to the UP community, so training arrives where the members already are.',
  },
  {
    name: 'Wema Bank',
    sector: 'Finance',
    logo: '/partners/wema-bank.svg',
    monogram: null,
    href: 'https://www.wemabank.com',
    blurb:
      'One of Nigeria’s long-established commercial banks, building with UP to reach young talent early.',
  },
  {
    name: 'Lagos State Ministry of Science and Technology',
    sector: 'Government',
    logo: '/partners/lagos-state.png',
    monogram: null,
    href: 'https://lagosstate.gov.ng',
    blurb:
      'The state body behind Lagos’ technology and innovation programs, putting public opportunity in front of the people it was written for.',
  },
  {
    name: 'World Trade Center Abuja',
    sector: 'Trade and business',
    logo: '/partners/world-trade-center.png',
    monogram: null,
    href: 'https://www.wtcabuja.com',
    blurb:
      'Abuja’s trade and business hub, connecting its programs to the young Africans moving toward them.',
  },
  {
    name: 'Zedcrest',
    sector: 'Financial services',
    logo: '/partners/zedcrest.svg',
    monogram: null,
    href: 'https://zedcrest.com',
    blurb:
      'A financial services group backing the next generation of African talent through the platform they already use.',
  },
] as const

/* ────────────────────────────── §1 Website copy ───────────────────────────── */

const NAV_LINKS = [
  { label: 'Opportunities', href: '/opportunities' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'Events', href: '/events' },
  { label: 'Resources', href: '/resources' },
] as const

/** §1.2 Why UP Exists. `emphasis` lifts a line to full ink, as the copy intends. */
const MANIFESTO = [
  { text: 'Talent is everywhere. Access isn’t.', emphasis: false },
  {
    text: "Africa is home to one of the world's youngest and fastest-growing populations. As the global workforce evolves, African talent will play an increasingly important role in shaping the future of work.",
    emphasis: false,
  },
  { text: 'But potential alone isn’t enough.', emphasis: false },
  {
    text: 'Young Africans need access to opportunity, a map for where to go, and the support to get there.',
    emphasis: false,
  },
  { text: 'That’s why UP exists.', emphasis: true },
  {
    text: "We bring together the opportunities, events, jobs, resources and guidance that help young Africans discover what's possible, navigate what's next, and prepare for the world they're stepping into.",
    emphasis: true,
  },
  {
    text: 'From scholarships and grants to internships and jobs. From conferences and webinars to courses, guides and practical resources.',
    emphasis: true,
  },
  {
    text: 'UP is building the access layer for the next generation of African talent.',
    emphasis: true,
  },
  {
    text: "Because access changes what's possible. A map gives you direction. Support helps you keep moving.",
    emphasis: false,
  },
  { text: 'And when you have all three, the only way is UP.', emphasis: true },
] as const

/**
 * §1.3 The five core feature pillars, with the copy library's headers and CTAs.
 *
 * The artboards show four cards with placeholder one-liners; the library has
 * five pillars with real headers, so Playlists is kept and the stat tile counts
 * five. `tint` picks the icon tile's fill: the artboards alternate accent and
 * lime down the grid rather than assigning a colour per pillar, so the order of
 * this array is load-bearing.
 */
const PILLARS = [
  {
    name: 'Opportunities',
    icon: 'star',
    tint: 'accent',
    header: "Claim What's Already Yours",
    description:
      'Scholarships, grants, and fellowships, sourced continuously and matched to your profile, so access reaches you before the deadline does.',
    cta: 'Get Access to Opportunities',
    href: '/opportunities',
  },
  {
    name: 'Jobs',
    icon: 'briefcase',
    tint: 'lime',
    header: 'Your Next Role Starts Here',
    description:
      'Real roles for real ambition, from your first internship to the move that changes everything. Built for young African talent that is ready now.',
    cta: 'Find Your Role',
    href: '/jobs',
  },
  {
    name: 'Events',
    icon: 'calendar',
    tint: 'accent',
    header: 'Be In The Room',
    description:
      'The conferences, workshops, and gatherings where the next generation of African leaders actually shows up. Know before everyone else does.',
    cta: "See What's Next",
    href: '/events',
  },
  {
    name: 'Resources',
    icon: 'book',
    tint: 'lime',
    header: 'Sharpen Before You Show Up',
    description:
      'Courses, tools, and guides built for people moving with intent. No filler, just what actually levels you up.',
    cta: 'Unlock Resources',
    href: '/resources',
  },
] as const

/**
 * Playlists takes the feature slot the artboards give to Word of the Week.
 *
 * It is the one pillar that is not a feed, so a card in the grid undersold it:
 * it gets the full ink section instead. Every claim below is a capability that
 * already ships, checked against `contexts/playlist-context.tsx` and
 * `app/playlists/page.tsx` rather than written as aspiration:
 *   - items carry `contentType` of opportunity | job | event | resource | gift,
 *   - `isPublic` publishes a list, `collaborators` opens it to other accounts,
 *   - the Discover tab browses public lists and `isSaved` / `saveCount` let you
 *     keep someone else's,
 *   - a reserved "Saved" playlist is what the bookmark on every card writes to.
 */
const PLAYLIST_FEATURES = [
  {
    title: 'One list, every kind of move',
    body: 'Scholarships, jobs, events and resources sit side by side in the same playlist, so your next three moves are on one screen instead of five open tabs.',
  },
  {
    title: 'Build it with your people',
    body: 'Invite collaborators and plan the season together. A shared playlist shows up for everyone on it, so the group is working from one shortlist.',
  },
  {
    title: 'Start from someone else’s shortlist',
    body: 'Publish a playlist for the community, or browse what others have built and save the ones worth keeping. You never have to start from a blank page.',
  },
] as const

/** The sample playlist rendered in the feature section, in the artboards' card. */
const PLAYLIST_DEMO = {
  label: 'Playlist · 12 saved',
  name: 'Scholarship Season',
  meta: '3 collaborators · 4 deadlines this month',
  items: [
    { title: 'Fully funded Masters, UK 2026', kind: 'Opportunity' },
    { title: 'Frontend Intern, Remote', kind: 'Job' },
    { title: 'Design Week Lagos', kind: 'Event' },
  ],
} as const

/** §1.4 The three ways an organization can work with UP. */
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

/**
 * The direct answer engines quote when asked what UP is. The artboards have no
 * FAQ section, but dropping this block with the old layout would silently cost
 * the page its answer-engine surface, so it is kept and restyled. The FAQPage
 * JSON-LD is emitted separately by `app/page.tsx`.
 */
const WHAT_IS_UP =
  'UP is a platform that helps young Africans aged 18 to 35 and older discover and access scholarships, jobs, internships, grants, events, and free learning resources in one place. Operated by Outside Solutions Ltd., UP has shared over 7,500 opportunities and serves more than 10,000 active members, matching each opportunity to the individual based on their skills, interests, and goals.'

/** §1.7 footer navigation, mapped into the artboards' three columns. */
const FOOTER_COLUMNS: ReadonlyArray<{
  label: string
  links: ReadonlyArray<{ label: string; href: string }>
}> = [
  {
    label: 'Platform',
    links: [
      { label: 'For You', href: '/signup' },
      { label: 'Opportunities', href: '/opportunities' },
      { label: 'Jobs', href: '/jobs' },
      { label: 'Events', href: '/events' },
      { label: 'Resources', href: '/resources' },
      { label: 'Playlists', href: '/playlists' },
    ],
  },
  {
    label: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Strategic Partnerships', href: '/work-with-us' },
      { label: 'Partners', href: '#partners' },
      { label: 'Contact', href: '/contact' },
    ],
  },
]

/* ──────────────────────────────── primitives ──────────────────────────────── */

/** The 12/13px uppercase kicker that opens every section. */
function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'text-[12px] font-bold uppercase tracking-[0.06em] lg:text-[13px]',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** The section headline, at the artboards' two sizes. */
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
        'font-up-display m-0 text-[24px] font-bold leading-[1.3] lg:text-[30px]',
        className,
      )}
    >
      {children}
    </h2>
  )
}

/** The white cards: same border, radius and padding everywhere they appear. */
function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-6 lg:rounded-[20px] lg:p-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

type GlyphName = 'star' | 'briefcase' | 'calendar' | 'book' | 'playlist'

/** Shared stroke settings for the glyphs. */
const GLYPH_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: '#0B1233',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'h-6 w-6 lg:h-[26px] lg:w-[26px]',
  'aria-hidden': true,
} as const

function PillarGlyph({ icon }: { icon: GlyphName }) {
  if (icon === 'star') {
    return (
      <svg {...GLYPH_PROPS}>
        <path d="M12 3l1.8 5.4L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.6L12 3z" />
      </svg>
    )
  }
  if (icon === 'briefcase') {
    return (
      <svg {...GLYPH_PROPS}>
        <rect x="3" y="7" width="18" height="12" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 12h18" />
      </svg>
    )
  }
  if (icon === 'calendar') {
    return (
      <svg {...GLYPH_PROPS}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    )
  }
  if (icon === 'playlist') {
    // Drawn to match the artboards' stroke language; the design has no such glyph.
    return (
      <svg {...GLYPH_PROPS}>
        <path d="M4 7h11M4 12h11M4 17h6" />
        <path d="M17 13.5v6l5-3-5-3z" />
      </svg>
    )
  }
  if (icon === 'book') {
    return (
      <svg {...GLYPH_PROPS}>
        <path d="M4 5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 1-2-2V5z" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </svg>
    )
  }
  return (
    <svg {...GLYPH_PROPS}>
      <path d="M4 5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 1-2-2V5z" />
      <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
    </svg>
  )
}

/** One of the tilted cards in the hero. */
function FloatCard({
  className,
  chip,
  chipStyle,
  children,
}: {
  className?: string
  chip: string
  chipStyle: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'absolute rounded-[18px] bg-[var(--paper)] p-[18px] shadow-[0_24px_48px_rgba(0,0,0,0.35)] lg:rounded-[20px] lg:p-[22px] lg:shadow-[0_30px_60px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <span
        className="mb-3 inline-block rounded-full px-[9px] py-1 text-[11px] font-bold text-[var(--ink)] lg:mb-3.5 lg:px-2.5 lg:py-[5px] lg:text-[12px]"
        style={chipStyle}
      >
        {chip}
      </span>
      {children}
    </div>
  )
}

/** A skeleton line inside a float card. `tone` picks ink or the warm grey. */
function Bar({
  width,
  tone = 'grey',
  className,
}: {
  width: string
  tone?: 'ink' | 'grey'
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[4px]',
        tone === 'ink'
          ? 'h-3 bg-[var(--ink)] lg:h-3.5'
          : 'h-[9px] bg-[var(--skeleton)] lg:h-2.5',
        className,
      )}
      style={{ width }}
    />
  )
}

/* ───────────────────────────────── the page ───────────────────────────────── */

export default function LandingPage() {
  const { setHideNavbar, setHideFooter } = usePage()
  const [menuOpen, setMenuOpen] = useState(false)

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

  // The artboards specify a hamburger but no panel behind it, so the drawer is
  // built from the design's own vocabulary: ink surface, Unbounded links, the
  // accent pill the desktop nav carries. Escape closes it, and the page behind
  // it does not scroll while it is open.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <div
      style={BRAND_VARS}
      className="font-up-body min-h-screen bg-[var(--paper)] text-[var(--ink)]"
    >
      {/* ── Nav ── */}
      <header className="w-full bg-[var(--ink)] text-[var(--paper)]">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-6 py-5 lg:px-10 lg:py-[26px]">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-up-display text-[22px] font-extrabold text-[var(--paper)] lg:text-[26px]">
              UP
            </span>
            <span className="h-[7px] w-[7px] rounded-full bg-[var(--accent)] lg:h-2 lg:w-2" />
          </Link>

          <nav className="hidden items-center gap-9 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[15px] font-medium text-[var(--paper-75)] transition-colors hover:text-[var(--paper)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-[18px] lg:gap-5">
            <Link
              href="/login"
              className="text-[14px] font-medium text-[var(--paper)] transition-opacity hover:opacity-85 lg:text-[15px]"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="hidden rounded-full bg-[var(--accent)] px-[22px] py-3 text-[15px] font-bold text-[var(--ink)] transition-opacity hover:opacity-90 lg:inline-flex"
            >
              Get started
            </Link>
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/[0.08] transition-colors hover:bg-white/[0.14] lg:hidden"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FBFAF7"
                strokeWidth={1.8}
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer: not in the artboards, see the effect above ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--ink)] text-[var(--paper)] lg:hidden">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-2">
              <span className="font-up-display text-[22px] font-extrabold text-[var(--paper)]">
                UP
              </span>
              <span className="h-[7px] w-[7px] rounded-full bg-[var(--accent)]" />
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/[0.08]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FBFAF7"
                strokeWidth={1.8}
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-1 flex-col overflow-y-auto px-6 pt-4">
            {[
              ...NAV_LINKS,
              { label: 'Playlists', href: '/playlists' },
              { label: 'Work With Us', href: '/work-with-us' },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="font-up-display border-b border-white/10 py-4 text-[20px] font-bold text-[var(--paper)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="px-6 pb-10 pt-6">
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className="block w-full rounded-full bg-[var(--accent)] py-4 text-center text-[16px] font-bold text-[var(--ink)]"
            >
              Get Access
            </Link>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="relative w-full bg-[var(--ink)] text-[var(--paper)]">
        <div className="relative z-[1] mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-6 px-6 pb-16 pt-10 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:pb-[120px] lg:pt-[88px]">
          <div className="flex flex-col gap-[22px] lg:gap-7">
            <div className="flex w-fit items-center gap-2 rounded-full border border-white/[0.16] bg-white/[0.08] px-[14px] py-[7px] lg:px-4 lg:py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--paper)] lg:text-[13px]">
                Your growth hub
              </span>
            </div>

            {/* The standing hero copy. The artboards' longer headline is a
                design placeholder; this is the brand line and it stays. */}
            <h1 className="font-up-display m-0 text-[40px] font-bold leading-[1.1] text-[var(--paper)] [text-wrap:pretty] lg:text-[64px] lg:leading-[1.05]">
              Get access. Get UP.
            </h1>

            <p className="m-0 text-[16px] leading-[1.6] text-[var(--paper-72)] lg:max-w-[480px] lg:text-[18px]">
              Real opportunities, resources and support for young Africans preparing to lead the
              future of global work.
            </p>

            <div className="flex flex-col items-start gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-5">
              <Link
                href="/signup"
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-[var(--accent)] px-[26px] py-[15px] text-[16px] font-bold text-[var(--ink)] transition-opacity hover:opacity-90 lg:w-auto lg:px-7 lg:py-4"
              >
                Get Access <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="#pillars"
                className="border-b border-[var(--paper-30)] py-1 text-[15px] font-semibold text-[var(--paper)] transition-opacity hover:opacity-85 lg:px-1 lg:py-4 lg:text-[16px]"
              >
                See what&rsquo;s inside
              </Link>
            </div>

            <p className="m-0 text-[13px] text-[var(--accent)] lg:mt-2 lg:text-[14px]">
              Trusted by 10,000+ active members across the UP community.
            </p>
          </div>

          {/* The tilted card cluster. The third card is desktop-only. */}
          <div className="relative mt-3 h-[240px] lg:mt-0 lg:h-[420px]">
            <FloatCard
              className="left-1 top-0 w-[220px] rotate-[-5deg] lg:left-10 lg:top-4 lg:w-[300px] lg:rotate-[-6deg]"
              chip="SCHOLARSHIP"
              chipStyle={{ background: 'var(--accent-chip)' }}
            >
              <Bar width="85%" tone="ink" className="mb-2 lg:mb-2.5" />
              <Bar width="60%" className="lg:mb-[18px]" />
              <Bar width="40%" className="hidden lg:block" />
            </FloatCard>

            <FloatCard
              className="right-1 top-[70px] w-[200px] rotate-[4deg] lg:right-[10px] lg:top-[140px] lg:w-[280px] lg:rotate-[5deg]"
              chip="EVENT · LAGOS"
              chipStyle={{ background: 'var(--lime-tint)' }}
            >
              <Bar width="75%" tone="ink" className="mb-2 lg:mb-2.5" />
              <Bar width="50%" />
            </FloatCard>

            <FloatCard
              className="bottom-0 left-[90px] hidden w-[260px] rotate-[-3deg] lg:block"
              chip="JOB · REMOTE"
              chipStyle={{
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid #0B1233',
              }}
            >
              <Bar width="70%" tone="ink" />
            </FloatCard>
          </div>
        </div>

        {/* Two distinct curves, not one path scaled: the mobile wave rises on
            the right where the desktop wave returns to centre. */}
        <svg
          viewBox="0 0 390 60"
          preserveAspectRatio="none"
          className="block h-[60px] w-full lg:hidden"
          aria-hidden
        >
          <path
            d="M0,30 C97,60 195,0 292,30 C340,45 365,10 390,20 L390,60 L0,60 Z"
            fill="#FBFAF7"
          />
        </svg>
        <svg
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="hidden h-[90px] w-full lg:block"
          aria-hidden
        >
          <path
            d="M0,45 C240,95 480,0 720,45 C960,90 1200,10 1440,45 L1440,90 L0,90 Z"
            fill="#FBFAF7"
          />
        </svg>
      </section>

      {/* ── Stats, pulled up over the seam ── */}
      <section className="-mt-1.5 px-6 pb-14 lg:-mt-2.5 lg:px-10 lg:pb-[100px]">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STATS.map((stat) => (
            <Card key={stat.figure}>
              <div className="font-up-display text-[30px] font-bold text-[var(--ink)] lg:text-[38px]">
                {stat.figure}
              </div>
              <div className="mt-1.5 text-[14px] text-[var(--muted)] lg:mt-2 lg:text-[15px]">
                {stat.label}
              </div>
            </Card>
          ))}
          <div className="flex flex-col justify-center rounded-[18px] bg-[var(--ink)] p-6 text-[var(--paper)] sm:col-span-2 lg:col-span-4 lg:flex-row lg:items-center lg:gap-4 lg:rounded-[20px] lg:p-8">
            <div className="font-up-display whitespace-nowrap text-[16px] font-bold text-[var(--paper)] lg:text-[17px]">
              4 ways to grow
            </div>
            <div className="mt-1.5 text-[13px] text-[var(--accent)] lg:mt-0 lg:text-[14px]">
              Opportunities · Jobs · Events · Resources, all in one hub, and Playlists to keep
              them moving.
            </div>
          </div>
        </div>
      </section>

      {/* ── §1.2 Why UP Exists ── */}
      <section className="px-6 pb-14 lg:px-10 lg:pb-[100px]">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div>
            <Eyebrow className="text-[var(--eyebrow)]">Why UP exists</Eyebrow>
            <SectionHeading className="mt-2.5 lg:mt-3 lg:text-[34px] lg:leading-[1.2]">
              Talent is everywhere. Access isn&rsquo;t.
            </SectionHeading>
          </div>

          <div className="flex flex-col gap-4 lg:gap-5">
            {MANIFESTO.map((line) => (
              <p
                key={line.text}
                className={cn(
                  'm-0 text-[15px] leading-[1.6] lg:text-[16px]',
                  line.emphasis
                    ? 'font-semibold text-[var(--ink)]'
                    : 'text-[var(--muted)]',
                )}
              >
                {line.text}
              </p>
            ))}
            <p className="font-up-display m-0 mt-1 text-[20px] font-bold text-[var(--ink)] lg:text-[24px]">
              Get access. Get UP.
            </p>
          </div>
        </div>
      </section>

      {/* ── §1.3 Pillars ── */}
      <section id="pillars" className="px-6 pb-[72px] lg:px-10 lg:pb-[120px]">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8 lg:mb-14 lg:max-w-[640px]">
            <Eyebrow className="text-[var(--eyebrow)]">What&rsquo;s inside</Eyebrow>
            <SectionHeading className="mt-2.5 lg:mt-3 lg:text-[34px] lg:leading-[1.2]">
              Everything you need to move forward, in one place.
            </SectionHeading>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
            {PILLARS.map((pillar) => (
              <Card key={pillar.name} className="flex flex-col gap-3.5 lg:gap-4">
                <div
                  className="flex h-[46px] w-[46px] items-center justify-center rounded-[12px] lg:h-[52px] lg:w-[52px] lg:rounded-[14px]"
                  style={{
                    background:
                      pillar.tint === 'lime' ? 'var(--lime-tint)' : 'var(--accent-tint)',
                  }}
                >
                  <PillarGlyph icon={pillar.icon} />
                </div>
                <div>
                  <p className="m-0 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--eyebrow)]">
                    {pillar.name}
                  </p>
                  <h3 className="font-up-display m-0 mt-2 text-[18px] font-bold leading-[1.25] lg:text-[19px]">
                    {pillar.header}
                  </h3>
                  <p className="m-0 mt-2 text-[14px] leading-[1.55] text-[var(--muted)] lg:text-[15px]">
                    {pillar.description}
                  </p>
                </div>
                <Link
                  href={pillar.href}
                  className="mt-auto text-[14px] font-bold text-[var(--eyebrow)] transition-opacity hover:opacity-85"
                >
                  {pillar.cta} →
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Playlists: the feature slot the artboards give to Word of the Week ── */}
      <section id="playlists" className="w-full bg-[var(--ink)] text-[var(--paper)]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 lg:px-10 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
            <div className="flex flex-col gap-3.5 lg:gap-[18px]">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] lg:h-[42px] lg:w-[42px] lg:rounded-[12px]"
                  style={{ background: 'var(--accent)' }}
                >
                  <PillarGlyph icon="playlist" />
                </span>
                <Eyebrow className="text-[var(--accent)]">Playlists</Eyebrow>
              </div>

              <SectionHeading className="text-[var(--paper)] lg:text-[34px] lg:leading-[1.2]">
                Your Momentum, Organized
              </SectionHeading>

              <p className="m-0 text-[15px] leading-[1.6] text-[var(--paper-65)] lg:max-w-[520px] lg:text-[16px]">
                Build your own path. Save what matters, track what comes next, and keep moving
                without losing your place. A playlist is your collection of what actually
                matters: scholarships, jobs, events and resources saved together, ordered the
                way you plan to move on them. One tap on any card drops it straight in.
              </p>
              <p className="m-0 text-[15px] leading-[1.6] text-[var(--paper-65)] lg:max-w-[520px] lg:text-[16px]">
                Keep it private while you are figuring it out, open it to the people you are
                moving with, or publish it for the whole community to build on.
              </p>

              <Link
                href="/playlists"
                className="mt-1 inline-flex w-fit items-center gap-2.5 rounded-full bg-[var(--accent)] px-[26px] py-[15px] text-[16px] font-bold text-[var(--ink)] transition-opacity hover:opacity-90 lg:px-7 lg:py-4"
              >
                Build Your Playlist <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* A playlist as it actually looks, in the artboards' card shell. */}
            <div className="flex flex-col gap-3 lg:gap-3.5">
              <div className="rounded-[18px] bg-[var(--accent)] p-6 lg:rounded-[20px] lg:p-7">
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink)] opacity-70 lg:text-[12px]">
                  {PLAYLIST_DEMO.label}
                </div>
                <div className="font-up-display mt-2 text-[28px] font-extrabold leading-[1.15] text-[var(--ink)] lg:text-[30px]">
                  {PLAYLIST_DEMO.name}
                </div>
                <div className="mt-1.5 text-[14px] text-[var(--ink)] lg:text-[15px]">
                  {PLAYLIST_DEMO.meta}
                </div>
              </div>

              {PLAYLIST_DEMO.items.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between gap-3 rounded-[14px] border border-white/[0.12] bg-white/[0.06] px-[18px] py-4 lg:rounded-[16px] lg:px-[22px] lg:py-[18px]"
                >
                  <span className="text-[14px] font-semibold text-[var(--paper)] lg:text-[15px]">
                    {item.title}
                  </span>
                  <span className="whitespace-nowrap text-[12px] text-[var(--accent)] lg:text-[13px]">
                    {item.kind}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 lg:mt-14 lg:gap-6">
            {PLAYLIST_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[18px] border border-white/[0.12] bg-white/[0.06] p-6 lg:rounded-[20px] lg:p-7"
              >
                <h3 className="font-up-display m-0 text-[17px] font-bold leading-[1.25] text-[var(--paper)] lg:text-[18px]">
                  {feature.title}
                </h3>
                <p className="m-0 mt-3 text-[14px] leading-[1.6] text-[var(--paper-65)] lg:text-[15px]">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §1.5 Trusted by: every partner in one grid, logo and all ── */}
      <section id="partners" className="px-6 py-14 lg:px-10 lg:py-[100px]">
        <div className="mx-auto max-w-[1200px]">
          <div className="lg:max-w-[720px]">
            <Eyebrow className="text-[var(--eyebrow)]">Partnerships</Eyebrow>
            <SectionHeading className="mt-2.5 lg:mt-3">
              Trusted By Organizations Building Africa&rsquo;s Next Generation
            </SectionHeading>
            <p className="m-0 mt-4 text-[15px] leading-[1.6] text-[var(--muted)] lg:text-[16px]">
              From higher education to finance to trade to government, UP is already the access
              layer institutions turn to.
            </p>
          </div>

          <ul className="mt-8 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-6">
            {PARTNERS.map((partner) => {
              const mark = (
                <span className="flex h-[52px] w-full items-center justify-start">
                  {partner.logo ? (
                    <img
                      src={partner.logo}
                      alt={`${partner.name} logo`}
                      loading="lazy"
                      className="max-h-[52px] max-w-[160px] object-contain object-left"
                    />
                  ) : (
                    <span className="flex h-[46px] w-[46px] items-center justify-center rounded-[12px] bg-[var(--ink)] lg:h-[52px] lg:w-[52px] lg:rounded-[14px]">
                      <span className="font-up-display text-[14px] font-extrabold text-[var(--paper)] lg:text-[16px]">
                        {partner.monogram}
                      </span>
                    </span>
                  )}
                </span>
              )

              const body = (
                <>
                  {mark}
                  <div>
                    <p className="m-0 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--eyebrow)]">
                      {partner.sector}
                    </p>
                    <h3 className="font-up-display m-0 mt-2 text-[17px] font-bold leading-[1.25] lg:text-[18px]">
                      {partner.name}
                    </h3>
                    <p className="m-0 mt-2 text-[14px] leading-[1.55] text-[var(--muted)] lg:text-[15px]">
                      {partner.blurb}
                    </p>
                  </div>
                </>
              )

              return (
                <li key={partner.name} className="h-full">
                  {partner.href ? (
                    <a
                      href={partner.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-full flex-col gap-5 rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-6 transition-transform hover:-translate-y-0.5 lg:rounded-[20px] lg:p-7"
                    >
                      {body}
                    </a>
                  ) : (
                    <div className="flex h-full flex-col gap-5 rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-6 lg:rounded-[20px] lg:p-7">
                      {body}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <p className="m-0 mt-8 max-w-[760px] text-[15px] leading-[1.6] text-[var(--muted)] lg:text-[16px]">
            We&rsquo;ve partnered with leading universities, financial institutions, trade
            centers, and government bodies to put real opportunity directly in front of the young
            Africans actively pursuing it, and we&rsquo;re building referral partnerships with
            more community organizations to widen that reach.
          </p>
        </div>
      </section>

      {/*
        §1.6 Social Proof & Testimonials is intentionally not rendered. The copy
        library specifies "insert real, consented submissions only" and there are
        no consented quotes in the document or the codebase. Inventing them would
        put fabricated praise in front of users. Drop real submissions in here
        and the section can go live between Partnerships and The Bridge.
      */}

      {/* ── §1.4 The Bridge, and the three sponsor tracks ── */}
      <section className="w-full bg-[var(--ink)] text-[var(--paper)]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 lg:px-10 lg:py-24">
          <div className="lg:max-w-[760px]">
            <Eyebrow className="text-[var(--accent)]">Work with us</Eyebrow>
            <SectionHeading className="mt-2.5 text-[var(--paper)] lg:mt-3">
              The Bridge to Africa&rsquo;s Most Driven Generation
            </SectionHeading>

            <div className="mt-5 flex flex-col gap-4 lg:gap-5">
              <p className="m-0 text-[15px] leading-[1.6] text-[var(--paper-65)] lg:text-[16px]">
                UP isn&rsquo;t a listings board, and we&rsquo;re not JUST a distribution channel.
                We&rsquo;re the ecosystem where Africa&rsquo;s most ambitious 18-to-35+ talent
                shows up daily, with intent: over 10,000 active members and a community of
                22,000+, actively seeking the access that gets them to their next level.
                We&rsquo;ve already shared over 7,500 opportunities and directly upskilled more
                than 700 young Africans in in-demand digital skills, and organizations like Nile
                University, Wema Bank, the Lagos State Ministry of Science and Technology, World
                Trade Center Abuja, and Zedcrest are already building with us.
              </p>
              <p className="m-0 text-[15px] leading-[1.6] text-[var(--paper-65)] lg:text-[16px]">
                We don&rsquo;t just place your opportunity in front of an audience. We integrate
                it into the platform young Africans already trust to move their careers forward,
                with verified engagement data proving exactly who saw it, saved it, and acted on
                it. When you partner with UP, you&rsquo;re not buying a placement. You&rsquo;re
                becoming part of the access that gets someone to where they&rsquo;re going.
              </p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 lg:mt-14 lg:gap-6">
            {PARTNER_TRACKS.map((track) => (
              <div
                key={track.title}
                className="rounded-[18px] border border-white/[0.12] bg-white/[0.06] p-6 lg:rounded-[20px] lg:p-7"
              >
                <h3 className="font-up-display m-0 text-[17px] font-bold text-[var(--paper)] lg:text-[18px]">
                  {track.title}
                </h3>
                <p className="m-0 mt-3 text-[14px] leading-[1.6] text-[var(--paper-65)] lg:text-[15px]">
                  {track.body}
                </p>
              </div>
            ))}
          </div>

          <Link
            href="/work-with-us"
            className="mt-10 inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-7 py-4 text-[16px] font-bold text-[var(--ink)] transition-opacity hover:opacity-90 lg:mt-12 lg:w-auto lg:px-8"
          >
            Become a Strategic Partner
          </Link>
        </div>
      </section>

      {/* ── §7 What is UP + FAQ ── */}
      <section className="px-6 py-14 lg:px-10 lg:py-[100px]">
        <div className="mx-auto max-w-[1200px]">
          <div className="lg:max-w-[640px]">
            <Eyebrow className="text-[var(--eyebrow)]">The short answer</Eyebrow>
            <SectionHeading className="mt-2.5 lg:mt-3">What is UP?</SectionHeading>
          </div>
          <p className="m-0 mt-4 max-w-[760px] text-[15px] leading-[1.6] text-[var(--muted)] lg:text-[16px]">
            {WHAT_IS_UP}
          </p>

          <dl className="mt-10 grid grid-cols-1 gap-x-12 gap-y-7 md:grid-cols-2 lg:mt-14">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <dt className="font-up-display text-[16px] font-bold leading-snug lg:text-[17px]">
                  {faq.q}
                </dt>
                <dd className="mt-2 text-[14px] leading-[1.6] text-[var(--muted)] lg:text-[15px]">
                  {faq.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="w-full bg-[var(--accent)] text-[var(--ink)]">
        <div className="mx-auto flex max-w-[900px] flex-col items-center gap-5 px-6 py-16 text-center lg:gap-6 lg:px-10 lg:py-24">
          <h2 className="font-up-display m-0 text-[32px] font-extrabold leading-[1.1] text-[var(--ink)] lg:text-[48px]">
            Get Access. Get UP.
          </h2>
          <p className="m-0 text-[15px] text-[var(--ink-75)] lg:max-w-[520px] lg:text-[17px]">
            Join 10,000+ ambitious young people already finding opportunities, jobs, events and
            resources on UP. Real opportunities, matched to you; with the resources, community
            and support to help you move forward.
          </p>
          <div className="flex w-full flex-col items-center gap-3 lg:w-auto lg:flex-row lg:gap-4">
            <Link
              href="/signup"
              className="w-full rounded-full bg-[var(--ink)] px-7 py-4 text-center text-[16px] font-bold text-[var(--paper)] transition-opacity hover:opacity-90 lg:w-auto lg:px-8 lg:py-[18px]"
            >
              Create your free account
            </Link>
            <Link
              href="/work-with-us"
              className="w-full rounded-full border border-[var(--ink-30)] px-7 py-4 text-center text-[16px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--ink-60)] lg:w-auto lg:px-8 lg:py-[18px]"
            >
              Work With Us
            </Link>
          </div>
        </div>
      </section>

      {/* ── §1.7 Footer ── */}
      <footer className="w-full bg-[var(--ink)] text-[var(--paper)]">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 pb-8 pt-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-10 lg:px-10 lg:pb-10 lg:pt-[72px]">
          <div>
            <span className="font-up-display text-[22px] font-extrabold text-[var(--paper)] lg:text-[24px]">
              UP
            </span>
            <p className="mt-3 text-[14px] leading-[1.6] text-[var(--paper-55)] lg:mt-3.5 lg:max-w-[240px]">
              Your growth hub for opportunities, jobs, events and resources, made for ambitious
              young Africans.
            </p>
            <p className="font-up-display mt-4 text-[16px] font-bold text-[var(--paper)]">
              Get access. Get UP.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.label} className="flex flex-col gap-2.5 lg:gap-3">
              <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--accent)] lg:text-[13px]">
                {column.label}
              </span>
              {column.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-[14px] text-[var(--paper-75)] transition-opacity hover:opacity-85"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}

          <div className="flex flex-col gap-2.5 lg:gap-3">
            <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--accent)] lg:text-[13px]">
              Contact
            </span>
            <a
              href="mailto:glowupdiaries.info@gmail.com"
              className="text-[14px] text-[var(--paper-75)] transition-opacity hover:opacity-85"
            >
              glowupdiaries.info@gmail.com
            </a>
          </div>
        </div>

        <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
          <div className="grid gap-6 border-t border-white/10 pt-8 text-[14px] leading-[1.6] text-[var(--paper-55)] sm:grid-cols-2">
            <p className="m-0">
              We take your data seriously. Read how UP collects, uses, and protects your
              information in our{' '}
              <Link href="/privacy-policy" className="underline hover:text-[var(--paper)]">
                Privacy Policy
              </Link>
              .
            </p>
            <p className="m-0">
              By using UP, you agree to our{' '}
              <Link href="/terms-of-service" className="underline hover:text-[var(--paper)]">
                Terms of Service
              </Link>
              , the ground rules that keep this platform safe, fair, and built for the community
              it serves.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[1200px] px-6 py-6 text-[12px] text-[var(--accent)] lg:px-10 lg:text-[13px]">
          UP is a product of Outside Solutions Ltd. © 2026 Outside Solutions Ltd. All rights
          reserved.
        </div>
      </footer>
    </div>
  )
}
