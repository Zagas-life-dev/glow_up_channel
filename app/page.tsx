"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { PageShell } from "@/components/layout/page-shell"

const landingStats = [
  { value: "10K+", label: "Youth Empowered", icon: RiGroupLine },
  { value: "500+", label: "Opportunities Posted", icon: RiFocus3Line },
  { value: "10+", label: "Partners", icon: RiGlobalLine },
  { value: "1K+", label: "Growth Stories", icon: RiArrowUpLine },
]

const landingPillars = [
  {
    title: "Access Over Excuses",
    description: "We remove barriers so talent can meet opportunity without friction.",
  },
  {
    title: "Community First",
    description: "We build pathways, not pipelines. Grow with mentors and peers.",
  },
  {
    title: "Real Impact",
    description: "Every listing, event, and resource is built to move you forward.",
  },
]

const landingTracks = [
  {
    title: "Opportunities",
    description: "Jobs, internships, freelance gigs, and scholarships.",
    icon: RiFocus3Line,
    accent: "from-orange-500/20 to-orange-600/10",
    border: "border-orange-500/30",
    text: "text-orange-400",
  },
  {
    title: "Jobs",
    description: "Curated roles from trusted companies and founders.",
    icon: RiBriefcaseLine,
    accent: "from-primary/20 to-primary/10",
    border: "border-primary/30",
    text: "text-primary",
  },
  {
    title: "Events",
    description: "Networking, workshops, and live learning experiences.",
    icon: RiCalendarLine,
    accent: "from-emerald-500/20 to-emerald-600/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
  },
  {
    title: "Resources",
    description: "Courses, templates, and toolkits to build your edge.",
    icon: RiBookLine,
    accent: "from-violet-500/20 to-violet-600/10",
    border: "border-violet-500/30",
    text: "text-violet-400",
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

function LandingPage() {
  return (
    <PageShell>
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 sm:pt-24 pb-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.06),_transparent_50%)]" />
        <div className="relative">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border/70 shadow-sm mb-5">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">GlowUp</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight mb-5">
                More than a platform.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">
                  A movement for access.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8">
                Brilliant African talent has always existed. What’s been missing is access.
                GlowUp bridges the gap with opportunities, resources, and deep focus tools
                like Locked In sessions to keep you moving.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full shadow-lg shadow-orange-500/25 font-semibold">
                  <Link href="/signup">
                    Get Started
                    <RiRightArrowAlt className="ml-2 h-5 w-5" aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Hero preview card */}
            <Card className="bg-card/80 backdrop-blur-sm border border-border/70 shadow-2xl rounded-2xl">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                      GlowUp session
                    </p>
                    <p className="text-sm text-foreground mt-1 font-medium">
                      Stay locked in on one goal at a time.
                    </p>
                  </div>
                  <div className="rounded-full px-3 py-1 bg-primary/10 border border-primary/30 text-[11px] text-primary font-medium">
                    In beta
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/50 border border-border/60 px-4 py-5 flex flex-col items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    Example timer
                  </span>
                  <div className="text-4xl sm:text-5xl font-mono tabular-nums text-foreground font-bold">
                    25:00
                  </div>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground text-sm">
                    Design your glow up like a practice, not a one-off win.
                  </p>
                  <p>
                    Use sessions, playlists, and your dashboard to track how often you’re
                    really showing up for your goals.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            {landingPillars.map((pillar) => (
              <Card key={pillar.title} className="bg-card/80 backdrop-blur-sm border border-border/70 hover:border-border hover:shadow-sm transition-all duration-200">
                <CardContent className="p-5">
                  <h3 className="text-base font-semibold text-foreground mb-2">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {landingStats.map((stat) => {
            const StatIcon = stat.icon
            return (
              <Card key={stat.label} className="bg-card/80 backdrop-blur-sm border border-border/70 hover:border-border transition-all duration-200">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/15 to-rose-500/10 border border-orange-500/20 flex items-center justify-center mb-3">
                    <StatIcon className="w-5 h-5 text-orange-400" aria-hidden />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Story */}
      <section className="py-12 sm:py-16">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Our story</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">The Story</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We built GlowUp for the ambitious and overlooked. Talent should never be
              limited by geography, access, or network. Our story is about removing those limits.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If you are ready to build your career, launch a business, or find the right people
              to grow with — this is your home base.
            </p>
          </div>
          <Card className="bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl">
            <CardContent className="p-6 space-y-4">
              {[
                { title: "Discover", text: "Get curated opportunities built for growth." },
                { title: "Connect", text: "Meet the people and providers that matter." },
                { title: "Glow Up", text: "Track progress and build real momentum." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500/20 to-rose-500/10 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                    <RiStarLine className="w-4 h-4 text-orange-400" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Tracks */}
      <section className="py-12 sm:py-16">
        <div className="">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">What You’ll Find</h2>
              <p className="text-muted-foreground mt-2">Everything you need to move forward, in one place.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {landingTracks.map((track) => {
              const TrackIcon = track.icon
              return (
                <Card key={track.title} className={cn("border bg-gradient-to-br backdrop-blur-sm hover:shadow-sm transition-all duration-200", track.accent, track.border)}>
                  <CardContent className="p-5">
                    <div className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center mb-4", track.border)}>
                      <TrackIcon className={cn("w-5 h-5", track.text)} aria-hidden />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1.5">{track.title}</h3>
                    <p className="text-sm text-muted-foreground">{track.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl hover:border-border transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/10 border border-orange-500/25 flex items-center justify-center">
                  <RiGroupLine className="w-5 h-5 text-orange-400" aria-hidden />
                </div>
                <h3 className="text-xl font-bold text-foreground">For Opportunity Seekers</h3>
              </div>
              <div className="space-y-3 mb-6">
                {seekerSteps.map((step) => (
                  <div key={step} className="flex items-start gap-2.5">
                    <RiCheckboxCircleLine className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" aria-hidden />
                    <p className="text-sm text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl hover:border-border transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/10 border border-orange-500/25 flex items-center justify-center">
                  <RiFocus3Line className="w-5 h-5 text-orange-400" aria-hidden />
                </div>
                <h3 className="text-xl font-bold text-foreground">For Providers</h3>
              </div>
              <div className="space-y-3 mb-6">
                {providerSteps.map((step) => (
                  <div key={step} className="flex items-start gap-2.5">
                    <RiCheckboxCircleLine className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" aria-hidden />
                    <p className="text-sm text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <Card className="bg-gradient-to-br from-orange-500/15 via-card/80 to-rose-500/10 backdrop-blur-sm border border-orange-500/25 rounded-2xl shadow-xl">
            <CardContent className="p-8 sm:p-10 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/60 shadow-sm mb-5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Join Now</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
                Ready to start your glow up?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm">
                Join a community built to connect you with the right people, tools, and opportunities.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full shadow-lg shadow-orange-500/25 font-semibold">
                  <Link href="/signup">Join the Community</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border mt-12">
        <Link href="/privacy-policy" className="hover:text-orange-600 underline underline-offset-2">
          Privacy Policy
        </Link>
      </footer>
    </PageShell>
  )
}

export default function Home() {
  return <LandingPage />
}
