"use client"

/**
 * How each story looks: its ring icon and its slide palette. Shared by the
 * rail, the viewer and the settings list so a story reads the same everywhere.
 *
 * Two-colour brand: navy and orange carry everything, lime only as the Events
 * accent (platform design decisions, Sept 2026).
 */

import {
  Briefcase,
  CalendarDays,
  Clock,
  Cpu,
  GraduationCap,
  HeartPulse,
  Landmark,
  Leaf,
  Megaphone,
  Microscope,
  Palette,
  Rocket,
  Sparkles,
  Sprout,
  Users,
  Wifi,
  BookOpen,
  type LucideIcon,
} from "lucide-react"

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "tech-events": Cpu,
  "tech-opportunities": Cpu,
  "tech-jobs": Cpu,
  "founder-funding": Rocket,
  "founder-events": Rocket,
  "creator-events": Palette,
  "creator-opportunities": Palette,
  "creator-jobs": Palette,
  "hiring-now": Briefcase,
  "remote-jobs": Wifi,
  scholarships: GraduationCap,
  internships: GraduationCap,
  women: Users,
  finance: Landmark,
  marketing: Megaphone,
  health: HeartPulse,
  research: Microscope,
  climate: Leaf,
  impact: Sprout,
  education: BookOpen,
}

export function storyIcon(story: { kind: string; categoryId?: string | null }): LucideIcon {
  if (story.kind === "digest") return Sparkles
  if (story.kind === "expiring") return Clock
  return (story.categoryId && CATEGORY_ICONS[story.categoryId]) || CalendarDays
}

/** The disc inside the ring. */
export function storyDisc(story: { kind: string; categoryId?: string | null }): string {
  if (story.kind === "digest") return "bg-up-navy text-up-orange"
  if (story.kind === "expiring") return "bg-up-orange text-white"
  if (story.categoryId?.endsWith("-events")) return "bg-up-lime text-up-navy"
  return "bg-up-navy text-up-on-navy"
}

/** Slide background and accent. Stories are always dark, light mode or not. */
export function storySlide(story: { kind: string; categoryId?: string | null }) {
  if (story.kind === "expiring") {
    return {
      bg: "bg-[radial-gradient(120%_80%_at_100%_0%,#FF8A3D_0%,#FF6A00_45%,#B8551E_100%)]",
      accent: "text-up-navy",
      pill: "bg-up-navy text-white",
    }
  }
  if (story.categoryId?.endsWith("-events")) {
    return {
      bg: "bg-[radial-gradient(120%_80%_at_100%_0%,#24306B_0%,#0B1233_60%)]",
      accent: "text-up-lime",
      pill: "bg-up-lime text-up-navy",
    }
  }
  return {
    bg: "bg-[radial-gradient(120%_80%_at_100%_0%,#24306B_0%,#0B1233_60%)]",
    accent: "text-up-orange",
    pill: "bg-up-orange text-white",
  }
}
