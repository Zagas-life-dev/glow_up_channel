"use client"

import Script from "next/script"
import { useEffect, useState } from "react"
import { useShowAds } from "@/lib/use-show-ads"

/**
 * One or more Adsterra Social Bar script sources. Add extra units by listing
 * their URLs comma- (or whitespace-) separated in the env var. Each URL is a
 * separate Social Bar unit / notification.
 */
const SOCIAL_BAR_SRCS = (process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR_SRC || "")
  .split(/[\s,]+/)
  .map((s) => s.trim())
  .filter(Boolean)

/** How many Social Bar units to load per device. */
const DESKTOP_MAX = 3
const MOBILE_MAX = 1

/**
 * Adsterra Social Bar(s): each is a single global script that injects its own
 * floating overlay widget. Loaded once site-wide and hidden entirely for
 * premium subscribers and admins. Up to 3 run on desktop, 1 on mobile.
 */
export default function SocialBarAd() {
  const showAds = useShowAds()
  const [isDesktop, setIsDesktop] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setIsDesktop(mq.matches)
    setMounted(true)
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  if (!mounted || !showAds || SOCIAL_BAR_SRCS.length === 0) return null

  const srcs = SOCIAL_BAR_SRCS.slice(0, isDesktop ? DESKTOP_MAX : MOBILE_MAX)

  return (
    <>
      {srcs.map((src, i) => (
        <Script
          key={src}
          id={`adsterra-social-bar-${i}`}
          src={src}
          strategy="afterInteractive"
          data-cfasync="false"
        />
      ))}
    </>
  )
}
