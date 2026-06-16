"use client"

import Script from "next/script"
import { useShowAds } from "@/lib/use-show-ads"

const POPUNDER_SRC = process.env.NEXT_PUBLIC_ADSTERRA_POPUNDER_SRC || ""

/**
 * Adsterra Pop-under: a single global script that opens an ad in a background
 * tab/window on user interaction (Adsterra handles its own frequency capping).
 * Must run in the top window. Loaded once site-wide and hidden entirely for
 * premium subscribers and admins.
 */
export default function PopunderAd() {
  const showAds = useShowAds()
  if (!showAds || !POPUNDER_SRC) return null
  return (
    <Script
      id="adsterra-popunder"
      src={POPUNDER_SRC}
      strategy="afterInteractive"
      data-cfasync="false"
    />
  )
}
