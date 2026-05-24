"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageShell } from "@/components/layout/page-shell"
import { FlaticonIcon } from "@/components/ui/flaticon-icon"
import {
  RiStarLine,
  RiFocus3Line,
  RiBriefcaseLine,
  RiCalendarLine,
  RiBookLine,
  RiGroupLine,
  RiGlobalLine,
  RiArrowUpLine,
  RiCheckboxCircleLine,
  RiArrowRightLine as RiRightArrowAlt,
} from "react-icons/ri"
import { cn } from "@/lib/utils"

const landingStats = [
  { value: "10K+", label: "Youth Empowered", icon: RiGroupLine },
  { value: "500+", label: "Opportunities Posted", icon: RiFocus3Line },
  { value: "10+", label: "Partners", icon: RiGlobalLine },
  { value: "1K+", label: "Growth Stories", icon: RiArrowUpLine },
]

const landingPillars = [
  {
    title: "Access over excuses",
    description: "We remove barriers so talent can meet opportunity without friction.",
  },
  {
    title: "Community first",
    description: "Grow with mentors, peers, and providers who care about the same things.",
  },
  {
    title: "Real impact",
    description: "Every listing, event, and resource is built to move you forward.",
  },
]

const landingTracks = [
  {
    title: "Opportunities",
    description: "Jobs, internships, freelance gigs, and scholarships.",
    icon: RiFocus3Line,
    accent: "from-primary/18 to-primary/8",
    border: "border-primary/30",
    text: "text-primary",
  },
  {
    title: "Jobs",
    description: "Curated roles from trusted companies and founders.",
    icon: RiBriefcaseLine,
    accent: "from-primary/18 to-primary/8",
    border: "border-primary/30",
    text: "text-primary",
  },
  {
    title: "Events",
    description: "Networking, workshops, and live learning experiences.",
    icon: RiCalendarLine,
    accent: "from-primary/18 to-primary/8",
    border: "border-primary/30",
    text: "text-primary",
  },
  {
    title: "Resources",
    description: "Courses, templates, and toolkits to build your edge.",
    icon: RiBookLine,
    accent: "from-primary/18 to-primary/8",
    border: "border-primary/30",
    text: "text-primary",
  },
]

const seekerSteps = [
  "Create a standout profile that shows your goals and skills.",
  "Discover opportunities tailored to your growth path.",
  "Apply, connect, and track progress in one place.",
]

const providerSteps = [
  "Verify your business and publish opportunities faster.",
  "Reach a vetted audience ready to take action.",
  "Track performance and build long-term brand trust.",
]

export default function ProductPage() {
  return (
    <PageShell
      fullWidth
      className="relative font-sans bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.12),transparent_60%),radial-gradient(circle_at_bottom,_rgba(251,146,60,0.08),transparent_55%)]"
    >
      {/* Article Header (Blog-like intro) */}
      <article className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-overline font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span>Product Overview</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
          How GlowUp is rewiring access for African talent
        </h1>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-12 pb-12 border-b border-border/50">
          <span>By The GlowUp Team</span>
          <span>•</span>
          <span>Updated 2024</span>
        </div>

        <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6">
          <p className="text-xl text-foreground font-medium">
            Brilliant African talent has always existed. What's been missing is a central nervous system for access. 
            GlowUp stitches opportunities, resources, and deep-focus tools into one place so you can move with intention.
          </p>
          <p>
            Whether you are searching for your first internship, applying to global fellowships, or trying to find remote work, 
            navigating the internet can feel like screaming into the void. GlowUp was designed specifically to fix the "discovery problem".
            We are not just a job board; we are an ecosystem combining productivity tracking with curated opportunities.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-12 mb-6">Designed as a Practice, Not a One-Off Win</h2>
          <p>
            The old way of applying for things was haphazard. With GlowUp's new <strong>Sessions</strong> feature (currently in Beta), 
            you don't just browse opportunities — you get to track the time you spend building your career.
          </p>

          <Card className="bg-card/80 backdrop-blur-sm border border-border/70 shadow-xl rounded-2xl my-8">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Feature Spotlight: GlowUp session
                  </p>
                  <p className="text-base text-foreground mt-1 font-medium">
                    Stay locked in on one goal at a time.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-muted/50 border border-border/60 px-6 py-8 flex flex-col items-center gap-3">
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Pomodoro Timer
                </span>
                <div className="text-5xl sm:text-7xl font-mono tabular-nums text-foreground font-bold">
                  25:00
                </div>
              </div>
            </CardContent>
          </Card>

          <h2 className="text-2xl font-bold text-foreground mt-12 mb-6">Built on Three Core Pillars</h2>
          <div className="grid sm:grid-cols-3 gap-6 not-prose my-8">
            {landingPillars.map((pillar) => (
              <Card key={pillar.title} className="bg-card/80 backdrop-blur-sm border border-border/70">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p>
            We enforce strict quality standards. Any provider posting on GlowUp goes through verification processes to ensure 
            opportunities are legitimate and actionable. If you are a provider, this means you reach a highly engaged, vetted talent pool.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-12 mb-6">The Content Engine</h2>
          <p>
            GlowUp breaks down growth into four main tracks. Here is what you'll find when you plug into the feed:
          </p>

          <div className="grid sm:grid-cols-2 gap-4 not-prose my-8">
            {landingTracks.map((track) => {
              const TrackIcon = track.icon
              return (
                <Card key={track.title} className={cn("border bg-gradient-to-br backdrop-blur-sm", track.accent, track.border)}>
                  <CardContent className="p-6">
                    <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center mb-5", track.border)}>
                      <TrackIcon className={cn("w-6 h-6", track.text)} aria-hidden />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{track.title}</h3>
                    <p className="text-sm text-muted-foreground">{track.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <h2 className="text-2xl font-bold text-foreground mt-12 mb-6">How The Platform Works</h2>
          <div className="grid lg:grid-cols-2 gap-6 not-prose my-8">
            <Card className="bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/10 border border-orange-500/25 flex items-center justify-center">
                    <RiGroupLine className="w-5 h-5 text-orange-400" aria-hidden />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">For Opportunity Seekers</h3>
                </div>
                <div className="space-y-4 mb-6">
                  {seekerSteps.map((step) => (
                    <div key={step} className="flex items-start gap-3">
                      <RiCheckboxCircleLine className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" aria-hidden />
                      <p className="text-sm text-muted-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/10 border border-orange-500/25 flex items-center justify-center">
                    <RiFocus3Line className="w-5 h-5 text-orange-400" aria-hidden />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">For Providers</h3>
                </div>
                <div className="space-y-4 mb-6">
                  {providerSteps.map((step) => (
                    <div key={step} className="flex items-start gap-3">
                      <RiCheckboxCircleLine className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" aria-hidden />
                      <p className="text-sm text-muted-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <h2 className="text-2xl font-bold text-foreground mt-12 mb-6">The Community Growth</h2>
          <p>
            When we launched, we focused entirely on one metric: How many young people are actually taking action? Let the numbers speak for themselves.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 not-prose my-8 mb-12">
            {landingStats.map((stat) => {
              const StatIcon = stat.icon
              return (
                <Card key={stat.label} className="bg-card/80 backdrop-blur-sm border border-border/70">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-orange-500/15 to-rose-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
                      <StatIcon className="w-6 h-6 text-orange-400" aria-hidden />
                    </div>
                    <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <hr className="border-border my-12" />

          {/* CTA */}
          <div className="not-prose max-w-3xl mx-auto">
            <Card className="bg-gradient-to-br from-orange-500/15 via-card/80 to-rose-500/10 backdrop-blur-sm border border-orange-500/25 rounded-2xl shadow-xl">
              <CardContent className="p-8 sm:p-12 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-6">
                  Ready to start your glow up?
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full font-semibold px-8 h-12">
                    <Link href="/">Explore the Feed</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-border/70 hover:bg-muted/60 rounded-full h-12 px-8">
                    <Link href="/contact">Talk to Us</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </article>
    </PageShell>
  )
}
